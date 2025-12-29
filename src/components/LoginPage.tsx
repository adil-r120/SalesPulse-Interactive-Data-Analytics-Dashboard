import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, User, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { isGoogleOAuthEnabled } from '@/config/google-oauth';

// LoginPage: User authentication.
const LoginPage = () => {
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const { login, verifyOtp, googleLogin } = useAuth();
  // Hook for displaying toast notifications
  const { toast } = useToast();

  // Authentication hook and navigation hook
  // const { login, googleLogin } = useAuth(); // Handled above
  const navigate = useNavigate();


  // Load saved username
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
      setRememberMe(true);
    }
  }, []);

  // Handle input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  // Handle login
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Validate that both fields are filled
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    // Set loading state and clear any previous errors
    setIsLoading(true);
    setError("");

    try {
      // Attempt to log in with provided credentials
      const result = await login(formData.username, formData.password);

      if (result && result.requiresOtp) {
        setShowOtpModal(true);
        toast({
          title: "Verification Required",
          description: `We sent a code to your email. (Check server console for simulation)`,
        });
        setIsLoading(false);
        return;
      }

      // Save username if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem('savedUsername', formData.username);
      } else {
        localStorage.removeItem('savedUsername');
      }

      // Show success notification
      toast({
        title: "Login successful!",
        description: "Welcome back to SalesPulse!",
      });

      // Navigate to the main dashboard
      navigate('/');
    } catch (error: unknown) {
      // Handle login errors
      console.error("Login error:", error);
      let errorMessage = "Invalid username or password";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = () => {
    toast({
      title: "Password Reset",
      description: "Password reset functionality will be implemented soon!",
    });
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await verifyOtp(formData.username, otpCode);
      toast({ title: "Login successful!", description: "Welcome back!" });
      navigate('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google login with proper OAuth (when Client ID is configured)
  const handleGoogleOAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);

        // Send the access_token to backend
        const result: any = await googleLogin(tokenResponse.access_token);

        if (result && result.requiresOtp) {
          setShowOtpModal(true);
          // For Google login, the username to verify against is the email from the user object
          if (result.user && result.user.email) {
            setFormData(prev => ({ ...prev, username: result.user.email }));
          }
          toast({
            title: "Verification Required",
            description: `We sent a code to your email. (Check server console for simulation)`,
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: "Login successful!",
          description: "Welcome back to SalesPulse!",
        });

        navigate('/');
      } catch (error: any) {
        console.error("Google login error:", error);
        setError(error.message || "Google login failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setError("Google login failed. Please try again.");
    },
    // Force account picker to show every time
    prompt: 'select_account',
    scope: 'email profile',
  });

  // Fallback simulated Google login (when no Client ID)
  const handleSimulatedGoogleLogin = async () => {
    try {
      setIsLoading(true);
      // Simulate Google OAuth flow
      const simulatedGoogleToken = "google_simulated_token_" + Math.random().toString(36).substring(2, 15);

      // Call our googleLogin function which makes the API request to our backend
      const result: any = await googleLogin(simulatedGoogleToken);

      if (result && result.requiresOtp) {
        setShowOtpModal(true);
        // For Google login, the username to verify against is the email from the user object
        if (result.user && result.user.email) {
          setFormData(prev => ({ ...prev, username: result.user.email }));
        }
        toast({
          title: "Verification Required",
          description: `We sent a code to your email. (Check server console for simulation)`,
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to SalesPulse!",
      });

      // Navigate to dashboard
      navigate('/');
    } catch (error: any) {
      console.error("Google login error:", error);
      setError(error.message || "Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Combined Google login handler
  const handleGoogleLogin = () => {
    if (isGoogleOAuthEnabled()) {
      // Use proper Google OAuth with account picker
      handleGoogleOAuth();
    } else {
      // Use simulated flow (no Client ID configured)
      handleSimulatedGoogleLogin();
    }
  };

  // Email validation
  const isEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  return (
    // Layout
    <div className="min-h-screen flex">
      {/* Left Side - Futuristic Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500/20 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl animate-pulse delay-2000"></div>
          </div>

          {/* Tech grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Data Analytics Chart Background - NEW LOGO */}
          <div className="absolute inset-0 flex items-center justify-center opacity-15">
            <div className="relative w-96 h-72">
              {/* Bar Chart - 4 bars with ascending heights */}
              <div className="absolute bottom-0 left-0 flex items-end space-x-6">
                <div className="w-20 h-20 bg-gradient-to-t from-blue-300/60 to-blue-200/60 rounded-t-lg shadow-lg"></div>
                <div className="w-20 h-24 bg-gradient-to-t from-blue-400/60 to-blue-300/60 rounded-t-lg shadow-lg"></div>
                <div className="w-20 h-28 bg-gradient-to-t from-blue-500/60 to-blue-400/60 rounded-t-lg shadow-lg"></div>
                <div className="w-20 h-32 bg-gradient-to-t from-blue-600/60 to-blue-500/60 rounded-t-lg shadow-lg"></div>
              </div>

              {/* Upward Arrow - Dark blue arrow overlaying the bars */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 384 288" fill="none">
                <path
                  d="M 24 240 L 72 216 L 120 192 L 168 168 L 216 144 L 264 120 L 312 96 L 360 72"
                  stroke="#1E40AF"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.7"
                />
                <path
                  d="M 336 84 L 360 72 L 348 60"
                  stroke="#1E40AF"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.7"
                />
              </svg>
            </div>
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-6 shadow-2xl p-3">
                <svg className="w-full h-full" viewBox="0 0 80 60" fill="none">
                  {/* Bar Chart */}
                  <rect x="5" y="35" width="12" height="15" fill="#93C5FD" rx="2" />
                  <rect x="20" y="30" width="12" height="20" fill="#60A5FA" rx="2" />
                  <rect x="35" y="25" width="12" height="25" fill="#3B82F6" rx="2" />
                  <rect x="50" y="20" width="12" height="30" fill="#1E40AF" rx="2" />

                  {/* Upward Arrow */}
                  <path d="M 8 50 L 20 40 L 32 30 L 44 20 L 56 10" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 50 15 L 56 10 L 52 6" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-xl text-blue-200 mb-8">
                Sign in to your SalesPulse account
              </p>
              <div className="space-y-4 text-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Advanced Analytics Dashboard</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>AI-Powered Insights</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Real-time Data Visualization</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Secure & Reliable Platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-20 xl:px-24 relative">
        <div className="mx-auto w-full max-w-[350px]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl mb-4 shadow-lg p-2">
              <svg className="w-full h-full" viewBox="0 0 80 60" fill="none">
                {/* Bar Chart */}
                <rect x="5" y="35" width="12" height="15" fill="#93C5FD" rx="2" />
                <rect x="20" y="30" width="12" height="20" fill="#60A5FA" rx="2" />
                <rect x="35" y="25" width="12" height="25" fill="#3B82F6" rx="2" />
                <rect x="50" y="20" width="12" height="30" fill="#1E40AF" rx="2" />

                {/* Upward Arrow */}
                <path d="M 8 50 L 20 40 L 32 30 L 44 20 L 56 10" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
                <path d="M 50 15 L 56 10 L 52 6" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign up here
              </button>
            </p>
          </div>

          {/* Login form card */}
          <Card className="p-6 shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            {/* Error message display */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <Alert className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username/Email Field */}
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username or Email
                </Label>
                <div className="mt-1 relative">
                  {isEmail(formData.username) ? (
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  ) : (
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  )}
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter username or email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-300 hover:bg-gray-50"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
            </form>

            {/* Social Media Links */}
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">Follow us on social media</p>
              <div className="flex justify-center space-x-4">
                <button className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.222 0H1.777C.796 0 0 .774 0 1.729v20.542C0 23.227.796 24 1.777 24h20.451c.98 0 1.777-.773 1.777-1.729V1.729C24 .774 23.203 0 22.222 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>

        </div>

        {/* Footer inside the right column for better alignment */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© 2025 SalesPulse. All rights reserved.</p>
        </div>
      </div>

      {/* OTP Modal Overlay */}
      {
        showOtpModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 shadow-2xl bg-white animate-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Enter Verification Code</h3>
                <p className="text-gray-500 mt-2">
                  We've sent a 6-digit code to your email associated with this account.
                </p>
                <p className="text-xs text-muted-foreground mt-2">(Check the server terminal for the code)</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="otp" className="sr-only">OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Only numbers
                    className="text-center text-3xl tracking-widest h-14 font-mono font-bold"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                  disabled={isLoading || otpCode.length !== 6}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Login
                </button>
              </form>
            </Card>
          </div>
        )
      }

    </div >
  );
};

export default LoginPage;