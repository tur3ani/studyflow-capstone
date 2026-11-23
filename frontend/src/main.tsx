import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AiPreferencesProvider } from './context/AiPreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AiPreferencesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AiPreferencesProvider>
    </ThemeProvider>
  </StrictMode>
);
