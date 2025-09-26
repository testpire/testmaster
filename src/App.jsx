import React, { Component, useEffect } from "react";
import Routes from "./Routes";
import { AuthProvider } from './contexts/AuthContext';

// Global Error Boundary Component
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Global Error Boundary caught error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We're working to fix this issue. Please try refreshing the page.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login-screen';
                }}
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Data & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error listener setup
const GlobalErrorSetup = ({ children }) => {
  useEffect(() => {
    // Global unhandled error listener
    const handleError = (event) => {
      console.error('🚨 Unhandled global error:', event.error);
      
      // Don't crash the app for auth redirects
      if (event.error?.isAuthRedirect ||
          event.error?.message?.includes('Authentication required')) {
        console.log('🔒 Auth error handled by API client, preventing crash');
        event.preventDefault();
        return;
      }
      
      // Don't crash the app for network errors
      if (event.error?.message?.includes('fetch') || 
          event.error?.message?.includes('Network')) {
        event.preventDefault();
      }
    };

    const handlePromiseRejection = (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      
      // Don't crash the app for auth redirects
      if (event.reason?.isAuthRedirect ||
          event.reason?.response?.status === 401 ||
          event.reason?.response?.status === 403) {
        console.log('🔒 Auth rejection handled by API client, preventing crash');
        event.preventDefault();
        return;
      }
      
      // Don't crash the app for API errors
      if (event.reason?.message?.includes('Request failed') ||
          event.reason?.message?.includes('Network Error')) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  return children;
};

function App() {
  // Production version with comprehensive error handling
  console.log('🎆 TestMaster App starting with bulletproof error handling...');

  return (
    <GlobalErrorBoundary>
      <GlobalErrorSetup>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </GlobalErrorSetup>
    </GlobalErrorBoundary>
  );
}

export default App;