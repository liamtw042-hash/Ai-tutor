import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Progress, cn } from "@/components/ui";
import { DocIcon, SparkIcon, TargetIcon } from "@/components/icons";
import { SUBJECTS, getSubject } from "@/data/subjects";
import { DISCLAIMERS } from "@/data/nesa";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { reviewEssay } from "@/lib/claude";
import {
  awardXp,
  fetchEssayRecords,
  saveEssayRecord,
} from "@/lib/firestore";
import { canUse, incrementUsage, remaining } from "@/lib/usage";
import {
  type EssayFeedback,
  type EssayRecord,
  type SubjectId,
} from "@/types";
import { stageForSubject } from "@/lib/level";

const QUESTION_TYPES = [
  "Essay / extended response",
  "Common Module (Human Experiences)",
  "Module A response",
  "Module B response",
  "Module C (Craft of Writing)",
  "Source-based response",
  "Business/Economics report",
  "Short answer (extended)",
];

function bandTone(band: number, max: number): "green" | "amber" | "red" {
  const r = band / max;
  return r >= 0.66 ? "green" : r >= 0.4 ? "amber" : "red";
}

export default function Essay() {
  const { user, profile, configured } = useAuth();
  const premium = isPremium(profile);
  const uid = profile?.uid ?? "demo";

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id);

  const [subjectId, setSubjectId] = useState<SubjectId>(availableSubjects[0]);
  const [questionType, setQuestionType] = useState(QUESTION_TYPES[0]);
  const [question, setQuestion] = useState("");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fb, setFb] = useState<EssayFeedback | null>(null);
  const [history, setHistory] = useState<EssayRecord[]>([]);

  useEffect(() => {
    if (configured && user) {
      fetchEssayRecords(user.uid, 6).then(setHistory).catch(() => undefined);
    }
  }, [configured, user]);

  const subject = getSubject(subjectId);
  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay],
  );
  const left = remaining(uid, "essay", premium);
  const blocked = !canUse(uid, "essay", premium);

  const submit = async () => {
    if (blocked) {
      setError(
        "You've used your free essay reviews for today. Upgrade to Premium for unlimited detailed marking.",
      );
      return;
    }
    setError("");
    setLoading(true);
    setFb(null);
    try {
      const result = await reviewEssay(
        subject.name,
        questionType,
        subject.bands,
        essay,
        question.trim() || undefined,
        stageForSubject(profile, subjectId),
      );
      setFb(result);
      if (!premium) incrementUsage(uid, "essay");
      if (user) {
        await saveEssayRecord(user.uid, subjectId, questionType, wordCount, result);
        await awardXp(user.uid, "essaySubmitted", "essays");
        fetchEssayRecords(user.uid, 6).then(setHistory).catch(() => undefined);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the marker. Essay feedback runs on a serverless function with an API key.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Essay Feedback
          </h1>
          <p className="mt-1 text-ink-300">
            Paste a response and get structured, NESA-aligned marking in seconds.
          </p>
        </div>
        <Badge tone={premium ? "brand" : left > 0 ? "neutral" : "amber"}>
          {premium ? (
            <>
              <SparkIcon className="h-3.5 w-3.5" /> Unlimited
            </>
          ) : (
            `${Math.max(0, left)} free review${left === 1 ? "" : "s"} left`
          )}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Subject</label>
              <select
                className="input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value as SubjectId)}
              >
                {availableSubjects.map((id) => (
                  <option key={id} value={id}>
                    {getSubject(id).name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Question type</label>
              <select
                className="input"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">The question (optional, sharpens marking)</label>
            <textarea
              className="input min-h-[56px] resize-y font-normal leading-relaxed"
              placeholder="Paste the essay question or stimulus you were answering…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Your response</label>
            <textarea
              className="input min-h-[280px] resize-y font-normal leading-relaxed"
              placeholder="Paste your essay or extended response here…"
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-500">{wordCount} words</span>
            <Button onClick={submit} loading={loading} disabled={wordCount < 20}>
              <SparkIcon className="h-4 w-4" /> Mark my response
            </Button>
          </div>
        </Card>

        {/* Feedback */}
        <div>
          {loading ? (
            <Card className="h-full min-h-[420px] shimmer">{" "}</Card>
          ) : !fb ? (
            <Card className="flex h-full min-h-[420px] items-center justify-center">
              <EmptyState
                icon={<DocIcon className="h-6 w-6" />}
                title="Your feedback will appear here"
              >
                Marked against NESA band descriptors across thesis, evidence,
                analysis and expression.
              </EmptyState>
            </Card>
          ) : (
            <Card className="space-y-5">
              {/* Overall band */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-850 p-4">
                <div>
                  <p className="text-sm text-ink-400">Estimated band</p>
                  <p className="font-display text-3xl font-bold text-white">
                    {fb.band}
                    <span className="text-lg text-ink-500">/{fb.maxBand}</span>
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-full ring-4 ring-inset ring-brand-500/20">
                  <TargetIcon className="h-6 w-6 text-brand-300" />
                </div>
              </div>

              <p className="text-sm leading-relaxed text-ink-200">{fb.overall}</p>

              <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                {DISCLAIMERS.marking}
              </p>

              {/* Criteria */}
              <div className="space-y-3">
                {fb.criteria.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink-100">
                        {c.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {c.band > 0 && (
                          <Badge tone="neutral">Band {c.band}</Badge>
                        )}
                        <Badge tone={bandTone(c.score, c.max)}>
                          {c.score}/{c.max}
                        </Badge>
                      </span>
                    </div>
                    <Progress
                      value={c.score / c.max}
                      tone={bandTone(c.score, c.max)}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>

              {/* Next steps */}
              {fb.nextSteps?.length > 0 && (
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300">
                    <SparkIcon className="h-3.5 w-3.5" /> Priority next steps
                  </p>
                  <ol className="space-y-2">
                    {fb.nextSteps.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-sm text-ink-200"
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-200",
                          )}
                        >
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Band history */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">Your recent essays</h2>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                title={`${h.questionType} · ${h.wordCount} words`}
              >
                <span aria-hidden>{getSubject(h.subjectId).icon}</span>
                <span className="text-xs text-ink-400">
                  {new Date(h.createdAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <Badge tone={bandTone(h.band, h.maxBand)}>
                  Band {h.band}/{h.maxBand}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Band trajectory over time lives in{" "}
            <span className="text-brand-300">Progress</span>.
          </p>
        </div>
      )}
    </div>
  );
}
