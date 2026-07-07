import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Web Speech API hooks — voice input (SpeechRecognition) and voice output
// (SpeechSynthesis). Both degrade gracefully: on a browser without support the
// `supported` flag is false and every method is a safe no-op, so callers can
// simply hide the UI and keep working in text-only mode.
//
// Tested against Chrome (desktop + Android) and Safari (macOS + iOS). Speech
// recognition on iOS requires a user gesture to start, which is satisfied by
// the mic button's click/tap handler.
// ---------------------------------------------------------------------------

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** True when this browser can transcribe speech to text. */
export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

interface RecognitionOptions {
  lang?: string;
  /** Fired once with the final transcript when the user stops speaking. */
  onFinal?: (text: string) => void;
}

export function useSpeechRecognition({
  lang = "en-AU",
  onFinal,
}: RecognitionOptions = {}) {
  const ctor = getRecognitionCtor();
  const supported = ctor !== null;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);
  // Keep the latest callback without re-creating the recogniser each render.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!ctor) return;
    setError(null);
    // Abort any recogniser still winding down before starting a fresh one.
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }

    const rec = new ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      // "no-speech" / "aborted" are benign; surface only real problems.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone access was blocked. Enable it in your browser settings."
            : "Voice input didn't work — try again or type instead.",
        );
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      recRef.current = null;
      const trimmed = finalText.trim();
      if (trimmed) onFinalRef.current?.(trimmed);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called while already running; reset cleanly.
      setListening(false);
      recRef.current = null;
    }
  }, [ctor, lang]);

  // Tear down on unmount so a dangling recogniser can't keep the mic open.
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, []);

  return { supported, listening, interim, error, start, stop };
}

/** True when this browser can read text aloud. */
export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useSpeechSynthesis({ lang = "en-AU" }: { lang?: string } = {}) {
  const supported = speechSynthesisSupported();
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const unlockedRef = useRef(false);
  const keepAliveRef = useRef<number | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load(); // voices are often empty on first call…
    synth.addEventListener?.("voiceschanged", load); // …and arrive via this event
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      if (keepAliveRef.current) window.clearInterval(keepAliveRef.current);
      synth.cancel();
    };
  }, [supported]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current.length
      ? voicesRef.current
      : (voicesRef.current = window.speechSynthesis?.getVoices?.() ?? []);
    if (!voices.length) return null;
    const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
    return (
      voices.find((v) => v.lang === lang) ?? // exact en-AU
      voices.find((v) => v.lang?.startsWith("en-AU")) ??
      en.find((v) => /natural|google|siri|premium|enhanced/i.test(v.name)) ??
      en.find((v) => v.lang?.startsWith("en-GB")) ??
      en[0] ??
      voices[0] ??
      null
    );
  }, [lang]);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  /**
   * Unlock speech synthesis from inside a user gesture. Mobile Safari and
   * Chrome block programmatic speech until speak() has fired once during a
   * tap/click — so callers invoke this from the toggle handler.
   */
  const unlock = useCallback(() => {
    if (!supported || unlockedRef.current) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.resume();
      unlockedRef.current = true;
    } catch {
      /* ignore */
    }
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const clean = text.trim();
      if (!clean) return;
      const synth = window.speechSynthesis;
      // Chrome quirk: cancel() immediately followed by speak() often swallows
      // the new utterance. Cancel, then start on the next tick.
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = lang;
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onstart = () => {
          setSpeaking(true);
          // Chrome silently pauses long utterances (~15s); keep it going.
          stopKeepAlive();
          keepAliveRef.current = window.setInterval(() => {
            try {
              if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
              else stopKeepAlive();
            } catch {
              /* ignore */
            }
          }, 8000);
        };
        utterance.onend = () => {
          stopKeepAlive();
          setSpeaking(false);
        };
        utterance.onerror = () => {
          stopKeepAlive();
          setSpeaking(false);
        };
        setSpeaking(true);
        synth.speak(utterance);
        try {
          synth.resume(); // in case the engine was left paused
        } catch {
          /* ignore */
        }
      }, 60);
    },
    [supported, lang, pickVoice, stopKeepAlive],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    stopKeepAlive();
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported, stopKeepAlive]);

  return { supported, speaking, speak, cancel, unlock };
}
