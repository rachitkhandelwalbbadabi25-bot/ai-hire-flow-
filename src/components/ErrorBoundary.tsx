import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };
  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--hf-bg)] text-[var(--hf-text)] flex items-center justify-center p-6">
          <div className="max-w-lg w-full hf-card p-8 text-center space-y-5">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertCircle className="w-6 h-6 text-[var(--hf-error)]" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-[var(--hf-text)] tracking-tight mb-1.5">
                Something went wrong
              </h1>
              <p className="text-[var(--hf-text-secondary)] text-xs sm:text-sm leading-relaxed">
                An unexpected application error occurred while rendering this view. Refresh the page to continue.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[var(--hf-surface-secondary)] border border-[var(--hf-border)] rounded-lg p-3.5 text-left font-mono">
                <p className="text-[var(--hf-error)] text-xs overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="hf-btn-primary flex-1 py-2.5 text-xs gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reload workspace
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="hf-btn-secondary flex-1 py-2.5 text-xs"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
