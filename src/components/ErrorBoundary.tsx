import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-navy px-4 text-center text-slate-200">
          <div className="glass max-w-lg p-8 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <AlertTriangle size={32} />
            </div>
            <p className="eyebrow justify-center">Young Innovators Club</p>
            <h2 className="mb-2 mt-2 text-2xl font-bold text-white">IDEATHON 2026</h2>
            <p className="text-sm text-slate-300">
              An unexpected display issue occurred while initializing the visual experience.
            </p>
            {this.state.error && (
              <p className="mt-4 rounded bg-black/40 p-3 font-mono text-xs text-red-300 text-left overflow-x-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="btn-p flex items-center gap-2 text-sm"
              >
                <RotateCcw size={16} /> Reload Experience
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
