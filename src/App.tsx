import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { PreferencesProvider } from "@/hooks/use-preferences";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import AIChatbox from "./components/AIChatbox";
import FeedbackWidget from "./components/FeedbackWidget";
import ProtectedRoute from "./components/ProtectedRoute";

// Create a single query client instance for the application
const queryClient = new QueryClient();

// Component to conditionally render AI chatbox only on the main dashboard
const ConditionalAIChatbox = () => {
  const location = useLocation();
  // Only show AI chatbox on the main dashboard, not on login or other pages
  const shouldShowChatbox = location.pathname === "/" && !location.pathname.includes("/login");

  return shouldShowChatbox ? <AIChatbox /> : null;
};

const ConditionalFeedbackWidget = () => {
  const location = useLocation();
  const shouldShow = location.pathname === "/";
  return shouldShow ? <FeedbackWidget /> : null;
};

// Main App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PreferencesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ConditionalAIChatbox />
            <ConditionalFeedbackWidget />
          </BrowserRouter>
        </TooltipProvider>
      </PreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;