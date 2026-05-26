import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="legacy-error-boundary">
          <div className="legacy-error-boundary-icon">⚠</div>
          <div className="legacy-error-boundary-title">Something went wrong</div>
          <div className="legacy-error-boundary-detail">{this.state.error?.message ?? "An unexpected error occurred."}</div>
          <button className="legacy-task-status-button" onClick={() => this.setState({ hasError: false, error: null })} type="button">Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
