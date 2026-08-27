# 13 — Open Questions

Answer or defer **before** production code.

[Index](./README.md) · Previous: [Roadmap](./12-roadmap-migration-risks.md)

| ID | Question | Recommendation | Default if silent |
|----|----------|----------------|-------------------|
| Q1 | Evolve `/portal` vs new `/app` host? | Evolve `/portal` | `/portal` |
| Q2 | Third cookie for partners? | No; role switcher | Same portal cookie |
| Q3 | Force login on existing `/book` and `/forms`? | Flag, default off until dual-run | off |
| Q4 | Auto ExperienceRoleGrant from `SystemRole.TEACHER`? | Manual/staff confirm | no auto |
| Q5 | One wallet with Book ERP? | Yes | Shared `(org,userId)` |
| Q6 | Show student names on teacher panel? | Default false | false |
| Q7 | Hub permission key vs reuse `portal.*.access`? | Reuse first, add `sxp.hub.access` later if needed | reuse |
| Q8 | School invite students self-serve? | Request queue for staff | no instant Student row |
| Q9 | Messages (threads) in v1? | No; notifications only | notifications |
| Q10 | Duplicate User rows (same human, two mobiles)? | Manual merge tool later | no auto-merge |
| Q11 | Implementation base | `origin/master` | master |
| Q12 | Public self-signup | Off unless referral token + flag | `sxp.publicSignup=false` |
| Q13 | Shared outbox `PROCESSED` vs Engine inbox? | **Inbox per handler** | Inbox |
| Q14 | May S1 Hub query booking tables before events are complete? | One-time backfill only | Backfill then events |

---

## Out of scope until a later pack

NextAuth · rewriting CRM/booking/auth · native apps · AI auto-purchase · cash wallet payout · Prisma/UI in **this** documentation cycle.

---

## Approval language

> Approved to implement SXP Phase S1 (Experience Engine v0) from `docs/architecture/student-experience-platform/` on `master`.

Until that exists, **do not** generate Prisma, migrations, routes, pages, or components.

---

READY FOR IMPLEMENTATION

Architecture pack is complete and waiting for **explicit** implementation approval. Not a green light to write production code.
