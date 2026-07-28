import { createElement, type ReactNode } from "react";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import { logExperienceRenderDiagnostic } from "@/lib/experience/public/diagnostics";
import {
  bindingFromPublicRenderContext,
  type ExperiencePublicRenderContext,
} from "@/lib/experience/public/render-context";
import {
  experienceHasRenderableBlocks,
  selectRenderablePublicBlocks,
} from "@/lib/experience/public/select-renderable-blocks";
import {
  isExperienceBlockType,
  loadPublicBlockRenderer,
  type AnyBlockConfig,
  type ExperienceBlockType,
} from "@/lib/experience/registry";
import type {
  LoadedExperienceBlock,
  LoadedExperienceBundle,
} from "@/lib/experience/service/loaders";

export { experienceHasRenderableBlocks };

export type ExperienceRendererProps = {
  bundle: LoadedExperienceBundle;
  context: ExperiencePublicRenderContext;
};

function RegistrationFormUnavailable() {
  return (
    <section
      className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950"
      role="status"
    >
      ثبت‌نام موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.
    </section>
  );
}

async function renderOneBlock(params: {
  block: LoadedExperienceBlock;
  context: ExperiencePublicRenderContext;
  experienceId: string;
  versionId: string;
}): Promise<ReactNode> {
  const { block, context, experienceId, versionId } = params;
  const isRegistrationForm = block.type === REGISTRATION_FORM_BLOCK_TYPE;

  if (!isExperienceBlockType(block.type) || block.config == null) {
    logExperienceRenderDiagnostic({
      category: "UNKNOWN_BLOCK_TYPE",
      message: "Skipped block with unknown type or missing parsed config",
      organizationId: context.organization.id,
      registrationFlowId: context.registrationFlow.id,
      experienceId,
      versionId,
      blockId: block.id,
      blockType: block.type,
    });
    return isRegistrationForm ? <RegistrationFormUnavailable /> : null;
  }

  const type = block.type as ExperienceBlockType;
  const config = block.config as AnyBlockConfig;
  const binding = bindingFromPublicRenderContext(context);

  try {
    const Renderer = await loadPublicBlockRenderer(type);
    return createElement(Renderer as never, {
      config: config as never,
      media: block.media,
      context,
      binding,
    });
  } catch (error) {
    logExperienceRenderDiagnostic({
      category: isRegistrationForm
        ? "REGISTRATION_FORM_UNAVAILABLE"
        : "BLOCK_RENDER_FAILED",
      message:
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Block renderer failed",
      organizationId: context.organization.id,
      registrationFlowId: context.registrationFlow.id,
      experienceId,
      versionId,
      blockId: block.id,
      blockType: block.type,
    });
    return isRegistrationForm ? <RegistrationFormUnavailable /> : null;
  }
}

/**
 * Server-first Experience renderer.
 * Resolves public renderers only through BLOCK_REGISTRY; never renders rawConfig.
 */
export async function ExperienceRenderer({
  bundle,
  context,
}: ExperienceRendererProps) {
  const version = bundle.version;
  if (!version) {
    return null;
  }

  const selected = selectRenderablePublicBlocks(version.blocks, context.now);

  for (const skip of selected.skipped) {
    logExperienceRenderDiagnostic({
      category: "BLOCK_SKIPPED",
      message: "Block filtered from public render",
      organizationId: context.organization.id,
      registrationFlowId: context.registrationFlow.id,
      experienceId: bundle.experience.id,
      versionId: version.id,
      blockId: skip.blockId,
      blockType: skip.blockType,
      reason: skip.reason,
    });
  }

  if (selected.blocks.length === 0) {
    logExperienceRenderDiagnostic({
      category: "NO_RENDERABLE_BLOCKS",
      message: "Published experience has no renderable blocks",
      organizationId: context.organization.id,
      registrationFlowId: context.registrationFlow.id,
      experienceId: bundle.experience.id,
      versionId: version.id,
    });
    return null;
  }

  const nodes: ReactNode[] = [];
  for (const block of selected.blocks) {
    const node = await renderOneBlock({
      block,
      context,
      experienceId: bundle.experience.id,
      versionId: version.id,
    });
    if (node == null) continue;
    nodes.push(
      <div key={block.id} data-experience-block={block.type} data-block-id={block.id}>
        {node}
      </div>,
    );
  }

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-6"
      lang={context.locale}
      dir={context.direction}
      data-experience-id={bundle.experience.id}
      data-experience-version-id={version.id}
    >
      {nodes}
    </div>
  );
}
