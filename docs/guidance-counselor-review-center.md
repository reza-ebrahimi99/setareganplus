# Guidance ERP Phase 8 — Counselor Review Center

Staff/admin review desk for Guidance cases. **No AI.**

## Routes

- `/admin/guidance` — student case queue + filters  
- `/admin/guidance/[publicId]` — case detail  
- `/admin/guidance/[publicId]/documents/[documentId]/download` — private transcript

## Capabilities

- Queue filters: all / awaiting / in review / needs correction / ready for session / pending transcript  
- Open case: transcript, Initial Analysis summary, Interest status, 360 profile summary  
- Verify / reject transcript (existing `GuidanceDocument.verificationStatus`)  
- Counselor notes · request corrections · mark Ready for Session  
- Internal status timeline · activity log  

## Storage

- Case notes/status/activity: MediaAsset JSON (`guidance-counselor-case`) — **no GuidancePlan schema change**  
- Transcript verification: existing document fields  

## Permissions

- `guidance.view` · `guidance.review` (ADVISOR, admissions roles, org admins)
