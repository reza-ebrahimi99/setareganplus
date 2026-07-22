"use client";

type Step = {
  id: number;
  label: string;
};

type RegistrationStepperProps = {
  steps: readonly Step[];
  currentStep: number;
};

export function RegistrationStepper({
  steps,
  currentStep,
}: RegistrationStepperProps) {
  return (
    <nav aria-label="مراحل ثبت‌نام" className="mb-6 sm:mb-8">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1 sm:gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div
                className={[
                  "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-all duration-300 sm:px-2",
                  isActive ? "bg-primary/8" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    isDone
                      ? "bg-primary text-white"
                      : isActive
                        ? "bg-primary text-white shadow-sm ring-4 ring-primary/15"
                        : "bg-slate-100 text-muted",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? "✓" : step.id}
                </span>
                <span
                  className={[
                    "max-w-full truncate text-center text-[11px] font-medium sm:text-xs",
                    isActive || isDone ? "text-primary" : "text-muted",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={[
                    "mb-5 h-0.5 w-3 shrink-0 rounded-full transition-colors duration-300 sm:w-6",
                    isDone ? "bg-primary/50" : "bg-border",
                  ].join(" ")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
