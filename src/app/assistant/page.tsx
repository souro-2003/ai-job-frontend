"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Mic, Volume2, VolumeX, Lock, Sparkles } from "lucide-react";
import api, { ApiError } from "@/lib/api";
import {
  pickVoice,
  speak,
  stopSpeaking,
  createRecognizer,
  speechSupported,
} from "@/lib/speech";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What should I fix on my profile first?",
  "Which skills should I learn to get more matches?",
  "What job titles should I be searching for?",
  "How do I explain a gap in my work history?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [mounted, setMounted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!speechSupported.tts) return;

    function load() {
      setVoice(pickVoice());
    }

    load();
    window.speechSynthesis.onvoiceschanged = load;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    setError("");
    setLocked(null);

    try {
      const { data } = await api.post("/ai/chat", {
        message: trimmed,
        sessionId: sessionId ?? undefined,
        voiceMode: voiceOn,
      });

      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

      if (voiceOn) speak(data.reply, voice);
    } catch (err) {
      if (err instanceof ApiError && err.isPaywall) {
        setLocked(err.message);
      } else if (err instanceof ApiError && err.code === "AI_UNAVAILABLE") {
        setError(
          "The assistant is not switched on yet. Add an AI key to the backend .env file."
        );
      } else {
        setError(
          err instanceof ApiError ? err.message : "The assistant could not reply."
        );
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function startListening() {
    const recognizer = createRecognizer();

    if (!recognizer) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setListening(true);
    stopSpeaking();

    recognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      void send(transcript);
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend = () => setListening(false);

    recognizer.start();
  }

  function toggleVoice() {
    if (voiceOn) stopSpeaking();
    setVoiceOn(!voiceOn);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 border-b border-line py-4">
        <div>
          <h1 className="text-xl text-ink">Asha</h1>
          <p className="text-sm text-ink-soft">
            Your career assistant. She reads your profile before answering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mounted && speechSupported.tts && (
            <button
              onClick={toggleVoice}
              className={`rounded border p-2 ${
                voiceOn
                  ? "border-fit bg-fit-soft text-fit"
                  : "border-line bg-paper text-ink-soft hover:bg-shell"
              }`}
              title={voiceOn ? "Voice replies on" : "Voice replies off"}
            >
              {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-5">
        {messages.length === 0 && !locked && (
          <div className="mx-auto max-w-lg py-8 text-center">
            <Sparkles size={24} className="mx-auto text-brand" />
            <p className="mt-3 text-sm text-ink">Ask anything about your job search.</p>
            <p className="mt-1 text-sm text-ink-soft">
              She can only use what is in your profile, so fill that in first for
              useful answers.
            </p>

            <div className="mt-5 space-y-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => send(starter)}
                  className="block w-full rounded border border-line bg-paper px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-shell hover:text-ink"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {locked && (
          <div className="rounded-card border border-locked/30 bg-locked-soft p-5">
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-locked" />
              <div>
                <h2 className="text-base font-600 text-ink">{locked}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  The assistant is part of the Basic and Pro plans.
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-block rounded bg-locked px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
                >
                  See plans
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === "user" ? "flex justify-end" : "flex"}
            >
              <div
                className={`max-w-[85%] rounded-card px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-brand text-paper"
                    : "border border-line bg-paper text-ink"
                }`}
              >
                {message.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex">
              <div className="rounded-card border border-line bg-paper px-4 py-2.5 text-sm text-ink-soft">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-3 rounded border border-alert/30 bg-alert/5 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-line py-4"
      >
        {mounted && speechSupported.stt && (
          <button
            type="button"
            onClick={startListening}
            disabled={listening || sending}
            className={`rounded border p-2.5 ${
              listening
                ? "border-alert bg-alert/10 text-alert"
                : "border-line bg-paper text-ink-soft hover:bg-shell"
            }`}
            title="Speak your question"
          >
            <Mic size={18} />
          </button>
        )}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Type your question"}
          disabled={sending}
          className="flex-1 rounded border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded bg-brand p-2.5 text-paper hover:bg-brand-deep disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}