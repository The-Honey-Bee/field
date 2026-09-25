import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './services/serviceWorkerRegistration';

// Resilient network error boundary preventing transient background fetch rejections from crashing the app
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('Load failed') ||
      msg.includes('NetworkError') ||
      msg.includes('Network request failed') ||
      msg.includes('AbortError')
    ) {
      console.warn('[Network Resilience] Caught background network error:', msg);
      event.preventDefault();
    }
  });
}

// Register PWA service worker for offline asset and data caching
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
