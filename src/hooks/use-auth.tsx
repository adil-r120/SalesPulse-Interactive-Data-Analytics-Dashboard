import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface for user object structure
interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  profile_image_url?: string;
}

// Interface for authentication context values
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<any>;
  verifyOtp: (username: string, otp: string) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<{ requiresOtp?: boolean; access_token?: string; user?: User }>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Create authentication context with undefined as initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Base URL for API requests (uses relative URLs with Vite proxy)
const API_BASE_URL = 'https://salespulse-interactive-data-analytics.onrender.com';

// AuthProvider component that wraps the application and provides authentication context
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State for user profile data
  const [user, setUser] = useState<User | null>(null);
  // State for authentication token
  const [token, setToken] = useState<string | null>(null);
  // State for loading status during authentication checks
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token and get user profile
      fetchUserProfile(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Function to fetch user profile data using authentication token
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log in user with username and password
  const login = async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Login failed';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Check for Pre-Auth (OTP)
      if (data.token_type === 'pre_auth') {
        return { requiresOtp: true };
      }

      const { access_token, user: userData } = data;

      // Store token and user data in localStorage
      localStorage.setItem('auth_token', access_token);
      setToken(access_token);
      setUser(userData);
      return { requiresOtp: false };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Verify OTP
  const verifyOtp = async (username: string, otp: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp_code: otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Verification failed');
      }

      const data = await response.json();
      const { access_token, user: userData } = data;

      localStorage.setItem('auth_token', access_token);
      setToken(access_token);
      setUser(userData);
    } catch (error) {
      console.error('OTP Error:', error);
      throw error;
    }
  };

  // Function to log in user with Google OAuth token
  const googleLogin = async (googleToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: googleToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Google authentication failed';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Check for Pre-Auth (OTP)
      if (data.token_type === 'pre_auth') {
        // Return user email so we can verify OTP against it
        return { requiresOtp: true, user: data.user };
      }

      const { access_token, user: userData } = data;

      // Store token and user data in localStorage
      localStorage.setItem('auth_token', access_token);
      setToken(access_token);
      setUser(userData);

      return { requiresOtp: false, access_token, user: userData };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // Function to log out user and clear authentication data
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  // Authentication context value object
  const value: AuthContextType = {
    user,
    token,
    login,
    verifyOtp,
    googleLogin,
    logout,
    isLoading,
    isAuthenticated: !!token && !!user,
  };

  return (
    // Provide authentication context to child components
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};