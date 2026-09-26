export interface VoiceOption {
  name: string;
  lang: string;
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  // Known female voices across Windows, Chrome and Android
  const femaleHints = [
    "female",
    "zira",
    "heera",
    "swara",
    "kalpana",
    "aria",
    "jenny",
    "samantha",
    "google uk english female",
    "google us english",
    "veena",
    "raveena",
    "nicky",
    "karen",
    "moira",
    "tessa",
  ];

  if (femaleHints.some((hint) => name.includes(hint))) score += 10;

  // Prefer Indian English, then any English
  if (voice.lang === "en-IN") score += 6;
  else if (voice.lang.startsWith("en")) score += 3;

  if (voice.localService) score += 1;

  return score;
}

export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  return pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

export function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  onEnd?: () => void
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  // Strip markdown so it is not read aloud
  const clean = text
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  const utterance = new SpeechSynthesisUtterance(clean);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.98;
  utterance.pitch = 1.05;
  utterance.lang = voice?.lang ?? "en-IN";
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/* ---- Speech recognition ---- */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function createRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;

  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;

  if (!Ctor) return null;

  const recognizer = new Ctor();
  recognizer.lang = "en-IN";
  recognizer.continuous = false;
  recognizer.interimResults = false;

  return recognizer;
}

export const speechSupported = {
  get tts(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },
  get stt(): boolean {
    if (typeof window === "undefined") return false;
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  },
};