import { createContext, useContext, useEffect, useState } from 'react';

// Type definition for theme options
type Theme = 'dark' | 'light' | 'system';

// Interface for ThemeProvider component props
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

// Interface for ThemeProvider context state
type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

// Initial state for theme context
const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  toggleTheme: () => null,
};

// Create theme context with initial state
const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// ThemeProvider component that manages theme state and applies CSS classes
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'salespluse-ui-theme',
  ...props
}: ThemeProviderProps) {
  // State for current theme with localStorage persistence
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Effect to apply theme classes to document root element
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Apply theme based on current state
    if (theme === 'system') {
      // Use system preference for theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    // Apply explicit theme (light or dark)
    root.classList.add(theme);
  }, [theme]);

  // Context value with theme state and functions
  const value = {
    theme,
    // Function to set theme with localStorage persistence
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    // Function to toggle between light and dark themes
    toggleTheme: () => {
      setTheme(theme === 'light' ? 'dark' : 'light');
    },
  };

  return (
    // Provide theme context to child components
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};