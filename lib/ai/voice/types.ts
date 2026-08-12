export type VoicePermissionState = "unknown" | "granted" | "denied" | "unsupported";

export type VoiceRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

export type VoiceRecognitionController = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type VoiceSynthesisOptions = {
  text: string;
  lang?: string;
  rate?: number;
};
