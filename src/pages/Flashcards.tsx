import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import {
  addCard,
  awardBadges,
  awardXp,
  createDeck,
  deleteCard,
  deleteDeck,
  fetchCards,
  fetchDecks,
  studyFlashcard,
} from "@/lib/firestore";
import { generateFlashcards } from "@/lib/claude";
import { canUse, incrementUsage, remaining } from "@/lib/usage";
import { SUBJECTS, getSubject, topicsForYear } from "@/data/subjects";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Segmented,
  Spinner,
  cn,
} from "@/components/ui";
import {
  CardsIcon,
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
  WandIcon,
  XIcon,
} from "@/components/icons";
import {
  type Deck,
  type Flashcard,
  type ReviewGrade,
  type SubjectId,
  type YearLevel,
} from "@/types";
import { levelForSubject, stageForSubject } from "@/lib/level";

type StudyMode = "flip" | "write" | "match";

// ---------------------------------------------------------------------------

export default function Flashcards() {
  const { user, profile, configured, refreshProfile } = useAuth();
  const uid = user?.uid ?? "";
  const premium = isPremium(profile);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = async () => {
    if (!configured || !uid) {
      setLoading(false);
      return;
    }
    try {
      setDecks(await fetchDecks(uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, uid]);

  const openDeck = async (deck: Deck) => {
    setActiveDeck(deck);
    setMode(null);
    setCardsLoading(true);
    try {
      setCards(await fetchCards(uid, deck.id));
    } catch (err) {
      console.error(err);
    } finally {
      setCardsLoading(false);
    }
  };

  const onDeckCreated = async (deckId: string) => {
    await reload();
    const deck = (await fetchDecks(uid)).find((d) => d.id === deckId);
    if (deck) await openDeck(deck);
    // badge + xp
    await awardXp(uid, "deckCreated");
    if (profile && !profile.badges?.includes("first-deck")) {
      await awardBadges(uid, ["first-deck"]);
      await refreshProfile();
    }
  };

  if (!configured) {
    return (
      <EmptyState icon={<CardsIcon className="h-7 w-7" />} title="Demo mode">
        Flashcards need an account — configure Firebase to enable saved decks.
      </EmptyState>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-7 w-7 text-brand-400" />
      </div>
    );
  }

  // ---------- Study session ----------
  if (activeDeck && mode) {
    return (
      <StudySession
        deck={activeDeck}
        cards={cards}
        mode={mode}
        uid={uid}
        onExit={() => setMode(null)}
      />
    );
  }

  // ---------- Deck detail ----------
  if (activeDeck) {
    return (
      <DeckDetail
        deck={activeDeck}
        cards={cards}
        loading={cardsLoading}
        uid={uid}
        onBack={() => {
          setActiveDeck(null);
          void reload();
        }}
        onStudy={(m) => setMode(m)}
        onCardsChanged={async () => setCards(await fetchCards(uid, activeDeck.id))}
        onDeleted={() => {
          setActiveDeck(null);
          void reload();
        }}
      />
    );
  }

  // ---------- Deck list ----------
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            Flashcards
          </h1>
          <p className="page-subtitle">
            Make decks yourself or generate them with AI — every card you study
            joins your spaced-repetition queue.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="h-4 w-4" /> New deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <EmptyState
          icon={<CardsIcon className="h-7 w-7" />}
          title="No decks yet"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <WandIcon className="h-4 w-4" /> Create your first deck
            </Button>
          }
        >
          Start with an AI-generated deck on any syllabus topic — it takes about
          15 seconds.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const subject = getSubject(deck.subjectId);
            return (
              <button
                key={deck.id}
                onClick={() => openDeck(deck)}
                className="card group p-6 text-left transition hover:border-white/15"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl text-lg"
                    style={{
                      background: `linear-gradient(135deg, ${subject.gradient[0]}33, ${subject.gradient[1]}33)`,
                    }}
                  >
                    {subject.icon}
                  </span>
                  {deck.aiGenerated && (
                    <Badge tone="brand">
                      <WandIcon className="h-3 w-3" /> AI
                    </Badge>
                  )}
                </div>
                <p className="mt-3 font-semibold text-white group-hover:text-white">
                  {deck.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {subject.short} · {deck.topic} · {deck.cardCount} card
                  {deck.cardCount === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <CreateDeckModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        uid={uid}
        premium={premium}
        subjects={profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id)}
        baseYear={profile?.yearLevel ?? "year12"}
        levels={profile?.subjectLevels ?? {}}
        onCreated={onDeckCreated}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create deck modal (manual or AI)

function CreateDeckModal({
  open,
  onClose,
  uid,
  premium,
  subjects,
  baseYear,
  levels,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  uid: string;
  premium: boolean;
  subjects: SubjectId[];
  baseYear: YearLevel;
  levels: Record<SubjectId, YearLevel>;
  onCreated: (deckId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const [subjectId, setSubjectId] = useState<SubjectId>(subjects[0]);
  // Level for the chosen subject respects per-subject acceleration.
  const levelProfile = { yearLevel: baseYear, subjectLevels: levels };
  const year = levelForSubject(levelProfile, subjectId);
  const stage = stageForSubject(levelProfile, subjectId);
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subject = getSubject(subjectId);
  const aiLeft = remaining(uid, "aiDeck", premium);

  const submit = async () => {
    setError("");
    if (!topic.trim()) {
      setError("Pick or type a topic first.");
      return;
    }
    setBusy(true);
    try {
      let cards: { front: string; back: string }[] = [];
      if (tab === "ai") {
        if (!canUse(uid, "aiDeck", premium)) {
          setError("You've used today's free AI deck. Upgrade for unlimited generation.");
          setBusy(false);
          return;
        }
        const res = await generateFlashcards(
          subject.name,
          topic.trim(),
          count,
          stage,
        );
        cards = res.cards;
        if (!premium) incrementUsage(uid, "aiDeck");
      }
      const deckId = await createDeck(
        uid,
        {
          name: name.trim() || `${subject.short}: ${topic.trim()}`,
          subjectId,
          topic: topic.trim(),
          aiGenerated: tab === "ai",
        },
        cards,
      );
      onClose();
      setTopic("");
      setName("");
      await onCreated(deckId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New deck">
      <div className="space-y-4">
        <Segmented
          options={[
            { value: "ai" as const, label: "✨ Generate with AI" },
            { value: "manual" as const, label: "Build manually" },
          ]}
          value={tab}
          onChange={setTab}
          className="w-full"
        />

        <div>
          <label className="label">Subject</label>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value as SubjectId);
              setTopic("");
            }}
          >
            {subjects.map((id) => (
              <option key={id} value={id}>
                {getSubject(id).name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Topic</label>
          <input
            className="input"
            list="topic-suggestions"
            placeholder="e.g. Organic Chemistry"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <datalist id="topic-suggestions">
            {topicsForYear(subjectId, year).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label">Deck name (optional)</label>
          <input
            className="input"
            placeholder={`${subject.short}: ${topic || "topic"}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {tab === "ai" && (
          <div>
            <label className="label">Cards to generate — {count}</label>
            <input
              type="range"
              min={5}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            {!premium && (
              <p className="mt-1 text-xs text-ink-500">
                Free plan: {aiLeft} AI deck{aiLeft === 1 ? "" : "s"} left today
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <Button onClick={submit} loading={busy} className="w-full">
          {tab === "ai" ? (
            <>
              <WandIcon className="h-4 w-4" /> Generate deck
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4" /> Create empty deck
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Deck detail — card list, add/remove, pick a study mode

function DeckDetail({
  deck,
  cards,
  loading,
  uid,
  onBack,
  onStudy,
  onCardsChanged,
  onDeleted,
}: {
  deck: Deck;
  cards: Flashcard[];
  loading: boolean;
  uid: string;
  onBack: () => void;
  onStudy: (mode: StudyMode) => void;
  onCardsChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const subject = getSubject(deck.subjectId);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!front.trim() || !back.trim()) return;
    setAdding(true);
    try {
      await addCard(uid, deck.id, { front: front.trim(), back: back.trim() });
      setFront("");
      setBack("");
      await onCardsChanged();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-white"
      >
        <ChevronLeftIcon className="h-4 w-4" /> All decks
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            {deck.name}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {subject.name} · {deck.topic} · {cards.length} card
            {cards.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="danger"
          onClick={async () => {
            if (confirm(`Delete "${deck.name}" and all its cards?`)) {
              await deleteDeck(uid, deck.id);
              onDeleted();
            }
          }}
        >
          <TrashIcon className="h-4 w-4" /> Delete deck
        </Button>
      </div>

      {/* Study modes */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            {
              mode: "flip" as const,
              title: "Flip",
              desc: "Classic recall → reveal → self-grade. Feeds spaced repetition.",
            },
            {
              mode: "write" as const,
              title: "Write",
              desc: "Type the answer before you check — harder, stickier.",
            },
            {
              mode: "match" as const,
              title: "Match",
              desc: "Race to pair fronts with backs. A fast warm-up.",
            },
          ]
        ).map(({ mode, title, desc }) => (
          <button
            key={mode}
            disabled={cards.length < (mode === "match" ? 3 : 1)}
            onClick={() => onStudy(mode)}
            className="card p-6 text-left transition hover:border-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <p className="font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{desc}</p>
          </button>
        ))}
      </div>

      {/* Add card */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-white">Add a card</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <textarea
            className="input min-h-[70px] resize-y"
            placeholder="Front — the question or cue"
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
          <textarea
            className="input min-h-[70px] resize-y"
            placeholder="Back — the answer"
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />
        </div>
        <Button
          className="mt-3"
          variant="ghost"
          onClick={add}
          loading={adding}
          disabled={!front.trim() || !back.trim()}
        >
          <PlusIcon className="h-4 w-4" /> Add card
        </Button>
      </Card>

      {/* Card list */}
      {loading ? (
        <div className="grid place-items-center py-10">
          <Spinner className="h-6 w-6 text-brand-400" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState title="This deck is empty">
          Add cards above, or delete it and generate one with AI.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
            >
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs text-ink-500">
                {i + 1}
              </span>
              <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                <p className="text-sm font-medium text-ink-100">{card.front}</p>
                <p className="text-sm text-ink-300">{card.back}</p>
              </div>
              <button
                onClick={async () => {
                  await deleteCard(uid, deck.id, card.id);
                  await onCardsChanged();
                }}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-white/10 hover:text-red-300"
                title="Delete card"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Study session — flip / write / match

function StudySession({
  deck,
  cards,
  mode,
  uid,
  onExit,
}: {
  deck: Deck;
  cards: Flashcard[];
  mode: StudyMode;
  uid: string;
  onExit: () => void;
}) {
  if (mode === "match") {
    return <MatchGame deck={deck} cards={cards} onExit={onExit} />;
  }
  return (
    <RecallSession deck={deck} cards={cards} mode={mode} uid={uid} onExit={onExit} />
  );
}

function RecallSession({
  deck,
  cards,
  mode,
  uid,
  onExit,
}: {
  deck: Deck;
  cards: Flashcard[];
  mode: "flip" | "write";
  uid: string;
  onExit: () => void;
}) {
  const [order] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<{ good: number; again: number }>({
    good: 0,
    again: 0,
  });

  const card = order[index];
  const doneAll = index >= order.length;

  const grade = async (g: ReviewGrade) => {
    setResults((r) =>
      g === "again" ? { ...r, again: r.again + 1 } : { ...r, good: r.good + 1 },
    );
    setFlipped(false);
    setTyped("");
    setIndex((i) => i + 1);
    try {
      await studyFlashcard(uid, deck.id, card, deck.subjectId, deck.topic, g);
      await awardXp(uid, "flashcardStudied", "reviews");
    } catch (err) {
      console.error(err);
    }
  };

  if (doneAll) {
    const total = results.good + results.again;
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-2xl">
            🎉
          </div>
          <h1 className="page-title">
            Deck complete
          </h1>
          <p className="page-subtitle">
            {results.good}/{total} recalled ·{" "}
            <span className="font-semibold text-ink-200">
              +{total * 2} XP
            </span>
          </p>
          <p className="mt-3 text-sm text-ink-400">
            Every card is now scheduled in your review queue — the ones you
            missed come back tomorrow.
          </p>
          <Button className="mt-6 w-full" onClick={onExit}>
            Back to deck
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-white"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Exit
        </button>
        <span className="text-sm text-ink-400">
          {index + 1} / {order.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-brand-500"
          animate={{ width: `${(index / order.length) * 100}%` }}
        />
      </div>

      {mode === "flip" ? (
        <div className="perspective-1000">
          <motion.div
            key={card.id}
            className="preserve-3d relative min-h-[280px] cursor-pointer"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            onClick={() => setFlipped((f) => !f)}
          >
            <div className="backface-hidden card absolute inset-0 grid place-items-center p-8">
              <div className="text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500">
                  {deck.topic}
                </p>
                <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-white">
                  {card.front}
                </p>
                <p className="mt-6 text-xs text-ink-500">tap to flip</p>
              </div>
            </div>
            <div className="backface-hidden rotate-y-180 card absolute inset-0 grid place-items-center border-brand-500/30 p-8">
              <p className="whitespace-pre-line text-center leading-relaxed text-ink-100">
                {card.back}
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <Card className="min-h-[280px] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500">
            {deck.topic}
          </p>
          <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-white">
            {card.front}
          </p>
          <textarea
            className="input mt-4 min-h-[90px] resize-y"
            placeholder="Type your answer from memory…"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={flipped}
          />
          {flipped && (
            <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/5 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Model answer
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-100">
                {card.back}
              </p>
            </div>
          )}
        </Card>
      )}

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => grade("again")}
            className="rounded-xl border border-red-500/40 bg-white/[0.02] px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/15"
          >
            {mode === "write" ? "I was off" : "Didn't know it"}
          </button>
          <button
            onClick={() => grade("good")}
            className="rounded-xl border border-emerald-500/40 bg-white/[0.02] px-4 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
          >
            {mode === "write" ? "I nailed it" : "Got it"}
          </button>
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={() => setFlipped(true)}
          disabled={mode === "write" && typed.trim().length === 0}
        >
          {mode === "write" ? "Check my answer" : "Show answer"}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match game

interface Tile {
  id: string;
  cardId: string;
  side: "front" | "back";
  text: string;
}

function MatchGame({
  deck,
  cards,
  onExit,
}: {
  deck: Deck;
  cards: Flashcard[];
  onExit: () => void;
}) {
  const pool = useMemo(
    () => [...cards].sort(() => Math.random() - 0.5).slice(0, 6),
    [cards],
  );
  const tiles = useMemo<Tile[]>(
    () =>
      pool
        .flatMap((c) => [
          { id: `${c.id}-f`, cardId: c.id, side: "front" as const, text: c.front },
          { id: `${c.id}-b`, cardId: c.id, side: "back" as const, text: c.back },
        ])
        .sort(() => Math.random() - 0.5),
    [pool],
  );

  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [startedAt] = useState(Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const pick = (tile: Tile) => {
    if (matched.has(tile.cardId + tile.side) || finishedAt) return;
    if (!selected) {
      setSelected(tile);
      return;
    }
    if (selected.id === tile.id) {
      setSelected(null);
      return;
    }
    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      const next = new Set(matched);
      next.add(tile.cardId + "front");
      next.add(tile.cardId + "back");
      setMatched(next);
      setSelected(null);
      if (next.size === tiles.length) setFinishedAt(Date.now());
    } else {
      setMisses((m) => m + 1);
      const pair = new Set([selected.id, tile.id]);
      setWrongPair(pair);
      setSelected(null);
      setTimeout(() => setWrongPair(new Set()), 450);
    }
  };

  if (finishedAt) {
    const secs = Math.round((finishedAt - startedAt) / 1000);
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-2xl">
            ⚡
          </div>
          <h1 className="page-title">
            {secs}s
          </h1>
          <p className="page-subtitle">
            {pool.length} pairs matched · {misses} miss{misses === 1 ? "" : "es"}
          </p>
          <Button className="mt-6 w-full" onClick={onExit}>
            Back to deck
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-white"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Exit
        </button>
        <span className="text-sm text-ink-400">
          {deck.topic} · {matched.size / 2}/{pool.length} matched
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AnimatePresence>
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.cardId + tile.side);
            const isSelected = selected?.id === tile.id;
            const isWrong = wrongPair.has(tile.id);
            return (
              <motion.button
                key={tile.id}
                onClick={() => pick(tile)}
                animate={
                  isWrong
                    ? { x: [0, -6, 6, -4, 4, 0] }
                    : isMatched
                      ? { opacity: 0.25, scale: 0.95 }
                      : { opacity: 1, scale: 1 }
                }
                transition={{ duration: isWrong ? 0.4 : 0.25 }}
                disabled={isMatched}
                className={cn(
                  "min-h-[92px] rounded-xl border p-3 text-left text-xs leading-relaxed transition sm:text-sm",
                  isSelected
                    ? "border-brand-400 bg-brand-500/15 text-white"
                    : isWrong
                      ? "border-red-500/60 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-ink-850 text-ink-200 hover:border-white/25",
                )}
              >
                {tile.text.length > 120 ? tile.text.slice(0, 117) + "…" : tile.text}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="text-center text-xs text-ink-500">
        Match each cue with its answer. Wrong picks shake — matched pairs fade.
      </p>
    </div>
  );
}
