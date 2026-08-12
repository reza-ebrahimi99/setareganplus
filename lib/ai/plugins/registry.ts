import type { AiPlugin } from "@/lib/ai/plugins/types";

const registry = new Map<string, AiPlugin>();

export function registerAiPlugin(plugin: AiPlugin): void {
  registry.set(plugin.id, plugin);
}

export function getAiPlugin(id: string): AiPlugin | undefined {
  return registry.get(id);
}

export function listAiPlugins(): AiPlugin[] {
  return [...registry.values()];
}

function stubPlugin(
  id: string,
  description: string,
  category: string,
  permissions: AiPlugin["permissions"],
): AiPlugin {
  return {
    id,
    description,
    permissions,
    metadata: { version: "0.0.0", category, risky: false },
    validate: () => true,
    async execute() {
      return {
        ok: false,
        message: `Plugin «${id}» is architecture-only and not connected to backends yet.`,
      };
    },
  };
}

/** Register architecture stubs once (no backend calls). */
export function ensureDefaultAiPluginsRegistered(): void {
  if (registry.size > 0) return;

  const stubs: Array<[string, string, string, AiPlugin["permissions"]]> = [
    ["registration", "Registration guidance & intake tools", "admissions", ["write:registration", "read:public"]],
    ["crm", "CRM lead tools", "crm", ["write:crm"]],
    ["calendar", "Calendar availability tools", "calendar", ["read:calendar"]],
    ["attendance", "Attendance tools", "school", ["write:attendance"]],
    ["courses", "Courses catalog tools", "education", ["read:courses"]],
    ["gallery", "Gallery tools", "content", ["read:gallery"]],
    ["forms", "Public forms tools", "forms", ["read:forms"]],
    ["payments", "Payment tools", "commerce", ["write:payments"]],
    ["students", "Student directory tools", "school", ["read:student"]],
    ["teachers", "Teachers directory tools", "school", ["read:teachers"]],
    ["school", "School operations tools", "school", ["read:school"]],
    ["notifications", "Notification tools", "comms", ["write:notifications"]],
    ["admissions", "Admissions pipeline tools", "admissions", ["write:admissions"]],
  ];

  for (const [id, description, category, permissions] of stubs) {
    registerAiPlugin(stubPlugin(id, description, category, permissions));
  }
}
