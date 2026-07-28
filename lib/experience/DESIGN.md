# Flow Experience Builder — Frozen design

## Registry (single source of truth)

- **`BLOCK_REGISTRY`** in `lib/experience/registry.ts` is the only source for block type allowlist, Persian labels, descriptions, capability flags, default config, parsers, media roles, duplication, and lazy-loaded public/admin UI.
- **`ExperienceBlock.type`** remains a `string` in PostgreSQL. Never branch on raw type strings outside the registry; use `isExperienceBlockType`, `getBlockDefinition`, and `parseExperienceBlockConfig`.
- Do not duplicate labels, parsers, or renderer maps in admin pages, public pages, or actions.
- Each block lives in `lib/experience/blocks/<name>.ts` as a self-contained `*BlockDefinition` with strongly typed config.
- **No placeholder definitions.** Every registry entry must ship complete `parseConfig`, `defaultConfig`, capabilities, `mediaRoles`, and `duplicateConfig`. Admin/public UI may temporarily render `BlockAdminNotYetImplemented` / a public stub, but definition metadata and validation are never stubs.
- Public renderers and admin editors are referenced only via `loadPublicRenderer` / `loadAdminEditor` on the definition (dynamic import). Pass `labelFa` / `descriptionFa` into admin editors from the registry — do not hardcode them in editor modules.
- Shared utilities (`parse-utils`, `cta-button`) are not metadata sources.

## Document model

`Experience` → `ExperienceVersion` → `ExperienceBlock` → `ExperienceBlockMedia`

- `Experience.templateKey` — internal preset id.
- `ExperiencePurpose` — LANDING, SUCCESS, PAYMENT_PENDING, WAITING_APPROVAL, DOWNLOAD, BOOKING, CUSTOM.
- Dynamic blocks use `ExperienceBindingContext` at render time; forbidden keys are rejected in parsers.

## BlockDefinition capabilities (frozen)

`supportsVisibility`, `supportsScheduling`, `supportsAnimation`, `supportsTheme`, `supportsBindings`

## Version lifecycle

FormVersion-style publish: one draft, promote to published, supersede prior, clone new draft, `publishedVersionId` on `Experience`.

## Website Page Builder

Unchanged in Sprint A. Experience blocks may reuse section renderers internally; website `SECTION_REGISTRY` is not duplicated.
