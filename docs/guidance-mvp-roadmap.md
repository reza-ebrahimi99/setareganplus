# Guidance ERP — MVP Roadmap

Active product roadmap for Guidance ERP. **No AI in the MVP.**

AI Career Advisor, rank prediction, university/scholarship matching, AI insights,
AI recommendations, AI chat, and academic-risk prediction are **out of scope**.
They may exist only as internal architecture comments or future docs — never in
student-facing UI.

## MVP workflow

1. Pre-registration  
2. Transcript Upload  
3. Initial Analysis (rule-based only)  
4. Interest Assessment  
5. Student 360 Profile  
6. پرونده آماده بررسی  
7. Session Booking  
8. Counselor Review  
9. Counselor Session  
10. Final Guidance Package  

## Phase map (implemented → next)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0–4 | Foundation, portal journey, grades upload UX | Done |
| 5 | Initial Analysis Center (rule-based) | Done |
| 6 | Interest Discovery Center | Done |
| 7 | Student 360° Profile | Done |
| **8** | **Counselor Review Center** | Done |
| **8.1** | **Professional Counselor Workspace Phase 1** (read-only 12-step dossier) | **This phase** |
| 9+ | Workspace edit / per-step approve / PDF compare / reports | Later |

## Phase 8 focus

Counselor Review Center (staff/admin):

- Assigned / org student queue with filters  
- Open case: transcript, initial analysis, interest, 360 profile  
- Verify transcript · notes · request corrections · Ready for Session  
- Internal status timeline · activity log  

Constraints: no AI, no rank prediction, no recommendation engine, no schema
redesign unless required, reuse GuidancePlan architecture, Portal OS–inspired
premium RTL under Admin shell, Server Components first.
