"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Production hardening — isolate assistant runtime errors from the host page.
 */
export class AiErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally quiet in UI; host page continues.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="fixed bottom-5 start-5 z-[70] rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted shadow-sm">
            دستیار هوشمند موقتاً در دسترس نیست.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
