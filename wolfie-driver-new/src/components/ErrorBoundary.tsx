import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary - ${this.props.context || 'App'}] Caught error:`, error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-2 font-mono uppercase">
            System Interrupted
          </h2>
          
          <p className="text-sm text-neutral-400 max-w-xs mb-6 leading-relaxed">
            {this.props.context ? `An issue occurred in ${this.props.context}.` : 'An unexpected interface error occurred.'} Please reload to restore connection.
          </p>

          {this.state.error?.message && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 mb-6 max-w-sm w-full overflow-hidden text-left">
              <p className="text-[11px] font-mono text-red-400 truncate">
                {this.state.error.message}
              </p>
            </div>
          )}

          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-red-600/20 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
