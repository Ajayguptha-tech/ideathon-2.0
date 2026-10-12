import { createRoot } from 'react-dom/client';
import '@fontsource/orbitron/600.css';
import '@fontsource/orbitron/800.css';
import '@fontsource-variable/inter';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
