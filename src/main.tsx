import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'
import './index.css'
import { GOOGLE_CLIENT_ID, isGoogleOAuthEnabled } from './config/google-oauth'

// Get the root DOM element where the app will be mounted
const rootElement = document.getElementById("root");

// Create and render the React root
if (rootElement) {
  // Conditionally wrap with GoogleOAuthProvider only if Client ID is configured
  if (isGoogleOAuthEnabled()) {
    createRoot(rootElement).render(
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    );
  } else {
    // Fallback: render without Google OAuth if no Client ID
    createRoot(rootElement).render(<App />);
  }
} else {
  console.error("Failed to find the root element");
}