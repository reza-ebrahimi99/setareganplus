/**
 * Block registry contracts — single source of truth for block shape.
 */

import type { ReactNode } from "react";
import type { ExperienceBindingContext } from "@/lib/experience/binding-context";
import type { BlockMediaLinkInput, BlockMediaMap, BlockMediaRole } from "@/lib/experience/media-types";

export type ConfigParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type BlockCapabilities = {
  supportsVisibility: boolean;
  supportsScheduling: boolean;
  supportsAnimation: boolean;
  supportsTheme: boolean;
  supportsBindings: boolean;
};

/**
 * One self-contained block definition. All metadata, parsing, and UI resolution
 * live on this object — do not duplicate labels or parsers elsewhere.
 */
export type BlockDefinition<Type extends string, Config> = {
  readonly type: Type;
  readonly labelFa: string;
  readonly descriptionFa: string;
  readonly configVersion: 1;
  readonly capabilities: BlockCapabilities;
  readonly defaultConfig: Config;
  readonly mediaRoles: readonly BlockMediaRole[];
  parseConfig: (raw: unknown) => ConfigParseResult<Config>;
  duplicateConfig: (config: Config) => Config;
  extractMediaLinks: (
    formMedia: Partial<Record<BlockMediaRole, string | null>>,
  ) => BlockMediaLinkInput[];
  /**
   * Server-safe lazy load of the public RSC renderer for this block type.
   * Resolved only through getPublicBlockRenderer(type).
   */
  loadPublicRenderer: () => Promise<ExperiencePublicBlockRenderer<Config>>;
  /**
   * Lazy load of the admin settings panel for this block type.
   * Resolved only through getAdminBlockEditor(type).
   */
  loadAdminEditor: () => Promise<ExperienceAdminBlockEditor<Config>>;
};

export type ExperiencePublicBlockRendererProps<Config> = {
  config: Config;
  media: BlockMediaMap;
  binding?: ExperienceBindingContext;
};

export type ExperiencePublicBlockRenderer<Config> = (
  props: ExperiencePublicBlockRendererProps<Config>,
) => ReactNode;

export type ExperienceAdminBlockEditorProps<Config> = {
  /** From BLOCK_REGISTRY — never hardcode in the editor module. */
  labelFa: string;
  descriptionFa: string;
  config: Config;
  fieldErrors: Partial<Record<string, string>>;
  disabled?: boolean;
};

export type ExperienceAdminBlockEditor<Config> = (
  props: ExperienceAdminBlockEditorProps<Config>,
) => ReactNode;
