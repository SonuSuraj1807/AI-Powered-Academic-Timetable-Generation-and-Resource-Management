/**
 * ErrorBoundary — Catches render errors and displays a retry-able fallback UI.
 */
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'var(--danger-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>
            Something went wrong
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button onClick={this.handleRetry} className="btn btn-primary">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
