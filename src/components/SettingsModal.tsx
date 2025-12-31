import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences } from "@/hooks/use-preferences";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Palette, Moon, Sun, Laptop, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import UserFeedbackHistory from "./UserFeedbackHistory";


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
}

export function SettingsModal({ isOpen, onClose, initialTab = "account" }: SettingsModalProps) {
    const { token, user } = useAuth();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);

    // Close modal when location changes (e.g. navigation from AI Insight)
    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [location.pathname, location.search]);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Preference State (Global)
    const {
        currency: globalCurrency,
        language: globalLanguage,
        theme: globalTheme,
        fontSize: globalFontSize,
        notifications: globalNotifs,
        setCurrency: setGlobalCurrency,
        setLanguage: setGlobalLanguage,
        setTheme: setGlobalTheme,
        setFontSize: setGlobalFontSize,
        setNotifications: setGlobalNotifs
    } = usePreferences();

    // Local state for immediate feedback, synced on mount/change
    const [currency, setCurrency] = useState(globalCurrency);
    const [language, setLanguage] = useState(globalLanguage);

    // For simpler settings (Theme/Notifications), we can update global state directly 
    // OR keep a "Save" button pattern. The user requested "Save" buttons.
    // Let's keep local state for formatting consistency.
    const [theme, setTheme] = useState(globalTheme);
    const [fontSize, setFontSize] = useState(globalFontSize);

    const [emailAlerts, setEmailAlerts] = useState(globalNotifs.email);
    const [pushNotifs, setPushNotifs] = useState(globalNotifs.push);
    const [weeklyDigest, setWeeklyDigest] = useState(globalNotifs.digest);

    // Sync if global changes externally
    useEffect(() => {
        setCurrency(globalCurrency);
        setLanguage(globalLanguage);
        setTheme(globalTheme);
        setFontSize(globalFontSize);
        setEmailAlerts(globalNotifs.email);
        setPushNotifs(globalNotifs.push);
        setWeeklyDigest(globalNotifs.digest);
    }, [globalCurrency, globalLanguage, globalTheme, globalFontSize, globalNotifs]);



    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch("/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update password");
            }
            toast.success("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferenceSave = () => {
        setGlobalCurrency(currency as any);
        setGlobalLanguage(language as any);
        toast.success("Preferences saved!");
    };

    const handleNotificationSave = () => {
        setGlobalNotifs({
            email: emailAlerts,
            push: pushNotifs,
            digest: weeklyDigest
        });
        toast.success("Notification settings saved!");
    };

    const handleAppearanceSave = () => {
        setGlobalTheme(theme as any);
        setGlobalFontSize(fontSize as any);
        toast.success("Appearance settings updated!");
    };

    const handleResetData = async () => {
        if (!confirm("Are you sure? This will DELETE ALL your sales, goals, and chat history. This cannot be undone.")) {
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch("/auth/reset-data", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            });
            if (!response.ok) throw new Error("Failed to reset data");
            toast.success("All data has been reset.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your account settings and preferences.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={initialTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4">
                        <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-2 h-auto p-1 justify-start">
                            <TabsTrigger value="account" className="flex-shrink-0 flex items-center gap-2">
                                Account
                            </TabsTrigger>
                            <TabsTrigger value="preferences" className="flex-shrink-0 flex items-center gap-2">
                                Preferences
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="flex-shrink-0 flex items-center gap-2">
                                Notifications
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="flex-shrink-0 flex items-center gap-2">
                                Appearance
                            </TabsTrigger>
                            {user?.role !== 'Admin' && (
                                <TabsTrigger value="feedback" className="flex-shrink-0 flex items-center gap-2">
                                    My Feedback
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4">

                        {/* ACCOUNT TAB */}
                        <TabsContent value="account" className="mt-0 space-y-4">


                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Change Password</h3>
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="current">Current Password</Label>
                                        <Input id="current" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new">New Password</Label>
                                        <Input id="new" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirm">Confirm Password</Label>
                                        <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                    </div>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
                                    </Button>
                                </form>
                            </div>
                        </TabsContent>

                        {/* PREFERENCES TAB */}
                        <TabsContent value="preferences" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Display Settings</h3>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card gap-4 sm:gap-0">
                                    <div className="space-y-0.5">
                                        <Label>Currency Symbol</Label>
                                        <div className="text-sm text-muted-foreground">Select your preferred currency</div>
                                    </div>
                                    <select
                                        className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as any)}
                                    >
                                        <option value="INR">Rupee (₹)</option>
                                        <option value="USD">Dollar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card gap-4 sm:gap-0">
                                    <div className="space-y-0.5">
                                        <Label>Language</Label>
                                        <div className="text-sm text-muted-foreground">Preferred language for AI Chat</div>
                                    </div>
                                    <select
                                        className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as any)}
                                    >
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Spanish">Spanish</option>
                                    </select>
                                </div>

                                <Button onClick={handlePreferenceSave} variant="secondary" className="w-full">Save Preferences</Button>
                            </div>
                        </TabsContent>


                        {/* NOTIFICATIONS TAB */}
                        <TabsContent value="notifications" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium flex items-center gap-2"><Bell className="w-5 h-5" /> Notification Preferences</h3>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card gap-4 sm:gap-0">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Alerts</Label>
                                        <div className="text-sm text-muted-foreground">Receive updates via email</div>
                                    </div>
                                    <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card gap-4 sm:gap-0">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Push Notifications</Label>
                                        <div className="text-sm text-muted-foreground">Receive updates in browser</div>
                                    </div>
                                    <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card gap-4 sm:gap-0">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Weekly Digest</Label>
                                        <div className="text-sm text-muted-foreground">Get a summary every Monday</div>
                                    </div>
                                    <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                                </div>

                                <Button onClick={handleNotificationSave} className="w-full">Save Changes</Button>
                            </div>
                        </TabsContent>

                        {/* APPEARANCE TAB */}
                        <TabsContent value="appearance" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium flex items-center gap-2"><Palette className="w-5 h-5" /> Appearance Settings</h3>

                                <div className="space-y-2">
                                    <Label>Theme</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <Button
                                            variant={theme === 'light' ? 'default' : 'outline'}
                                            className="flex flex-col gap-2 h-auto py-4"
                                            onClick={() => setTheme('light')}
                                        >
                                            <Sun className="h-6 w-6" />
                                            <span>Light</span>
                                        </Button>
                                        <Button
                                            variant={theme === 'dark' ? 'default' : 'outline'}
                                            className="flex flex-col gap-2 h-auto py-4"
                                            onClick={() => setTheme('dark')}
                                        >
                                            <Moon className="h-6 w-6" />
                                            <span>Dark</span>
                                        </Button>
                                        <Button
                                            variant={theme === 'system' ? 'default' : 'outline'}
                                            className="flex flex-col gap-2 h-auto py-4"
                                            onClick={() => setTheme('system')}
                                        >
                                            <Laptop className="h-6 w-6" />
                                            <span>System</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select your preferred interface theme.</p>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label>Font Size</Label>
                                    <select
                                        className="w-full h-10 rounded-md border border-input bg-background px-3"
                                        value={fontSize}
                                        onChange={(e) => setFontSize(e.target.value as any)}
                                    >
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>

                                <Button onClick={handleAppearanceSave} className="w-full">Apply Changes</Button>
                            </div>
                        </TabsContent>

                        {/* FEEDBACK TAB - Only for non-admins */}
                        {user?.role !== 'Admin' && (
                            <TabsContent value="feedback" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium flex items-center gap-2"><MessageSquare className="w-5 h-5" /> My Feedback History</h3>
                                    <p className="text-sm text-muted-foreground">View your past feedback and responses from our team.</p>
                                    <UserFeedbackHistory />
                                </div>
                            </TabsContent>
                        )}
                    </div>

                </Tabs>
            </DialogContent>
        </Dialog >
    );
}
