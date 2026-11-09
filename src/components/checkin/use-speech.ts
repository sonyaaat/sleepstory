"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Browser speech-to-text (CHK-02). Works in Chrome/Edge on desktop; on phones it
// needs HTTPS (CHK-13). The mic button is hidden when the browser doesn't support it.

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-CA";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onFinalRef.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = () => setListening(false);
    rec.current = r;
    setSupported(true);
    return () => r.stop();
  }, []);

  const start = useCallback(() => {
    if (!rec.current || listening) return;
    try {
      rec.current.start();
      setListening(true);
    } catch {
      // already started, or blocked until the user taps
    }
  }, [listening]);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (!rec.current) return;
    if (listening) rec.current.stop();
    else {
      rec.current.start();
      setListening(true);
    }
  }, [listening]);

  return { supported, listening, interim, toggle, start, stop };
}
