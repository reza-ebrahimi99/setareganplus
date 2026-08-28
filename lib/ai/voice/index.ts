/**
 * Voice architecture (feature-flagged, disabled by default).
 */

import { isAiFeatureEnabled } from "@/lib/ai/config";
import type {
  VoicePermissionState,
  VoiceRecognitionController,
  VoiceRecognitionResult,
  VoiceSynthesisOptions,
} from "@/lib/ai/voice/types";

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<{
          isFinal: boolean;
          0?: { transcript: string };
        }>;
        resultIndex: number;
      }) => void)
    | null;
  onerror: (() => void) | null;
};

export function getVoiceSupport(): {
  recognition: boolean;
  synthesis: boolean;
} {
  if (typeof window === "undefined") {
    return { recognition: false, synthesis: false };
  }
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return {
    recognition: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
    synthesis: "speechSynthesis" in window,
  };
}

export function getVoicePermissionState(): VoicePermissionState {
  if (!getVoiceSupport().recognition) return "unsupported";
  return "unknown";
}

export function createVoiceRecognition(
  onResult: (result: VoiceRecognitionResult) => void,
  onError?: (message: string) => void,
): VoiceRecognitionController | null {
  if (!isAiFeatureEnabled("voiceInput") || typeof window === "undefined") {
    return null;
  }

  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onError?.("unsupported");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = "fa-IR";
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const result = event.results[event.resultIndex];
    const transcript = result?.[0]?.transcript;
    if (!transcript) return;
    onResult({ transcript, isFinal: Boolean(result?.isFinal) });
  };
  recognition.onerror = () => onError?.("recognition_error");

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

export function speakText(options: VoiceSynthesisOptions): boolean {
  if (!isAiFeatureEnabled("voiceOutput") || typeof window === "undefined") {
    return false;
  }
  if (!("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.lang = options.lang ?? "fa-IR";
  utterance.rate = options.rate ?? 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
