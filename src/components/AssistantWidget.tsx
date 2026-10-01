"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Mic,
  Volume2,
  VolumeX,
  Lock,
  Minus,
  Maximize2,
  GripVertical,
} from "lucide-react";
import api, { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
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

interface Point {
  x: number;
  y: number;
}

const STARTERS = [
  "What should I fix on my profile?",
  "Which skills should I learn next?",
  "What roles should I search for?",
];

const POSITION_KEY = "asha-widget-position";
const LAUNCHER = 64;
const PANEL_W = 352;
const PANEL_H = 512;
const EDGE = 12;

const WIDGET_CSS = `
@keyframes aw-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%, 97%      { transform: scaleY(.08); }
}
@keyframes aw-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
@keyframes aw-ring {
  0%   { transform: scale(1);   opacity: .45; }
  70%  { transform: scale(1.7); opacity: 0; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes aw-scan {
  0%, 100% { transform: translateX(-2px); }
  50%      { transform: translateX(2px); }
}
@keyframes aw-dot {
  0%, 60%, 100% { opacity: .25; transform: translateY(0); }
  30%           { opacity: 1;   transform: translateY(-3px); }
}
@keyframes aw-rise {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.aw-eye       { transform-origin: center; animation: aw-blink 5.5s infinite; }
.aw-eye-think { animation: aw-scan 1.1s ease-in-out infinite; }
.aw-float     { animation: aw-float 3.4s ease-in-out infinite; }
.aw-ring      { animation: aw-ring 2.6s ease-out infinite; }
.aw-panel     { animation: aw-rise .22s ease-out both; }
.aw-dot       { animation: aw-dot 1.2s infinite; }
.aw-dragging, .aw-dragging * { cursor: grabbing !important; user-select: none !important; }
.aw-held      { animation: none !important; }
`;

/** Robot face — eyes blink on idle and scan side to side while thinking. */
function RobotFace({
  size = 34,
  thinking = false,
  speaking = false,
}: {
  size?: number;
  thinking?: boolean;
  speaking?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="4" r="2.6" fill="currentColor">
        {thinking && (
          <animate attributeName="opacity" values="1;.25;1" dur="1s" repeatCount="indefinite" />
        )}
      </circle>

      <rect x="7" y="10" width="34" height="28" rx="9" fill="currentColor" opacity=".12" />
      <rect x="7" y="10" width="34" height="28" rx="9" stroke="currentColor" strokeWidth="2.5" />

      <rect x="2.5" y="20" width="4" height="8" rx="2" fill="currentColor" />
      <rect x="41.5" y="20" width="4" height="8" rx="2" fill="currentColor" />

      <g className={thinking ? "aw-eye-think" : "aw-eye"}>
        <circle cx="17.5" cy="22.5" r="3.4" fill="currentColor" />
        <circle cx="30.5" cy="22.5" r="3.4" fill="currentColor" />
      </g>

      {speaking ? (
        <rect x="17" y="29" width="14" height="5" rx="2.5" fill="currentColor">
          <animate attributeName="height" values="5;2;6;3;5" dur=".7s" repeatCount="indefinite" />
        </rect>
      ) : (
        <path d="M18 30.5c2 2.2 10 2.2 12 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export default function AssistantWidget() {
  const user = useAuthStore((state) => state.user);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Top-left corner of the widget. Null until measured, then pinned bottom-right.
  const [pos, setPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const grabRef = useRef<Point>({ x: 0, y: 0 });

  const bottomRef = useRef<HTMLDivElement>(null);

  const size = open
    ? { w: PANEL_W, h: PANEL_H }
    : { w: LAUNCHER, h: LAUNCHER };

  const clamp = useCallback((p: Point, w: number, h: number): Point => {
    const maxX = window.innerWidth - w - EDGE;
    const maxY = window.innerHeight - h - EDGE;
    return {
      x: Math.min(Math.max(EDGE, p.x), Math.max(EDGE, maxX)),
      y: Math.min(Math.max(EDGE, p.y), Math.max(EDGE, maxY)),
    };
  }, []);

  useEffect(() => {
    setMounted(true);

    // Restore the saved spot, otherwise park it in the bottom-right corner.
    let start: Point | null = null;

    try {
      const saved = window.localStorage.getItem(POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Point;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) start = parsed;
      }
    } catch {
      start = null;
    }

    setPos(
      start ?? {
        x: window.innerWidth - LAUNCHER - 20,
        y: window.innerHeight - LAUNCHER - 20,
      }
    );
  }, []);

  // Keep the widget on screen when the window resizes or the panel opens.
  useEffect(() => {
    if (!pos) return;

    const fix = () => setPos((p) => (p ? clamp(p, size.w, size.h) : p));

    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clamp]);

  // Drag handling, pointer events so touch works too.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      movedRef.current = true;
      setPos(
        clamp(
          { x: e.clientX - grabRef.current.x, y: e.clientY - grabRef.current.y },
          size.w,
          size.h
        )
      );
    };

    const onUp = () => {
      setDragging(false);
      document.body.classList.remove("aw-dragging");

      setPos((p) => {
        if (p) {
          try {
            window.localStorage.setItem(POSITION_KEY, JSON.stringify(p));
          } catch {
            // Storage blocked; the position just will not persist.
          }
        }
        return p;
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, clamp, size.w, size.h]);

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || !pos) return;

    movedRef.current = false;
    grabRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
    document.body.classList.add("aw-dragging");
  };

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
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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

      if (voiceOn) {
        setSpeaking(true);
        speak(data.reply, voice);
        window.setTimeout(
          () => setSpeaking(false),
          Math.min(20000, 2000 + data.reply.length * 55)
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.isPaywall) {
        setLocked(err.message);
      } else if (err instanceof ApiError && err.code === "AI_UNAVAILABLE") {
        setError("The assistant is not switched on yet.");
      } else {
        setError(err instanceof ApiError ? err.message : "The assistant could not reply.");
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function startListening() {
    const recognizer = createRecognizer();

    if (!recognizer) {
      setError("Voice input needs Chrome or Edge.");
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
    if (voiceOn) {
      stopSpeaking();
      setSpeaking(false);
    }
    setVoiceOn(!voiceOn);
  }

  // Candidates only — admins and employers have no use for the career assistant.
  if (!mounted || !pos || user?.role !== "CANDIDATE") return null;

  const anchor: React.CSSProperties = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    zIndex: 50,
    transition: dragging ? "none" : "left .15s ease, top .15s ease",
  };

  return (
    <>
      <style>{WIDGET_CSS}</style>

      {/* ---------------- launcher ---------------- */}
      {!open && (
        <button
          style={anchor}
          onPointerDown={startDrag}
          onClick={() => {
            // A drag should not also open the panel.
            if (!movedRef.current) setOpen(true);
          }}
          aria-label="Open Asha, your career assistant. Drag to move."
          title="Click to chat · drag to move"
          className={`group flex h-16 w-16 cursor-grab items-center justify-center rounded-full bg-brand text-paper shadow-lg hover:bg-brand-deep active:cursor-grabbing ${
            dragging ? "shadow-2xl ring-4 ring-brand/20" : ""
          }`}
        >
          {!dragging && (
            <span className="aw-ring absolute inset-0 rounded-full bg-brand opacity-40" />
          )}
          <span className={`relative ${dragging ? "aw-held" : "aw-float"}`}>
            <RobotFace size={34} thinking={dragging} />
          </span>
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-paper bg-fit" />
        </button>
      )}

      {/* ---------------- panel ---------------- */}
      {open && (
        <div
          style={{ ...anchor, width: PANEL_W, height: PANEL_H }}
          className={`aw-panel flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-line bg-paper shadow-2xl ${
            dragging ? "ring-4 ring-brand/20" : ""
          }`}
        >
          <header
            onPointerDown={startDrag}
            className="flex cursor-grab items-center gap-2 border-b border-line bg-brand px-3 py-3 text-paper active:cursor-grabbing"
          >
            <GripVertical size={14} className="shrink-0 opacity-50" />

            <RobotFace size={28} thinking={sending} speaking={speaking} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-600 leading-tight">Asha</p>
              <p className="text-xs opacity-80">
                {sending ? "Thinking…" : listening ? "Listening…" : "Your career assistant"}
              </p>
            </div>

            {speechSupported.tts && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleVoice}
                title={voiceOn ? "Voice replies on" : "Voice replies off"}
                className="rounded p-1.5 hover:bg-white/15"
              >
                {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            )}

            <Link
              href="/assistant"
              onPointerDown={(e) => e.stopPropagation()}
              title="Open full assistant"
              className="rounded p-1.5 hover:bg-white/15"
            >
              <Maximize2 size={15} />
            </Link>

            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setOpen(false);
                stopSpeaking();
                setSpeaking(false);
              }}
              title="Minimise"
              className="rounded p-1.5 hover:bg-white/15"
            >
              <Minus size={15} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !locked && (
              <div className="text-center">
                <div className="mx-auto w-fit text-brand">
                  <RobotFace size={44} />
                </div>
                <p className="mt-2 text-sm text-ink">Hi, I am Asha.</p>
                <p className="mt-1 text-xs text-ink-soft">
                  I read your profile before answering, so keep it up to date.
                </p>

                <div className="mt-4 space-y-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      onClick={() => send(starter)}
                      className="block w-full rounded border border-line px-3 py-2 text-left text-xs text-ink-soft hover:bg-shell hover:text-ink"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locked && (
              <div className="rounded border border-locked/30 bg-locked-soft p-3">
                <div className="flex items-start gap-2">
                  <Lock size={15} className="mt-0.5 shrink-0 text-locked" />
                  <div>
                    <p className="text-sm font-600 text-ink">{locked}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      The assistant is on the Basic and Pro plans.
                    </p>
                    <Link
                      href="/pricing"
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-block rounded bg-locked px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90"
                    >
                      See plans
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "flex justify-end" : "flex gap-2"}
              >
                {message.role === "assistant" && (
                  <span className="mt-0.5 shrink-0 text-brand">
                    <RobotFace size={20} />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-card px-3 py-2 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "bg-brand text-paper"
                      : "border border-line bg-shell text-ink"
                  }`}
                >
                  {message.content.split("\n").map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-brand">
                  <RobotFace size={20} thinking />
                </span>
                <div className="flex items-center gap-1 rounded-card border border-line bg-shell px-3 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="aw-dot h-1.5 w-1.5 rounded-full bg-ink-soft"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded border border-alert/30 bg-alert/5 px-3 py-2 text-xs text-alert">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-1.5 border-t border-line px-3 py-2.5"
          >
            {speechSupported.stt && (
              <button
                type="button"
                onClick={startListening}
                disabled={listening || sending}
                title="Speak your question"
                className={`rounded border p-2 ${
                  listening
                    ? "border-alert bg-alert/10 text-alert"
                    : "border-line text-ink-soft hover:bg-shell"
                }`}
              >
                <Mic size={15} />
              </button>
            )}

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening…" : "Ask Asha anything"}
              disabled={sending}
              className="min-w-0 flex-1 rounded border border-line bg-paper px-2.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded bg-brand p-2 text-paper hover:bg-brand-deep disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}