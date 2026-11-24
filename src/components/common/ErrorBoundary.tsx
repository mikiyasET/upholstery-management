import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button } from '@mantine/core';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp, WifiOff } from 'lucide-react';
import i18n from '../../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  isRoot?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /loading chunk/i.test(this.state.error?.message || '') ||
        /failed to fetch dynamically imported module/i.test(this.state.error?.message || '') ||
        /dynamically imported module/i.test(this.state.error?.message || '');

      const title = isChunkError
        ? i18n.t('errors.connectionIssue', 'Network Connection Issue')
        : i18n.t('errors.pageLoadFailed', 'Something went wrong');

      const message = isChunkError
        ? i18n.t(
            'errors.connectionIssueMessage',
            'Unable to load page content due to a slow or dropped connection. Please check your network and try again.'
          )
        : i18n.t(
            'errors.pageLoadFailedMessage',
            'An unexpected error occurred while rendering this page. Please try refreshing or retrying.'
          );

      return (
        <Box
          className={`flex items-center justify-center p-6 ${
            this.props.isRoot ? 'min-h-screen bg-background' : 'min-h-[420px] w-full'
          }`}
        >
          <div className="max-w-md w-full bg-card rounded-2xl border border-border/80 shadow-md p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Visual Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
              {isChunkError ? (
                <WifiOff className="w-8 h-8 animate-pulse text-amber-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2">
              <Button
                variant="outline"
                color="gray"
                size="sm"
                leftSection={<RotateCcw className="w-4 h-4" />}
                onClick={this.handleReset}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                {i18n.t('errors.tryAgain', 'Try Again')}
              </Button>
              <Button
                variant="filled"
                color="amber"
                size="sm"
                leftSection={<RefreshCw className="w-4 h-4" />}
                onClick={this.handleReload}
                className="h-10 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow-xs"
              >
                {i18n.t('errors.reloadPage', 'Reload Page')}
              </Button>
            </div>

            {/* Collapsible Error Trace for Troubleshooting */}
            {this.state.error && (
              <div className="pt-2 text-left border-t border-border/60">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="w-full text-[11px] text-muted-foreground/80 hover:text-foreground flex items-center justify-between py-1 transition-colors"
                >
                  <span>{i18n.t('errors.technicalDetails', 'Technical Details')}</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {this.state.showDetails && (
                  <div className="mt-2 p-3 rounded-lg bg-muted text-[11px] font-mono text-rose-400 overflow-x-auto max-h-36 scrollbar-thin">
                    <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-1.5 text-[10px] text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
