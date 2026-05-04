import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let details = this.state.error?.message || "";

      // Check if it's a Firestore error JSON
      try {
        if (details.startsWith('{') && details.endsWith('}')) {
          const errInfo = JSON.parse(details);
          if (errInfo.operationType) {
            errorMessage = `Database Error during ${errInfo.operationType}`;
            details = errInfo.error;
          }
        }
      } catch (e) {
        // Not a JSON error, keep defaults
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left overflow-auto max-h-40">
              <code className="text-xs text-red-600 break-all">{details}</code>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
