// frontend/src/components/ErrorBoundary.jsx
// React Error Boundary — catches unhandled rendering errors in the component tree.
// Prevents a single broken widget from crashing the entire application.
//
// Usage:
//   <ErrorBoundary>
//     <SomeComponent />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<CustomFallback />} onError={logToSentry}>
//     <SomeComponent />
//   </ErrorBoundary>

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:  false,
      error:     null,
      errorInfo: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  // Called when a descendant throws during rendering or lifecycle methods.
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called after the error has been captured — good place to log to an error service.
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Optional external reporter (e.g. Sentry, LogRocket) injected via props
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }

    // Always log to console for dev visibility
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught rendering error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Allow a fully custom fallback UI if provided via props
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, errorInfo } = this.state;
    const isDev = process.env.NODE_ENV !== 'production';

    // ── Default MediChain fallback UI ─────────────────────────────────────────
    return (
      <div
        className="min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl
                   bg-red-50 border border-red-200 text-center"
        role="alert"
        aria-live="assertive"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-lg font-bold text-red-700 mb-1">Something went wrong</h2>
        <p className="text-sm text-red-600 mb-4 max-w-md">
          An unexpected error occurred in this section.
          Your data is safe — please try refreshing or click the button below.
        </p>

        {/* Reset button */}
        <button
          onClick={this.handleReset}
          className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm
                     font-semibold transition-colors focus:outline-none focus:ring-2
                     focus:ring-red-500 focus:ring-offset-2"
        >
          Try Again
        </button>

        {/* Dev-only stack trace */}
        {isDev && error && (
          <details className="mt-6 text-left w-full max-w-2xl">
            <summary className="text-xs text-red-500 cursor-pointer hover:underline mb-2">
              Developer Details (dev only)
            </summary>
            <pre className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-lg
                            p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {error.toString()}
              {errorInfo?.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
