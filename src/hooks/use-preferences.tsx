import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Currency = "INR" | "USD" | "EUR";
type Language = "English" | "Hindi" | "Spanish";
type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";

interface PreferencesContextType {
    currency: Currency;
    language: Language;
    theme: Theme;
    fontSize: FontSize;
    notifications: {
        email: boolean;
        push: boolean;
        digest: boolean;
    };
    setCurrency: (currency: Currency) => void;
    setLanguage: (language: Language) => void;
    setTheme: (theme: Theme) => void;
    setFontSize: (size: FontSize) => void;
    setNotifications: (settings: { email: boolean; push: boolean; digest: boolean }) => void;
    formatCurrency: (amount: number) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>(
        (localStorage.getItem("sp_currency") as Currency) || "INR"
    );
    const [language, setLanguageState] = useState<Language>(
        (localStorage.getItem("sp_language") as Language) || "English"
    );

    // New Preferences with Persistence
    const [theme, setThemeState] = useState<Theme>(
        (localStorage.getItem("sp_theme") as Theme) || "system"
    );
    const [fontSize, setFontSizeState] = useState<FontSize>(
        (localStorage.getItem("sp_fontsize") as FontSize) || "medium"
    );
    const [notifications, setNotificationsState] = useState({
        email: localStorage.getItem("sp_notif_email") !== "false", // Default true
        push: localStorage.getItem("sp_notif_push") === "true",    // Default false
        digest: localStorage.getItem("sp_notif_digest") !== "false" // Default true
    });

    // Apply Theme Side Effect
    // Apply Theme Side Effect
    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (targetTheme: Theme) => {
            root.classList.remove("light", "dark");

            if (targetTheme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
                root.classList.add(systemTheme);
            } else {
                root.classList.add(targetTheme);
            }
        };

        applyTheme(theme);
        localStorage.setItem("sp_theme", theme);

        // Listen for system changes if theme is system
        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => applyTheme("system");

            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
    }, [theme]);

    // Apply Font Size Side Effect
    useEffect(() => {
        const root = window.document.documentElement;
        // Reset
        root.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
        // Or specific scaling classes could be used. For this app, adjusting root font-size works with rem.
        // Assuming base is 16px (100%).
        // Small = 14px (87.5%), Medium = 16px (100%), Large = 18px (112.5%)
        localStorage.setItem("sp_fontsize", fontSize);
    }, [fontSize]);


    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem("sp_currency", newCurrency);
        window.dispatchEvent(new Event("preference-change"));
    };

    const setLanguage = (newLanguage: Language) => {
        setLanguageState(newLanguage);
        localStorage.setItem("sp_language", newLanguage);
        window.dispatchEvent(new Event("preference-change"));
    };

    const setTheme = (newTheme: Theme) => setThemeState(newTheme);
    const setFontSize = (newSize: FontSize) => setFontSizeState(newSize);

    const setNotifications = (newSettings: { email: boolean; push: boolean; digest: boolean }) => {
        setNotificationsState(newSettings);
        localStorage.setItem("sp_notif_email", String(newSettings.email));
        localStorage.setItem("sp_notif_push", String(newSettings.push));
        localStorage.setItem("sp_notif_digest", String(newSettings.digest));
    };

    const formatCurrency = (amount: number) => {
        const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
        // Basic formatting - can be enhanced with Intl.NumberFormat if strict locale needed
        return `${symbol}${amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
    };

    return (
        <PreferencesContext.Provider value={{
            currency,
            language,
            theme,
            fontSize,
            notifications,
            setCurrency,
            setLanguage,
            setTheme,
            setFontSize,
            setNotifications,
            formatCurrency
        }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}
