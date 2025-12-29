import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
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
  // Theme provider for dark/light mode support
  <ThemeProvider defaultTheme="light" storageKey="salespluse-ui-theme">
    {/* React Query client provider for data fetching and caching */}
    <QueryClientProvider client={queryClient}>
      {/* Authentication provider for user authentication state */}
      <AuthProvider>
        <PreferencesProvider>
          {/* Tooltip provider for UI tooltips */}
          <TooltipProvider>
            {/* Toast notification components */}
            <Toaster />
            <Sonner />
            {/* Router for handling navigation */}
            <BrowserRouter>
              <Routes>
                {/* Main dashboard route wrapped in ProtectedRoute for authentication */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                {/* Authentication routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                {/* Catch-all route for 404 pages */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* Conditionally render AI chatbox based on current route */}
              <ConditionalAIChatbox />
              <ConditionalFeedbackWidget />
            </BrowserRouter>
          </TooltipProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;