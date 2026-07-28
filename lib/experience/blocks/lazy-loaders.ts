import type {
  ExperienceAdminBlockEditor,
  ExperiencePublicBlockRenderer,
} from "@/lib/experience/definition-types";

/** Typed lazy loaders — breaks circular imports between definitions and UI modules. */
export function lazyPublicBlock<Config>(
  loader: () => Promise<{ [key: string]: ExperiencePublicBlockRenderer<Config> }>,
  exportName: string,
): () => Promise<ExperiencePublicBlockRenderer<Config>> {
  return () =>
    loader().then((module) => {
      const renderer = module[exportName];
      if (!renderer) {
        throw new Error(`Experience public block export missing: ${exportName}`);
      }
      return renderer;
    });
}

export function lazyAdminBlock<Config>(
  loader: () => Promise<{ [key: string]: ExperienceAdminBlockEditor<Config> }>,
  exportName: string,
): () => Promise<ExperienceAdminBlockEditor<Config>> {
  return () =>
    loader().then((module) => {
      const editor = module[exportName];
      if (!editor) {
        throw new Error(`Experience admin block export missing: ${exportName}`);
      }
      return editor;
    });
}
