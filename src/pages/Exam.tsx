import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { questionsForSubject } from "@/data/questions";
import { SUBJECTS, getSubject } from "@/data/subjects";
import { DISCLAIMERS } from "@/data/nesa";
import { markWritten } from "@/lib/claude";
import {
  awardBadges,
  awardXp,
  fetchExamResults,
  recordAttempt,
  saveExamResult,
} from "@/lib/firestore";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Progress,
  Spinner,
  cn,
} from "@/components/ui";
import {
  CheckIcon,
  ClockIcon,
  LockIcon,
  SparkIcon,
  XIcon,
} from "@/components/icons";
import {
  type ExamQuestionResult,
  type ExamResult,
  type Question,
  type SubjectId,
} from "@/types";
import { stageForSubject } from "@/lib/level";

type Phase = "setup" | "running" | "marking" | "results";

export default function Exam() {
  const { user, profile, configured, togglePremium } = useAuth();
  const premium = isPremium(profile);

  const [phase, setPhase] = useState<Phase>("setup");
  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLimit, setTimeLimit] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [markingProgress, setMarkingProgress] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [history, setHistory] = useState<ExamResult[]>([]);
  const startRef = useRef(0);
  // The countdown effect closes over the first "running" render; a ref keeps
  // the latest answers visible when time expires.
  const answersRef = useRef<Record<string, string>>({});
  const finishingRef = useRef(false);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id);

  useEffect(() => {
    if (configured && user && premium) {
      fetchExamResults(user.uid, 5).then(setHistory).catch(console.error);
    }
  }, [configured, user, premium]);

  // Countdown
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          void finishExam();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = (id: SubjectId) => {
    const bank = questionsForSubject(id).filter(
      (q) => q.type !== "extended-response",
    );
    // Interleave topics: sort by topic then take spread, then shuffle lightly
    const picked = [...bank].sort(() => Math.random() - 0.5).slice(0, 8);
    const marks = picked.reduce((s, q) => s + q.marks, 0);
    const limit = Math.max(300, Math.round(marks * 100)); // ~1.7 min per mark
    setSubjectId(id);
    setQuestions(picked);
    setAnswers({});
    setTimeLimit(limit);
    setSecondsLeft(limit);
    startRef.current = Date.now();
    finishingRef.current = false;
    setPhase("running");
  };

  async function finishExam() {
    if (!subjectId || finishingRef.current) return;
    finishingRef.current = true;
    setPhase("marking");
    const subject = getSubject(subjectId);
    const results: ExamQuestionResult[] = [];
    let doneCount = 0;

    for (const q of questions) {
      const given = answersRef.current[q.id] ?? "";
      if (q.type === "multiple-choice") {
        const idx = given === "" ? -1 : Number(given);
        const correct = idx === q.correctIndex;
        results.push({
          questionId: q.id,
          topic: q.topic,
          type: q.type,
          prompt: q.prompt,
          answerGiven:
            idx >= 0 && q.options ? `${String.fromCharCode(65 + idx)}. ${q.options[idx]}` : "(no answer)",
          correct,
          awardedMarks: correct ? q.marks : 0,
          totalMarks: q.marks,
          feedback: q.solution,
        });
      } else {
        if (!given.trim()) {
          results.push({
            questionId: q.id,
            topic: q.topic,
            type: q.type,
            prompt: q.prompt,
            answerGiven: "(no answer)",
            correct: null,
            awardedMarks: 0,
            totalMarks: q.marks,
            feedback: "No response provided.",
          });
        } else {
          try {
            const fb = await markWritten(
              {
                prompt: q.prompt,
                marks: q.marks,
                markingCriteria: q.markingCriteria,
                topic: q.topic,
              },
              subject.name,
              given,
              stageForSubject(profile, subjectId),
            );
            results.push({
              questionId: q.id,
              topic: q.topic,
              type: q.type,
              prompt: q.prompt,
              answerGiven: given,
              correct: null,
              awardedMarks: fb.awardedMarks,
              totalMarks: fb.totalMarks,
              feedback: fb.summary,
            });
          } catch {
            results.push({
              questionId: q.id,
              topic: q.topic,
              type: q.type,
              prompt: q.prompt,
              answerGiven: given,
              correct: null,
              awardedMarks: 0,
              totalMarks: q.marks,
              feedback:
                "AI marking unavailable — deploy with an API key to mark written answers.",
            });
          }
        }
      }
      doneCount += 1;
      setMarkingProgress(doneCount / questions.length);
    }

    const totalMarks = results.reduce((s, r) => s + r.totalMarks, 0);
    const awardedMarks = results.reduce((s, r) => s + r.awardedMarks, 0);
    const examResult: Omit<ExamResult, "id" | "createdAt"> = {
      subjectId,
      totalMarks,
      awardedMarks,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      timeLimitSeconds: timeLimit,
      questions: results,
    };

    let id = "local";
    if (user) {
      try {
        id = await saveExamResult(user.uid, examResult);
        // exam attempts also feed mastery tracking
        for (const r of results) {
          await recordAttempt(user.uid, {
            questionId: r.questionId,
            subjectId,
            topic: r.topic,
            type: r.type,
            correct: r.correct,
            awardedMarks: r.awardedMarks,
            totalMarks: r.totalMarks,
          });
        }
        await awardXp(user.uid, "examCompleted");
        if (profile && !profile.badges?.includes("first-exam")) {
          await awardBadges(user.uid, ["first-exam"]);
        }
      } catch (err) {
        console.error("Failed to save exam", err);
      }
    }
    setResult({ ...examResult, id, createdAt: Date.now() });
    setPhase("results");
  }

  // ---------- Premium gate ----------
  if (!premium) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Exam Mode is a Premium feature
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Sit timed, past-paper-style sessions under real exam pressure —
            multiple choice and written responses, AI-marked against NESA
            criteria, with a full breakdown at the end. The final weeks before
            the HSC are won here.
          </p>
          <Button className="mt-6" onClick={togglePremium}>
            <SparkIcon className="h-4 w-4" /> Upgrade — $20/mo
          </Button>
          <p className="mt-2 text-[11px] text-ink-500">
            Demo: toggles instantly, no card required
          </p>
        </Card>
      </div>
    );
  }

  // ---------- Marking ----------
  if (phase === "marking") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <Spinner className="mx-auto h-8 w-8 text-brand-400" />
        <h2 className="mt-4 font-display text-xl font-bold text-white">
          Marking your paper…
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Written responses are being marked against NESA criteria.
        </p>
        <Progress value={markingProgress} className="mt-5" />
      </div>
    );
  }

  // ---------- Results ----------
  if (phase === "results" && result && subjectId) {
    const subject = getSubject(subjectId);
    const pct = result.totalMarks > 0 ? result.awardedMarks / result.totalMarks : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center">
            <p className="text-sm text-ink-400">
              {subject.name} · timed session
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold text-white">
              {result.awardedMarks}
              <span className="text-2xl text-ink-500">/{result.totalMarks}</span>
            </p>
            <div className="mx-auto mt-4 max-w-xs">
              <Progress
                value={pct}
                tone={pct >= 0.7 ? "green" : pct >= 0.4 ? "amber" : "red"}
              />
            </div>
            <p className="mt-4 text-sm text-ink-400">
              Finished in {Math.floor(result.durationSeconds / 60)}m{" "}
              {result.durationSeconds % 60}s of{" "}
              {Math.floor(result.timeLimitSeconds / 60)}m ·{" "}
              <span className="font-semibold text-brand-300">+60 XP</span>
            </p>
            <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-ink-500">
              {DISCLAIMERS.marking}
            </p>
          </Card>
        </motion.div>

        <div className="space-y-3">
          {result.questions.map((r, i) => {
            const good = r.awardedMarks / Math.max(r.totalMarks, 1) >= 0.5;
            return (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      good
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400",
                    )}
                  >
                    {good ? (
                      <CheckIcon className="h-3.5 w-3.5" />
                    ) : (
                      <XIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{r.topic}</Badge>
                      <span className="text-xs font-semibold text-ink-300">
                        {r.awardedMarks}/{r.totalMarks} marks
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm font-medium text-ink-100">
                      {r.prompt}
                    </p>
                    <p className="mt-2 text-xs text-ink-400">
                      <span className="font-semibold text-ink-300">Your answer: </span>
                      {r.answerGiven.length > 220
                        ? r.answerGiven.slice(0, 217) + "…"
                        : r.answerGiven}
                    </p>
                    {r.feedback && (
                      <p className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] p-2.5 text-xs leading-relaxed text-ink-300">
                        {r.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={() => setPhase("setup")}>Another session</Button>
        </div>
      </div>
    );
  }

  // ---------- Running ----------
  if (phase === "running" && subjectId) {
    const subject = getSubject(subjectId);
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const urgent = secondsLeft < 120;
    const answered = questions.filter((q) => (answers[q.id] ?? "") !== "").length;

    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="sticky top-0 z-10 -mx-4 border-b border-white/5 bg-ink-950/90 px-4 py-3 backdrop-blur sm:top-[0px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{subject.name}</p>
              <p className="text-xs text-ink-400">
                {answered}/{questions.length} answered
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-lg font-bold",
                urgent
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-white/5 text-white",
              )}
            >
              <ClockIcon className="h-4.5 w-4.5" />
              {mins}:{secs.toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        {questions.map((q, qi) => (
          <Card key={q.id} className="p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-brand-300">
                Q{qi + 1}
              </span>
              <Badge tone="neutral">{q.topic}</Badge>
              <Badge tone="brand">
                {q.marks} mark{q.marks === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="whitespace-pre-line font-medium leading-relaxed text-ink-100">
              {q.prompt}
            </p>
            {q.type === "multiple-choice" ? (
              <div className="mt-4 space-y-2">
                {q.options?.map((opt, i) => {
                  const chosen = answers[q.id] === String(i);
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: String(i) }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition",
                        chosen
                          ? "border-brand-500/60 bg-brand-500/10 text-white"
                          : "border-white/10 bg-ink-850 text-ink-200 hover:border-white/25",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                          chosen
                            ? "border-brand-400 bg-brand-500 text-white"
                            : "border-white/20 text-ink-300",
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="input mt-4 min-h-[120px] resize-y"
                placeholder="Write your response…"
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            )}
          </Card>
        ))}

        <div className="flex justify-center pb-8">
          <Button className="px-8" onClick={() => void finishExam()}>
            Submit paper
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Setup ----------
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Exam Mode</h1>
        <p className="mt-1 text-ink-300">
          A timed, past-paper-style session: ~8 questions across topics, marked
          like the real thing. Exam pressure is a skill — train it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableSubjects.map((id) => {
          const s = getSubject(id);
          const bank = questionsForSubject(id).filter(
            (q) => q.type !== "extended-response",
          );
          return (
            <button
              key={id}
              onClick={() => start(id)}
              disabled={bank.length < 3}
              className="card group p-5 text-left transition hover:border-brand-500/40 disabled:opacity-40"
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl text-lg"
                style={{
                  background: `linear-gradient(135deg, ${s.gradient[0]}33, ${s.gradient[1]}33)`,
                }}
              >
                {s.icon}
              </span>
              <p className="mt-3 font-semibold text-white group-hover:text-brand-200">
                {s.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {Math.min(8, bank.length)} questions · timed
              </p>
            </button>
          );
        })}
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">Recent sessions</h2>
          <div className="space-y-2">
            {history.map((h) => {
              const s = getSubject(h.subjectId);
              const pct = h.totalMarks > 0 ? h.awardedMarks / h.totalMarks : 0;
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-100">{s.name}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(h.createdAt).toLocaleDateString("en-AU")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      pct >= 0.7
                        ? "text-emerald-400"
                        : pct >= 0.4
                          ? "text-amber-400"
                          : "text-red-400",
                    )}
                  >
                    {h.awardedMarks}/{h.totalMarks}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && configured && (
        <EmptyState icon={<ClockIcon className="h-6 w-6" />} title="No sessions yet">
          Your past exam sessions and scores will appear here.
        </EmptyState>
      )}
    </div>
  );
}
