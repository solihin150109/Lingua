import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          friendlyMessage = `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path || 'database'})`;
        }
      } catch {
        // Not a JSON FirestoreErrorInfo
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-[#0F1722] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#243447] dark:text-slate-100">
              Something needs attention
            </h2>
            <p className="text-sm text-[#718096] dark:text-slate-300 leading-relaxed">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-[#243B53] text-white rounded-lg hover:bg-[#1B2D40] transition-colors"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
