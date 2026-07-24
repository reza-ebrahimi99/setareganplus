# Registration Metadata Contract (v1)

Schema version: `1`  
Storage: `Registration.metadata` (JSON). Legacy rows without `schemaVersion` parse as v1.

## Parsers (use these — never parse raw JSON in UI)

| Block | Parser | Writer |
|-------|--------|--------|
| Attribution | `parseAttributionFromUnknown` / `sanitizeClientAttribution` | `attributionToMetadataPatch` |
| Lead link | `parseLeadLinkFromMetadata` | `leadLinkToMetadataPatch` / `buildLeadLinkSnapshot` |
| Applied promotions | `parseAppliedPromotionsFromMetadata` | `appliedPromotionsMetadata` |

## `metadata.attribution`

```ts
{
  schemaVersion: 1,
  acquisitionSource: "utm" | "referral" | "qr" | "manual" | "direct",
  acquisitionMedium: string | null,
  campaign: string | null,
  referralCode: string | null,
  referralOwner: string | null,      // server-resolved only
  referralLink: string | null,
  referralCampaign: string | null,
  qrCampaign: string | null,
  qrIdentifier: string | null,
  qrOwner: string | null,            // stripped from client
  utmSource / utmMedium / utmCampaign / utmContent / utmTerm,
  landingPage: string | null,
  firstVisitAt: string | null,       // ISO
  manualSource: string | null,
  extensions?: Record<string, …>
}
```

Flat mirrors (report convenience): same keys at metadata root via `toRegistrationAttributionFlat`.

## `metadata.leadLink`

```ts
{
  schemaVersion: 1,
  leadId, leadOwnerId, leadOwnerName,
  pipelineId, pipelineName,
  stageId, stageName,
  leadSource, leadSourceType,
  assignedStaffId, assignedStaffName,
  matchedBy: "leadId" | "mobile" | "nationalCode" | "email" | "created",
  linkedAt: ISO string
}
```

Built only server-side. Client cannot supply `leadLink`.

## `metadata.appliedPromotions`

Array of:

```ts
{
  promotionId, title, code, type,
  discountAmountRials, virtual?, ownerStaffId?
}
```

Also versioned bag:

```ts
appliedPromotionsBag: {
  schemaVersion: 1,
  items: [...],
  referralPromotionId, referralOwnerStaffId
}
```

## Registration stage mapping

`Organization.settings.registrationStageMapping`:

- `registrationStarted` → default `qualified`
- `paymentPending` → default `decision`
- `registrationCompleted` → default `won`
- `registrationCancelled` → default `null` (no-op)

Missing stage codes log a warning; registration/payment still succeed.

## Compatibility

- Unversioned metadata still parses.
- New writers always stamp `schemaVersion: 1`.
- Do not display raw JSON to operators.
