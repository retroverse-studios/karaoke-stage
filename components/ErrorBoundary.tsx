/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Prevents the entire app from crashing due to errors in one section.
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI to show when an error occurs */
  fallback?: React.ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional title for the error message */
  title?: string;
  /** Optional action button text */
  actionText?: string;
  /** Optional action to perform (e.g., retry, go back) */
  onAction?: () => void;
  /** Use dark theme styling */
  isDark?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onAction?.();
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { 
      children, 
      fallback, 
      title = 'Something went wrong', 
      actionText = 'Try Again',
      onAction,
      isDark = true 
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className={`flex flex-col items-center justify-center p-8 rounded-2xl ${
          isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="text-4xl mb-4">😵</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
            {title}
          </h2>
          <p className={`text-sm mb-4 text-center max-w-md ${isDark ? 'text-red-300/70' : 'text-red-600'}`}>
            {error?.message || 'An unexpected error occurred'}
          </p>
          {onAction && (
            <button
              onClick={this.handleReset}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${
                isDark 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {actionText}
            </button>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
