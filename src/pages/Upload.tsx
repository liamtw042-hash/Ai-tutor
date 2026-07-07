import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { analyzeWork } from "@/lib/claude";
import {
  ACCEPT_ATTR,
  deleteUpload,
  fetchUploads,
  fileToBase64,
  uploadWork,
  validateFile,
} from "@/lib/uploads";
import { DEMO_SUBJECT_IDS, getSubject } from "@/data/subjects";
import { DISCLAIMERS } from "@/data/nesa";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
  cn,
} from "@/components/ui";
import {
  CameraIcon,
  DocIcon,
  FileIcon,
  ImageIcon,
  LockIcon,
  SparkIcon,
  TargetIcon,
  TrashIcon,
  UploadIcon,
  WandIcon,
  XIcon,
} from "@/components/icons";
import { type SubjectId, type Upload, type UploadAction } from "@/types";
import { stageForSubject } from "@/lib/level";

const ACTIONS: {
  id: UploadAction;
  label: string;
  hint: string;
  icon: (p: { className?: string }) => JSX.Element;
}[] = [
  { id: "explain", label: "Explain it", hint: "Break down what it's asking", icon: TargetIcon },
  { id: "mark", label: "Mark it", hint: "Feedback & an estimated mark", icon: DocIcon },
  { id: "generate", label: "Practice questions", hint: "Similar Qs to try", icon: WandIcon },
  { id: "ask", label: "Ask about it", hint: "Your own question", icon: SparkIcon },
];

export default function UploadPage() {
  const { user, profile, configured, togglePremium } = useAuth();
  const premium = isPremium(profile);

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : DEMO_SUBJECT_IDS;

  const [subjectId, setSubjectId] = useState<SubjectId>(availableSubjects[0]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<"image" | "pdf">("image");
  const [savedUpload, setSavedUpload] = useState<Upload | null>(null);
  const [uploading, setUploading] = useState(false);

  const [action, setAction] = useState<UploadAction>("explain");
  const [askText, setAskText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const [history, setHistory] = useState<Upload[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (configured && user && premium) {
      fetchUploads(user.uid).then(setHistory).catch(() => undefined);
    }
  }, [configured, user, premium]);

  // Reconcile the selected subject once the profile's real subject list loads
  // (profile is async, so the initial value may not be in the final options).
  useEffect(() => {
    if (!availableSubjects.includes(subjectId)) {
      setSubjectId(availableSubjects[0]);
    }
  }, [availableSubjects, subjectId]);

  // Revoke object URLs to avoid leaks.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stage = stageForSubject(profile, subjectId);

  const onPick = async (picked: File | null) => {
    if (!picked) return;
    setError("");
    setResult("");
    const check = validateFile(picked);
    if (!check.ok || !check.kind) {
      setError(check.error ?? "Unsupported file.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setKind(check.kind);
    setSavedUpload(null);
    setPreviewUrl(check.kind === "image" ? URL.createObjectURL(picked) : null);

    // Store it in the student's own space (best-effort; analysis works regardless).
    if (configured && user) {
      setUploading(true);
      try {
        const rec = await uploadWork(user.uid, picked, subjectId);
        setSavedUpload(rec);
        setHistory((h) => [rec, ...h]);
      } catch (err) {
        // Non-fatal — they can still analyse the file this session.
        console.error("Upload failed", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const run = async (a: UploadAction) => {
    if (!file) {
      setError("Add a photo or PDF first.");
      return;
    }
    if (a === "ask" && !askText.trim()) {
      setError("Type your question about the work first.");
      return;
    }
    setAction(a);
    setError("");
    setResult("");
    setAnalyzing(true);
    try {
      const data = await fileToBase64(file);
      const payload =
        kind === "image"
          ? { image: { data, mediaType: file.type } }
          : { pdf: { data } };
      const { result: out } = await analyzeWork({
        action: a,
        email: profile?.email,
        premium,
        subjectName: getSubject(subjectId).name,
        stage,
        question: a === "ask" ? askText.trim() : undefined,
        ...payload,
      });
      setResult(out);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't analyse that. The vision features need the app deployed with an API key.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setSavedUpload(null);
    setResult("");
    setError("");
  };

  const removeUpload = async (u: Upload) => {
    if (!user) return;
    setHistory((h) => h.filter((x) => x.id !== u.id));
    await deleteUpload(user.uid, u).catch(() => undefined);
  };

  const sizeLabel = useMemo(
    () => (file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""),
    [file],
  );

  // ---------- Premium gate ----------
  if (!premium) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="page-title">
            Photo &amp; document help is Premium
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Snap a photo of your handwritten work, a worksheet or a past task —
            or upload a PDF — and StudyMate reads it and helps: explains it,
            marks it against the standard for your year, or turns it into fresh
            practice. The single most useful thing for your actual homework.
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Upload your work
        </h1>
        <p className="page-subtitle">
          Photograph handwritten work or upload a worksheet/PDF. StudyMate reads
          it — even messy handwriting — and helps you with it.
        </p>
      </div>

      {/* Hidden inputs: camera (mobile) + file picker */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: upload + controls */}
        <div className="space-y-4">
          {!file ? (
            <Card className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 p-6 text-center transition hover:border-white/15 hover:bg-white/5"
                >
                  <CameraIcon className="h-7 w-7 text-ink-400" />
                  <span className="text-sm font-semibold text-white">
                    Take a photo
                  </span>
                  <span className="text-xs text-ink-400">
                    Use your camera (great for handwritten work)
                  </span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 p-6 text-center transition hover:border-white/15 hover:bg-white/5"
                >
                  <UploadIcon className="h-7 w-7 text-ink-400" />
                  <span className="text-sm font-semibold text-white">
                    Choose a file
                  </span>
                  <span className="text-xs text-ink-400">
                    JPG, PNG or PDF · up to 10 MB
                  </span>
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <div className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink-850">
                  {kind === "image" && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Your upload preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-8 w-8 text-ink-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-100">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {kind === "image" ? "Image" : "PDF"} · {sizeLabel}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {uploading ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-400">
                        <Spinner className="h-3.5 w-3.5" /> Saving securely…
                      </span>
                    ) : savedUpload ? (
                      <Badge tone="green">Saved to your account</Badge>
                    ) : configured ? null : (
                      <span className="text-xs text-ink-500">
                        Not saved (demo mode) — analysis still works
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"
                  title="Remove"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          {/* Subject */}
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

          {/* Ask field */}
          <div>
            <label className="label">Your question (for “Ask about it”)</label>
            <textarea
              className="input min-h-[64px] resize-y"
              placeholder="e.g. Why did I lose marks on question 3? What does this question want?"
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  disabled={!file || analyzing}
                  onClick={() => void run(a.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                    action === a.id && (analyzing || result)
                      ? "border-brand-500/50 bg-brand-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/15",
                  )}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-ink-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      {a.label}
                    </span>
                    <span className="block text-xs text-ink-400">{a.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-ink-500">
            {DISCLAIMERS.marking}
          </p>
        </div>

        {/* Right: result */}
        <div>
          {analyzing ? (
            <Card className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
              <Spinner className="h-7 w-7 text-brand-400" />
              <p className="text-sm text-ink-300">
                Reading your {kind === "image" ? "photo" : "document"} and
                thinking it through…
              </p>
            </Card>
          ) : result ? (
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge tone="brand">
                  {ACTIONS.find((a) => a.id === action)?.label}
                </Badge>
                <span className="text-xs text-ink-500">
                  {getSubject(subjectId).short}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-100">
                {result}
              </p>
            </Card>
          ) : (
            <Card className="flex min-h-[320px] items-center justify-center">
              <EmptyState
                icon={<ImageIcon className="h-6 w-6" />}
                title="Your help appears here"
              >
                Add a photo or PDF, pick a subject, then choose what you'd like —
                explain, mark, practice questions, or ask your own question.
              </EmptyState>
            </Card>
          )}
        </div>
      </div>

      {/* Recent uploads */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">Your recent uploads</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-ink-850">
                  {u.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.url}
                      alt={u.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-5 w-5 text-brand-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-ink-100 hover:text-white"
                  >
                    {u.name}
                  </a>
                  <p className="text-xs text-ink-400">
                    {new Date(u.createdAt).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <button
                  onClick={() => void removeUpload(u)}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-white/10 hover:text-red-300"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
