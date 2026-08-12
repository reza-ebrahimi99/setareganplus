export type AiPluginPermission =
  | "read:public"
  | "read:student"
  | "write:registration"
  | "write:crm"
  | "read:calendar"
  | "write:attendance"
  | "read:courses"
  | "read:gallery"
  | "read:forms"
  | "write:payments"
  | "read:teachers"
  | "read:school"
  | "write:notifications"
  | "write:admissions";

export type AiPluginMetadata = {
  version: string;
  category: string;
  risky?: boolean;
};

export type AiPluginContext = {
  sessionId?: string;
  conversationId?: string;
  pathname?: string;
  locale?: "fa";
};

export type AiPluginResult = {
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

export type AiPlugin = {
  id: string;
  description: string;
  permissions: readonly AiPluginPermission[];
  metadata: AiPluginMetadata;
  validate: (input: Record<string, unknown>) => boolean;
  execute: (
    input: Record<string, unknown>,
    context: AiPluginContext,
  ) => Promise<AiPluginResult>;
};
