import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Badge, Button, cn } from "@/components/ui";
import { ChatIcon, SparkIcon } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { SUBJECTS, getSubject } from "@/data/subjects";
import { useAuth } from "@/lib/auth";
import { tutorReply } from "@/lib/claude";
import { awardXp, fetchRecentAttempts } from "@/lib/firestore";
import { weakestTopics, type TopicMastery } from "@/lib/mastery";
import { canUse, incrementUsage, remaining } from "@/lib/usage";
import type { ChatMessage, SubjectId } from "@/types";

const SUGGESTIONS: Partial<Record<SubjectId, string[]>> = {
  "math-adv": [
    "Walk me through differentiating x·ln(x)",
    "How do I know when to use the product vs chain rule?",
    "Explain the empirical (68-95-99.7) rule with an example",
  ],
  "english-adv": [
    "How do I write a stronger thesis for Module A?",
    "What does 'textual integrity' actually mean?",
    "Help me analyse a quote for human experiences",
  ],
  biology: [
    "Explain negative feedback in homeostasis",
    "How does CRISPR-Cas9 work, step by step?",
    "What's the difference between incidence and prevalence?",
  ],
  chemistry: [
    "Help me apply Le Chatelier's principle",
    "Why does increasing pressure shift this equilibrium?",
    "How do I calculate pH of a strong acid?",
  ],
  physics: [
    "Break down projectile motion components for me",
    "Why does length contraction happen?",
    "Explain how a DC motor keeps spinning",
  ],
  economics: [
    "How does a depreciation affect the trade balance?",
    "Explain the difference between cyclical and structural unemployment",
    "What tools does the RBA use for monetary policy?",
  ],
};

function defaultSuggestions(id: SubjectId): string[] {
  return (
    SUGGESTIONS[id] ?? [
      `Give me a quick overview of ${getSubject(id).name}`,
      "Test my understanding with a question",
      "Help me plan how to revise this subject",
    ]
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          isUser ? "bg-brand-600 text-sm font-bold text-white" : "bg-ink-800",
        )}
      >
        {isUser ? "You"[0] : <LogoMark size={20} />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-brand-600 text-white"
            : "prose-tutor border border-white/8 bg-ink-900 text-ink-100",
        )}
      >
        <p className="whitespace-pre-line">{msg.content}</p>
      </div>
    </div>
  );
}

export default function Tutor() {
  const { user, profile, configured } = useAuth();
  const premium = profile?.premium ?? false;
  const uid = profile?.uid ?? "demo";

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id);

  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weak, setWeak] = useState<TopicMastery[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The tutor references the student's real weak areas, so load them once.
  useEffect(() => {
    if (!configured || !user) return;
    fetchRecentAttempts(user.uid)
      .then((a) => setWeak(weakestTopics(a, 4)))
      .catch(() => undefined);
  }, [configured, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const left = remaining(uid, "tutor", premium);
  const blocked = !canUse(uid, "tutor", premium);

  const send = async (text: string) => {
    if (!text.trim() || loading || !subjectId) return;
    if (blocked) {
      setError("You've used your free tutor messages today. Upgrade for unlimited.");
      return;
    }
    setError("");
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    if (!premium) incrementUsage(uid, "tutor");
    try {
      const subjectWeak = weak
        .filter((w) => w.subjectId === subjectId)
        .map((w) => ({ topic: w.topic, accuracy: w.accuracy }));
      const { reply } = await tutorReply(
        getSubject(subjectId).name,
        nextMessages,
        subjectWeak,
        profile?.displayName?.split(" ")[0],
      );
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      if (user) void awardXp(user.uid, "tutorMessage", "tutorMessages");
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "I couldn't reach my brain just now. The AI tutor runs on a serverless function — make sure the app is deployed with an ANTHROPIC_API_KEY set. Then try again!",
        },
      ]);
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  // --- Subject picker screen ---
  if (!subjectId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
            <ChatIcon className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            AI Tutor
          </h1>
          <p className="mt-2 text-ink-300">
            Pick a subject and start a conversation. Your tutor guides you to the
            answer — it won't just hand it over.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {availableSubjects.map((id) => {
            const s = getSubject(id);
            return (
              <button
                key={id}
                onClick={() => {
                  setSubjectId(id);
                  setMessages([
                    {
                      role: "assistant",
                      content: `G'day! I'm your ${s.name} tutor. Ask me anything, or tell me what you're stuck on and we'll work through it together. What's on your mind?`,
                    },
                  ]);
                }}
                className="card flex items-center gap-3 p-4 text-left transition hover:border-brand-500/30"
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-xl"
                  style={{
                    background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                  }}
                  aria-hidden
                >
                  {s.icon}
                </div>
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-ink-400">{s.blurb}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const subject = getSubject(subjectId);

  // --- Chat screen ---
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl text-lg"
            style={{
              background: `linear-gradient(135deg, ${subject.gradient[0]}, ${subject.gradient[1]})`,
            }}
            aria-hidden
          >
            {subject.icon}
          </div>
          <div>
            <p className="font-semibold text-white">{subject.name} tutor</p>
            <p className="text-xs text-ink-400">
              Socratic mode · guides, not tells
              {weak.some((w) => w.subjectId === subjectId) &&
                " · knows your weak topics"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={premium ? "brand" : left > 2 ? "neutral" : "amber"}>
            {premium ? "Unlimited" : `${Math.max(0, left)} left today`}
          </Badge>
          <button
            onClick={() => {
              setSubjectId(null);
              setMessages([]);
              setError("");
            }}
            className="text-sm text-ink-400 hover:text-ink-100"
          >
            Change
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-ink-950/40 p-4"
      >
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-800">
              <LogoMark size={20} />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultSuggestions(subjectId).map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              className="chip transition hover:border-brand-500/40 hover:text-brand-200"
            >
              <SparkIcon className="h-3 w-3" /> {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-amber-300">{error}</p>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          className="input max-h-40 min-h-[52px] flex-1 resize-none py-3.5"
          placeholder={`Ask your ${subject.short} tutor anything…`}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          type="submit"
          className="h-[52px] px-5"
          disabled={!input.trim() || loading || blocked}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
