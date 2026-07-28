export type {
  BlockCapabilities,
  BlockDefinition,
  ConfigParseResult,
  ExperienceAdminBlockEditor,
  ExperienceAdminBlockEditorProps,
  ExperiencePublicBlockRenderer,
  ExperiencePublicBlockRendererProps,
} from "@/lib/experience/definition-types";

export type { ExperienceBindingContext } from "@/lib/experience/binding-context";
export type {
  BlockMediaLinkInput,
  BlockMediaMap,
  BlockMediaRole,
  ResolvedBlockMedia,
} from "@/lib/experience/media-types";

export {
  BLOCK_REGISTRY,
  BLOCK_TYPE_OPTIONS,
  adminEditorChromeFromRegistry,
  getBlockDefinition,
  getDefaultBlockConfig,
  isExperienceBlockType,
  loadAdminBlockEditor,
  loadPublicBlockRenderer,
  type AnyBlockConfig,
  type AnyBlockDefinition,
  type BlockConfigByType,
  type ExperienceBlockType,
} from "@/lib/experience/registry";

export {
  parseExperienceBlockConfig,
  parseExperienceBlockConfigFromRow,
} from "@/lib/experience/parse-block-config";

export { extractMediaLinksForRoles } from "@/lib/experience/media-types";

export * from "@/lib/experience/service";

export type { ExperiencePublicRenderContext } from "@/lib/experience/public/render-context";
export {
  bindingFromPublicRenderContext,
  buildExperiencePublicRenderContext,
} from "@/lib/experience/public/render-context";
export {
  isBlockPubliclyVisible,
  sortBlocksDeterministically,
} from "@/lib/experience/public/block-visibility";
export {
  experienceHasRenderableBlocks,
  selectRenderablePublicBlocks,
} from "@/lib/experience/public/select-renderable-blocks";
