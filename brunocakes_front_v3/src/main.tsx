
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppThemeProvider } from "./components/AppThemeProvider.tsx";
import { DynamicMetadata } from "./components/DynamicMetadata.tsx";
import "./index.css";

// Register Service Worker for PWA (disabled in development)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrado');
    } catch (error) {
      console.log('❌ Falha ao registrar Service Worker', error);
    }
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Unregister any existing service workers in development
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <AppThemeProvider>
    <DynamicMetadata />
    <App />
  </AppThemeProvider>
);  