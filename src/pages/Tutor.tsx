import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Badge, Button, cn } from "@/components/ui";
import {
  ChatIcon,
  MicIcon,
  SparkIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
  StopIcon,
} from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { DEMO_SUBJECT_IDS, getSubject } from "@/data/subjects";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { tutorReply } from "@/lib/claude";
import {
  awardXp,
  createSession,
  fetchLatestSessionForSubject,
  fetchRecentAttempts,
  saveSessionMessages,
} from "@/lib/firestore";
import { weakestTopics, type TopicMastery } from "@/lib/mastery";
import { useSpeechRecognition, useSpeechSynthesis } from "@/lib/speech";
import { canUse, incrementUsage, remaining } from "@/lib/usage";
import { type ChatMessage, type SubjectId } from "@/types";
import { stageForSubject } from "@/lib/level";

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
  const premium = isPremium(profile);
  const uid = profile?.uid ?? "demo";

  const availableSubjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : DEMO_SUBJECT_IDS;

  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState("");
  const [weak, setWeak] = useState<TopicMastery[]>([]);
  const [ttsOn, setTtsOn] = useState(false);

  const greetingFor = (name: string): ChatMessage => ({
    role: "assistant",
    content: `G'day! I'm your ${name} tutor. Ask me anything, or tell me what you're stuck on and we'll work through it together. What's on your mind?`,
  });

  // Open a subject: resume its saved chat if one exists (so conversations
  // survive refresh), otherwise start and persist a fresh session.
  const pickSubject = async (id: SubjectId) => {
    const s = getSubject(id);
    setSubjectId(id);
    setError("");
    lastSpokenRef.current = -1;
    if (!configured || !user) {
      // Demo mode — local only, no persistence.
      setSessionId(null);
      setMessages([greetingFor(s.name)]);
      return;
    }
    setResuming(true);
    setMessages([]);
    try {
      const existing = await fetchLatestSessionForSubject(user.uid, id);
      if (existing && existing.messages?.length) {
        setSessionId(existing.id);
        setMessages(existing.messages);
        // Don't re-read the whole backlog aloud if TTS is on.
        lastSpokenRef.current = existing.messages.length - 1;
      } else {
        const greeting = [greetingFor(s.name)];
        const newId = await createSession(user.uid, id, s.name);
        setSessionId(newId);
        setMessages(greeting);
        void saveSessionMessages(user.uid, newId, greeting);
      }
    } catch (err) {
      console.error("Failed to open tutor session", err);
      setSessionId(null);
      setMessages([greetingFor(s.name)]);
    } finally {
      setResuming(false);
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  // Index of the last assistant message we've already read aloud, so toggling
  // TTS on doesn't replay old messages and each new reply is spoken once.
  const lastSpokenRef = useRef(-1);

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

  // Voice output (text-to-speech) and input (speech-to-text). Both degrade to
  // a no-op on unsupported browsers, so the mic/speaker controls simply hide.
  const synth = useSpeechSynthesis();
  // A ref lets the recogniser's onFinal callback reach the latest `send`
  // without re-creating the recogniser on every render.
  const sendRef = useRef<(text: string) => void>(() => {});
  const recog = useSpeechRecognition({
    onFinal: (text) => sendRef.current(text),
  });

  const send = async (text: string) => {
    if (!text.trim() || loading || !subjectId) return;
    if (blocked) {
      setError("You've used your free tutor messages today. Upgrade for unlimited.");
      return;
    }
    // Interrupt any reply being read aloud when the student speaks/sends again.
    synth.cancel();
    setError("");
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const subjectWeak = weak
        .filter((w) => w.subjectId === subjectId)
        .map((w) => ({ topic: w.topic, accuracy: w.accuracy }));
      const { reply } = await tutorReply(
        getSubject(subjectId).name,
        nextMessages,
        subjectWeak,
        profile?.displayName?.split(" ")[0],
        stageForSubject(profile, subjectId),
      );
      // Only count a successful exchange against the daily free allowance — a
      // failed request (e.g. network drop) shouldn't burn a message.
      if (!premium) incrementUsage(uid, "tutor");
      const finalMessages: ChatMessage[] = [
        ...nextMessages,
        { role: "assistant", content: reply },
      ];
      setMessages(finalMessages);
      // Persist the exchange so the conversation survives a refresh.
      if (user && sessionId) {
        void saveSessionMessages(user.uid, sessionId, finalMessages);
      }
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

  // Keep the recogniser's send callback pointing at the current closure.
  useEffect(() => {
    sendRef.current = (text: string) => void send(text);
  });

  // Read each new assistant reply aloud while voice output is on.
  useEffect(() => {
    if (!ttsOn) return;
    const last = messages.length - 1;
    if (last < 0) return;
    const m = messages[last];
    if (m.role === "assistant" && last > lastSpokenRef.current) {
      lastSpokenRef.current = last;
      synth.speak(m.content);
    }
  }, [messages, ttsOn, synth]);

  // Toggle voice output; when turning on, skip replaying the current backlog.
  const toggleTts = () => {
    // Unlock synthesis inside this click gesture (required by mobile browsers).
    synth.unlock();
    setTtsOn((on) => {
      const next = !on;
      if (next) lastSpokenRef.current = messages.length - 1;
      else synth.cancel();
      return next;
    });
  };

  const onMicClick = () => {
    if (recog.listening) {
      recog.stop();
    } else {
      synth.cancel(); // don't talk over the student
      synth.unlock(); // keep the voice loop working on mobile
      recog.start();
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
          <h1 className="page-title">
            AI Tutor
          </h1>
          <p className="page-subtitle">
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
                onClick={() => void pickSubject(id)}
                className="card flex items-center gap-3 p-4 text-left transition hover:border-white/15"
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
          {synth.supported && (
            <button
              onClick={toggleTts}
              aria-pressed={ttsOn}
              aria-label={
                ttsOn ? "Turn off spoken replies" : "Read replies aloud"
              }
              title={ttsOn ? "Voice replies on" : "Read replies aloud"}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg border transition",
                ttsOn
                  ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                  : "border-white/10 bg-white/5 text-ink-300 hover:text-ink-100",
              )}
            >
              {ttsOn ? (
                <SpeakerOnIcon
                  className={cn("h-[18px] w-[18px]", synth.speaking && "animate-pulse")}
                />
              ) : (
                <SpeakerOffIcon className="h-[18px] w-[18px]" />
              )}
            </button>
          )}
          <Badge tone={premium ? "brand" : left > 2 ? "neutral" : "amber"}>
            {premium ? "Unlimited" : `${Math.max(0, left)} left today`}
          </Badge>
          <button
            onClick={() => {
              recog.stop();
              synth.cancel();
              lastSpokenRef.current = -1;
              setSubjectId(null);
              setSessionId(null);
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
        {(loading || resuming) && (
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
      {messages.length <= 1 && !recog.listening && (
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultSuggestions(subjectId).map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              className="chip transition hover:border-white/15 hover:text-white"
            >
              <SparkIcon className="h-3 w-3" /> {q}
            </button>
          ))}
        </div>
      )}

      {/* Listening indicator */}
      {recog.listening && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-ink-200">
            {recog.interim || "Listening… speak your question"}
          </p>
          <button
            onClick={() => recog.stop()}
            className="text-xs font-semibold text-red-300 hover:text-red-200"
          >
            Stop
          </button>
        </div>
      )}

      {(error || recog.error) && (
        <p className="mt-2 text-xs text-amber-300">{error || recog.error}</p>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          className={cn(
            "input max-h-40 min-h-[52px] flex-1 resize-none py-3.5",
            recog.listening && "border-red-500/40 text-ink-300",
          )}
          placeholder={
            recog.listening
              ? "Listening…"
              : `Ask your ${subject.short} tutor anything…`
          }
          value={recog.listening ? recog.interim : input}
          rows={1}
          readOnly={recog.listening}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {recog.supported && (
          <button
            type="button"
            onClick={onMicClick}
            disabled={loading || blocked}
            aria-pressed={recog.listening}
            aria-label={recog.listening ? "Stop listening" : "Ask by voice"}
            title={recog.listening ? "Stop listening" : "Ask by voice"}
            className={cn(
              "grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl border transition disabled:opacity-40",
              recog.listening
                ? "animate-pulse border-red-500/50 bg-red-500/15 text-red-300"
                : "border-white/10 bg-white/5 text-ink-200 hover:border-white/15 hover:text-white",
            )}
          >
            {recog.listening ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicIcon className="h-5 w-5" />
            )}
          </button>
        )}
        <Button
          type="submit"
          className="h-[52px] px-5"
          disabled={!input.trim() || loading || blocked || recog.listening}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
