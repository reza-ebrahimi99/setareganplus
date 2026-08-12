export type AiStreamEventType =
  | "token"
  | "message_start"
  | "message_end"
  | "error"
  | "done";

export type AiStreamEvent = {
  type: AiStreamEventType;
  data?: string;
  error?: string;
};

export type AiStreamHandlers = {
  onEvent?: (event: AiStreamEvent) => void;
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
};
