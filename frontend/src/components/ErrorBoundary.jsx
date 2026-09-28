import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-3">Something went wrong</h1>
            <p className="text-slate-500 mb-8">
              The page could not be displayed due to an unexpected error.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={() => window.location.href = '/reports'}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Go to Reports
              </button>
              <Link
                to="/"
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Home className="w-4 h-4" /> Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
