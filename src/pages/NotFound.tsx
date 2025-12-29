import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Home } from "lucide-react";

// Main NotFound component
const NotFound = () => {
  // Get current location for logging purposes
  const location = useLocation();

  // Log the 404 error with the attempted route
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    // Main 404 page layout with centered content
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Logo with gradient background */}
        <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
          <BarChart3 className="w-10 h-10 text-white" />
        </div>
        
        {/* Error code and message */}
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Button to return to dashboard */}
        <Button asChild className="bg-gradient-primary hover:bg-gradient-secondary transition-all duration-200 shadow-glow">
          <a href="/" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Return to Dashboard
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;