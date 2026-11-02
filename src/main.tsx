import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/admin-tabler.css';
import { api } from './services/api.ts';

// Global error handler & unhandled rejection listener for automated system diagnostics
window.addEventListener('error', (event) => {
  const message = event.message || 'خطای فرانت‌اند و رندرینگ مرورگر';
  const source = event.filename ? `${event.filename}:${event.lineno}` : '';
  api.reportDiagnosticLog({
    level: 'error',
    category: 'client',
    message: `[UI Exception] ${message}`,
    details: { source, colno: event.colno, stack: event.error?.stack }
  }).catch(() => {});
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || 'Unhandled Promise Rejection');
  api.reportDiagnosticLog({
    level: 'warn',
    category: 'client',
    message: `[Unhandled Promise] ${reason}`,
    details: { stack: event.reason?.stack }
  }).catch(() => {});
});

// Automatically unregister stale Service Workers and clear caches to force fresh app load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);

