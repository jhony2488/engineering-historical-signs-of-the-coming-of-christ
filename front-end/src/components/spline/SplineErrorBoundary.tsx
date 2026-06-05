"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface SplineErrorBoundaryProps {
  children: ReactNode;
  onError?: () => void;
}

interface SplineErrorBoundaryState {
  hasError: boolean;
}

export class SplineErrorBoundary extends Component<
  SplineErrorBoundaryProps,
  SplineErrorBoundaryState
> {
  state: SplineErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SplineErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Spline] Falha ao carregar cena:", error.message, info.componentStack);
    }
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
