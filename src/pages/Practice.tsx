import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, Modal, cn } from "@/components/ui";
import {
  BoltIcon,
  CheckIcon,
  SparkIcon,
  TargetIcon,
  WandIcon,
  XIcon,
} from "@/components/icons";
import { SUBJECTS, getSubject, topicsForYear } from "@/data/subjects";
import { questionsForSubject } from "@/data/questions";
import { DISCLAIMERS } from "@/data/nesa";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import {
  awardXp,
  recordAttempt,
  scheduleQuestionReview,
} from "@/lib/firestore";
import { generateQuestions, markWritten } from "@/lib/claude";
import { canUse, incrementUsage, remaining } from "@/lib/usage";
import {
  type GeneratedQuestion,
  type Question,
  type SubjectId,
  type WrittenFeedback,
} from "@/types";
import { levelForSubject, stageForSubject } from "@/lib/level";

const TYPE_LABEL: Record<string, string> = {
  "multiple-choice": "Multiple choice",
  "short-answer": "Short answer",
  "extended-response": "Extended response",
};

function LimitBanner() {
  return (
    <Card className="flex flex-col items-center gap-3 border-brand-500/30 bg-brand-500/5 text-center sm:flex-row sm:text-left">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
        <BoltIcon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">
          You've hit your free daily limit
        </p>
        <p className="text-sm text-ink-400">
          Upgrade to Premium for unlimited practice, or clear your review queue
          — reviews are always unlimited.
        </p>
      </div>
    </Card>
  );
}

// --- Written-response marking panel ---
function WrittenPanel({
  question,
  onGraded,
  stage,
}: {
  question: Question;
  onGraded: (fb: WrittenFeedback) => void;
  stage: string;
}) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fb, setFb] = useState<WrittenFeedback | null>(null);
  const subject = getSubject(question.subjectId);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await markWritten(
        {
          prompt: question.prompt,
          marks: question.marks,
          markingCriteria: question.markingCriteria,
          topic: question.topic,
        },
        subject.name,
        answer,
        stage,
      );
      setFb(result);
      onGraded(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the marker. The AI marker needs the app deployed with an API key.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fb) {
    const pct = fb.awardedMarks / Math.max(fb.totalMarks, 1);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-850 p-4">
          <div>
            <p className="text-sm text-ink-400">Your mark</p>
            <p className="font-display text-2xl font-bold text-white">
              {fb.awardedMarks}
              <span className="text-ink-500">/{fb.totalMarks}</span>
            </p>
          </div>
          <Badge tone={pct >= 0.7 ? "green" : pct >= 0.4 ? "amber" : "red"}>
            Band {fb.band}/{fb.maxBand}
          </Badge>
        </div>
        <p className="text-sm text-ink-200">{fb.summary}</p>
        <FeedbackList title="Strengths" tone="green" items={fb.strengths} />
        <FeedbackList title="To improve" tone="amber" items={fb.improvements} />
        <FeedbackList
          title="A full-mark answer covers"
          tone="brand"
          items={fb.modelPoints}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[160px] resize-y font-normal leading-relaxed"
        placeholder="Write your response here…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-500">
          {answer.trim().split(/\s+/).filter(Boolean).length} words
        </span>
        <Button
          onClick={submit}
          loading={loading}
          disabled={answer.trim().length < 5}
        >
          <SparkIcon className="h-4 w-4" /> Mark my answer
        </Button>
      </div>
    </div>
  );
}

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "brand";
}) {
  if (!items?.length) return null;
  const dot = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    brand: "text-brand-300",
  }[tone];
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-200">
            <span className={cn("mt-1 text-lg leading-none", dot)}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- AI question generator modal ---
function GenerateModal({
  open,
  onClose,
  subjectId,
  topics,
  uid,
  premium,
  stage,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: SubjectId;
  topics: string[];
  uid: string;
  premium: boolean;
  stage: string;
  onGenerated: (qs: Question[]) => void;
}) {
  const subject = getSubject(subjectId);
  const [topic, setTopic] = useState(topics[0] ?? "");
  const [type, setType] = useState<"multiple-choice" | "short-answer" | "mixed">(
    "mixed",
  );
  const [difficulty, setDifficulty] = useState<
    "foundation" | "standard" | "challenge"
  >("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = remaining(uid, "generate", premium);

  const run = async () => {
    setError("");
    if (!canUse(uid, "generate", premium)) {
      setError(
        "You've used today's free AI generation. Upgrade for unlimited fresh questions.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await generateQuestions(
        subject.name,
        topic || topics[0] || subject.topics[0],
        3,
        type,
        difficulty,
        stage,
      );
      if (!premium) incrementUsage(uid, "generate");
      const now = Date.now();
      const qs: Question[] = res.questions.map(
        (g: GeneratedQuestion, i: number) => ({
          id: `gen-${subjectId}-${now}-${i}`,
          subjectId,
          topic: g.topic,
          type: g.type,
          marks: g.marks,
          prompt: g.prompt,
          options: g.options,
          correctIndex: g.correctIndex,
          solution: g.solution,
          markingCriteria: g.markingCriteria,
          difficulty: g.difficulty,
          generated: true,
        }),
      );
      onGenerated(qs);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Generation failed. Is the API deployed?",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate fresh questions">
      <div className="space-y-4">
        <p className="text-sm text-ink-300">
          AI writes 3 original, exam-style questions pitched at your year on any{" "}
          {subject.short} topic — command verbs, plausible distractors, full
          solutions.
        </p>
        <div>
          <label className="label">Topic</label>
          <select
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="mixed">Mixed</option>
              <option value="multiple-choice">Multiple choice</option>
              <option value="short-answer">Short answer</option>
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select
              className="input"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
            >
              <option value="foundation">Foundation</option>
              <option value="standard">Standard</option>
              <option value="challenge">Challenge</option>
            </select>
          </div>
        </div>
        {!premium && (
          <p className="text-xs text-ink-500">
            Free plan: {left} generation{left === 1 ? "" : "s"} left today
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <Button className="w-full" onClick={run} loading={busy}>
          <WandIcon className="h-4 w-4" />
          {busy ? "Writing questions…" : "Generate 3 questions"}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-500">
          {DISCLAIMERS.generated}
        </p>
      </div>
    </Modal>
  );
}

export default function Practice() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const premium = isPremium(profile);
  const uid = profile?.uid ?? "demo";

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id);

  const initialSubject =
    (params.get("subject") as SubjectId) &&
    availableSubjects.includes(params.get("subject") as SubjectId)
      ? (params.get("subject") as SubjectId)
      : availableSubjects[0];

  const [subjectId, setSubjectId] = useState<SubjectId>(initialSubject);
  // Level respects per-subject acceleration (may be above the base year).
  const year = levelForSubject(profile, subjectId);
  const stage = stageForSubject(profile, subjectId);
  const [topic, setTopic] = useState<string>(params.get("topic") || "All topics");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [sessionXp, setSessionXp] = useState(0);

  const allQuestions = useMemo(
    () => [
      ...generated.filter((q) => q.subjectId === subjectId),
      ...questionsForSubject(subjectId),
    ],
    [subjectId, generated],
  );
  const topics = useMemo(
    () => ["All topics", ...new Set(allQuestions.map((q) => q.topic))],
    [allQuestions],
  );
  const questions = useMemo(
    () =>
      topic === "All topics"
        ? allQuestions
        : allQuestions.filter((q) => q.topic === topic),
    [allQuestions, topic],
  );

  const question = questions[index];
  const left = remaining(uid, "practice", premium);
  const blocked = !canUse(uid, "practice", premium);

  const changeSubject = (id: SubjectId) => {
    setSubjectId(id);
    setTopic("All topics");
    resetQuestion(0);
    setParams({ subject: id });
  };

  function resetQuestion(newIndex: number) {
    setIndex(newIndex);
    setSelected(null);
    setRevealed(false);
  }

  /** Persist an outcome: attempt record + SRS scheduling + XP. */
  const persistOutcome = async (q: Question, correct: boolean | null, awarded: number, total: number) => {
    if (!premium) incrementUsage(uid, "practice");
    if (!profile) return;
    const gotIt = correct === null ? awarded / Math.max(total, 1) >= 0.5 : correct;
    try {
      await recordAttempt(profile.uid, {
        questionId: q.id,
        subjectId: q.subjectId,
        topic: q.topic,
        type: q.type,
        correct,
        awardedMarks: awarded,
        totalMarks: total,
      });
      await scheduleQuestionReview(profile.uid, q, gotIt);
      const xp = await awardXp(
        profile.uid,
        gotIt ? "questionCorrect" : "questionAttempted",
        "questions",
      );
      setSessionXp((x) => x + xp);
    } catch (err) {
      console.error("Failed to persist attempt", err);
    }
  };

  const answerMC = (i: number) => {
    if (revealed || !question) return;
    setSelected(i);
    setRevealed(true);
    void persistOutcome(
      question,
      i === question.correctIndex,
      i === question.correctIndex ? question.marks : 0,
      question.marks,
    );
  };

  const onWrittenGraded = (fb: WrittenFeedback) => {
    if (!question) return;
    void persistOutcome(question, null, fb.awardedMarks, fb.totalMarks);
  };

  const next = () => resetQuestion((index + 1) % questions.length);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Practice</h1>
          <p className="mt-1 text-ink-300">
            Every answer feeds your mastery map and spaced-repetition queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessionXp > 0 && (
            <Badge tone="brand">
              <SparkIcon className="h-3.5 w-3.5" /> +{sessionXp} XP
            </Badge>
          )}
          <Badge tone={premium ? "brand" : left > 3 ? "neutral" : "amber"}>
            {premium ? (
              <>
                <SparkIcon className="h-3.5 w-3.5" /> Unlimited
              </>
            ) : (
              `${Math.max(0, left)} free left today`
            )}
          </Badge>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2">
        {availableSubjects.map((id) => {
          const s = getSubject(id);
          const active = id === subjectId;
          return (
            <button
              key={id}
              onClick={() => changeSubject(id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-brand-500/50 bg-brand-500/10 text-white"
                  : "border-white/8 text-ink-300 hover:border-white/20 hover:text-ink-100",
              )}
            >
              <span aria-hidden>{s.icon}</span>
              {s.short}
            </button>
          );
        })}
      </div>

      {/* Topic filter + generate */}
      <div className="flex flex-wrap items-center gap-2">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTopic(t);
              resetQuestion(0);
            }}
            className={cn(
              "chip transition",
              t === topic
                ? "border-brand-500/40 bg-brand-500/10 text-brand-200"
                : "hover:border-white/25",
            )}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setGenOpen(true)}
          className="chip border-brand-500/40 text-brand-200 transition hover:bg-brand-500/10"
        >
          <WandIcon className="h-3.5 w-3.5" /> Generate new
        </button>
      </div>

      {blocked ? (
        <LimitBanner />
      ) : !question ? (
        <Card>No questions found for this filter.</Card>
      ) : (
        <Card className="p-6">
          {/* Question header */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{TYPE_LABEL[question.type]}</Badge>
            <Badge tone="neutral">{question.topic}</Badge>
            <Badge tone="brand">
              {question.marks} mark{question.marks === 1 ? "" : "s"}
            </Badge>
            {question.generated && (
              <Badge tone="amber">
                <WandIcon className="h-3 w-3" /> AI-generated
              </Badge>
            )}
            {question.outcomes?.map((o) => (
              <span key={o} className="text-[11px] text-ink-500">
                {o}
              </span>
            ))}
            <span className="ml-auto text-xs text-ink-500">
              {index + 1} / {questions.length}
            </span>
          </div>

          <p className="whitespace-pre-line text-lg font-medium leading-relaxed text-ink-100">
            {question.prompt}
          </p>

          {/* Answer area */}
          <div className="mt-6">
            {question.type === "multiple-choice" ? (
              <div className="space-y-2.5">
                {question.options?.map((opt, i) => {
                  const isCorrect = i === question.correctIndex;
                  const isChosen = i === selected;
                  const state = !revealed
                    ? "idle"
                    : isCorrect
                      ? "correct"
                      : isChosen
                        ? "wrong"
                        : "idle";
                  return (
                    <button
                      key={i}
                      disabled={revealed}
                      onClick={() => answerMC(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                        state === "idle" &&
                          "border-white/10 bg-ink-850 hover:border-brand-500/40 hover:bg-white/5",
                        state === "correct" &&
                          "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
                        state === "wrong" &&
                          "border-red-500/50 bg-red-500/10 text-red-100",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                          state === "correct" &&
                            "border-emerald-400 bg-emerald-500 text-white",
                          state === "wrong" &&
                            "border-red-400 bg-red-500 text-white",
                          state === "idle" && "border-white/20 text-ink-300",
                        )}
                      >
                        {state === "correct" ? (
                          <CheckIcon className="h-3.5 w-3.5" />
                        ) : state === "wrong" ? (
                          <XIcon className="h-3.5 w-3.5" />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <WrittenPanel
                key={question.id}
                question={question}
                onGraded={onWrittenGraded}
                stage={stage}
              />
            )}
          </div>

          {/* Solution reveal for MC / written */}
          {question.type === "multiple-choice" && revealed && (
            <div className="mt-5 rounded-xl border border-white/10 bg-ink-850 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300">
                <TargetIcon className="h-3.5 w-3.5" /> Worked solution
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-200">
                {question.solution}
              </p>
              <p className="mt-2 border-t border-white/5 pt-2 text-[11px] text-ink-500">
                {selected === question.correctIndex
                  ? "Scheduled for review before you'd forget it."
                  : "You'll see this again tomorrow — that's the system working."}
              </p>
            </div>
          )}
          {question.type !== "multiple-choice" && (
            <details className="mt-5 rounded-xl border border-white/10 bg-ink-850 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-brand-300">
                Show model answer & criteria
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-200">
                {question.solution}
              </p>
              {question.markingCriteria && (
                <ul className="mt-3 space-y-1 border-t border-white/5 pt-3">
                  {question.markingCriteria.map((c, i) => (
                    <li key={i} className="text-xs text-ink-400">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() =>
                resetQuestion((index - 1 + questions.length) % questions.length)
              }
              className="text-sm text-ink-400 hover:text-ink-100"
            >
              ← Previous
            </button>
            <Button variant="ghost" onClick={next}>
              Next question →
            </Button>
          </div>
        </Card>
      )}

      <GenerateModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        subjectId={subjectId}
        topics={topicsForYear(subjectId, year)}
        uid={uid}
        premium={premium}
        stage={stage}
        onGenerated={(qs) => {
          setGenerated((prev) => [...qs, ...prev]);
          setTopic("All topics");
          resetQuestion(0);
        }}
      />
    </div>
  );
}
