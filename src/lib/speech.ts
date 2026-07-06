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

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, [supported]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;
    return (
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang?.startsWith("en-AU")) ??
      voices.find((v) => v.lang?.startsWith("en")) ??
      voices[0] ??
      null
    );
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const clean = text.trim();
      if (!clean) return;
      const synth = window.speechSynthesis;
      synth.cancel(); // never queue — replace whatever's speaking
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = lang;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [supported, lang, pickVoice],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
