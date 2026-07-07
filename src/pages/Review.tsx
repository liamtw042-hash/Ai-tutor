import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import {
  awardXp,
  fetchDueSRSItems,
  reviewSRSItem,
} from "@/lib/firestore";
import { applyGrade, intervalLabel } from "@/lib/sm2";
import { getSubject } from "@/data/subjects";
import { Badge, Button, Card, EmptyState, Spinner, cn } from "@/components/ui";
import {
  ArrowRightIcon,
  BrainIcon,
  CheckIcon,
  SparkIcon,
} from "@/components/icons";
import type { ReviewGrade, SRSItem } from "@/types";

const GRADES: { grade: ReviewGrade; label: string; cls: string }[] = [
  { grade: "again", label: "Again", cls: "border-red-500/40 text-red-300 hover:bg-red-500/15" },
  { grade: "hard", label: "Hard", cls: "border-amber-500/40 text-amber-300 hover:bg-amber-500/15" },
  { grade: "good", label: "Good", cls: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15" },
  { grade: "easy", label: "Easy", cls: "border-brand-500/40 text-brand-300 hover:bg-brand-500/15" },
];

export default function Review() {
  const { user, configured } = useAuth();
  const [queue, setQueue] = useState<SRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [initialCount, setInitialCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!configured || !user) {
        setLoading(false);
        return;
      }
      try {
        const items = await fetchDueSRSItems(user.uid);
        if (cancelled) return;
        // Shuffle so the same subject doesn't clump
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setInitialCount(shuffled.length);
      } catch (err) {
        console.error("Review load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  const item = queue[0];

  // Preview what each grade does to the schedule (shown on the buttons).
  const previews = useMemo(() => {
    if (!item) return {} as Record<ReviewGrade, string>;
    const out = {} as Record<ReviewGrade, string>;
    for (const { grade } of GRADES) {
      out[grade] = intervalLabel(applyGrade(item, grade).interval);
    }
    return out;
  }, [item]);

  const grade = async (g: ReviewGrade) => {
    if (!item || !user) return;
    setRevealed(false);
    // "again" puts the item back near the end of this session's queue too
    setQueue((q) => {
      const rest = q.slice(1);
      return g === "again" ? [...rest, { ...item, reps: 0 }] : rest;
    });
    if (g !== "again") setDone((d) => d + 1);
    try {
      await reviewSRSItem(user.uid, item, g);
      if (g !== "again") {
        const xp = await awardXp(user.uid, "reviewDone", "reviews");
        setXpEarned((x) => x + xp);
      }
    } catch (err) {
      console.error("Failed to save review", err);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-7 w-7 text-brand-400" />
      </div>
    );
  }

  if (!configured) {
    return (
      <EmptyState icon={<BrainIcon className="h-7 w-7" />} title="Demo mode">
        Reviews need an account — configure Firebase to enable saved progress.
      </EmptyState>
    );
  }

  // Finished (or nothing due)
  if (!item) {
    return (
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-6 text-center">
            {done > 0 ? (
              <>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <CheckIcon className="h-7 w-7" />
                </div>
                <h1 className="page-title">
                  Review complete
                </h1>
                <p className="page-subtitle">
                  {done} item{done === 1 ? "" : "s"} reviewed ·{" "}
                  <span className="font-semibold text-ink-200">
                    +{xpEarned} XP
                  </span>
                </p>
                <p className="mt-3 text-sm text-ink-400">
                  Each one is now scheduled further out. Come back tomorrow —
                  the queue does the remembering for you.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
                  <BrainIcon className="h-7 w-7" />
                </div>
                <h1 className="page-title">
                  Nothing due right now
                </h1>
                <p className="mt-2 text-sm text-ink-400">
                  Practice questions and flashcards you study are scheduled here
                  by spaced repetition. Answer some questions and this queue
                  fills itself.
                </p>
              </>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/practice" className="btn-primary">
                Practise <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const subject = getSubject(item.subjectId);
  const progress = initialCount > 0 ? done / initialCount : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Review</h1>
          <p className="mt-0.5 text-sm text-ink-400">
            {queue.length} left · graded by SM-2 spaced repetition
          </p>
        </div>
        <Badge tone="brand">
          <SparkIcon className="h-3.5 w-3.5" /> +{xpEarned} XP
        </Badge>
      </div>

      {/* session progress */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-brand-500"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id + String(revealed)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">
                {subject.icon} {subject.short}
              </Badge>
              <Badge tone="neutral">{item.topic}</Badge>
              <Badge tone={item.kind === "flashcard" ? "brand" : "amber"}>
                {item.kind === "flashcard" ? "Flashcard" : "Question"}
              </Badge>
              {item.lapses > 1 && <Badge tone="red">Tricky for you</Badge>}
            </div>

            <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-ink-100">
              {item.front}
            </p>

            {item.options && item.options.length > 0 && (
              <div className="mt-4 space-y-2">
                {item.options.map((opt, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
                      revealed && i === item.correctIndex
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-ink-850 text-ink-200",
                    )}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/20 text-xs font-bold text-ink-300">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            )}

            {revealed ? (
              <>
                <div className="mt-5 rounded-xl border border-white/10 bg-ink-850 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Answer
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-100">
                    {item.back}
                  </p>
                </div>
                <p className="mt-5 text-center text-xs text-ink-400">
                  How well did you remember it?
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADES.map(({ grade: g, label, cls }) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      className={cn(
                        "rounded-xl border bg-white/[0.02] px-3 py-2.5 text-center transition",
                        cls,
                      )}
                    >
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-[11px] opacity-70">
                        {previews[g]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setRevealed(true)} className="px-8">
                  Show answer
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-ink-500">
        Recall first, then reveal — the effort of retrieving is what builds the
        memory.
      </p>
    </div>
  );
}
