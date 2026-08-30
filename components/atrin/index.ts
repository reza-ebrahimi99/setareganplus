/**
 * Public Atrin surface exports.
 * Keep this barrel light — do NOT re-export education/curriculum/evaluation
 * engines here (they bloat the public layout client graph).
 */
export { AtrinAssistant } from "@/components/atrin/AtrinAssistant";
export { AtrinLauncher } from "@/components/atrin/AtrinLauncher";
export { AtrinPanel } from "@/components/atrin/AtrinPanel";
export { AtrinEmbeddedChat } from "@/components/atrin/AtrinEmbeddedChat";
export { AtrinMark } from "@/components/atrin/AtrinMark";
export * from "@/components/atrin/ui";
export * from "@/components/atrin/os";
