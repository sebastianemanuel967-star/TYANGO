import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Global error handler for debugging "blank screen" issues
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #111; color: #ff5252; font-family: sans-serif; height: 100vh;">
        <h1 style="font-size: 20px; margin-bottom: 10px;">⚠️ Error de Aplicación</h1>
        <pre style="white-space: pre-wrap; font-size: 12px; background: #000; padding: 15px; border-radius: 10px; border: 1px solid #333;">
${message}
${source}:${lineno}:${colno}
${error?.stack || ''}
        </pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #9333ea; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reintentar Cargar
        </button>
      </div>
    `;
  }
};
