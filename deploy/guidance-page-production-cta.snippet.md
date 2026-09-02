# Production-only: yellow dashboard journey CTA

Apply manually to **production** `app/portal/student/services/guidance/page.tsx`.
Do not apply this file to the Windows branch.

## Import

```diff
+import { resolveGuidanceJourneyContinueHref } from "@/lib/guidance/journey-entry";
```

## After plan is available (example — adapt to production variable names)

```diff
+  const journeyContinueHref = resolveGuidanceJourneyContinueHref({
+    journeyVersion: plan.journeyVersion,
+    currentStep: plan.currentStep,
+  });
```

## Yellow card CTA (find «ورود به مسیر انتخاب رشته»)

```diff
-  href={`/portal/student/services/guidance/steps/${plan.currentStep}`}
+  href={journeyContinueHref}
```

Or if using `guidanceJourneyStepPath(plan.currentStep)`:

```diff
-  href={guidanceJourneyStepPath(plan.currentStep)}
+  href={journeyContinueHref}
```

Or if pointing at `/ms`:

```diff
-  href="/ms/journey"
+  href={journeyContinueHref}
```

No other lines in this file should change.
