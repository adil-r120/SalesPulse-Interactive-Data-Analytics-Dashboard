import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Settings, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditProfileModal } from './EditProfileModal';
import { SettingsModal } from './SettingsModal';

// Main UserProfile component
const UserProfile = () => {
  // Get user authentication state and logout function from auth hook
  const { user, logout } = useAuth();
  // Get toast function for showing notifications
  const { toast } = useToast();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("account");

  // Listen for custom event to open settings from notifications
  useEffect(() => {
    const handleOpenSettings = (e: CustomEvent) => {
      if (e.detail && e.detail.tab) {
        setSettingsTab(e.detail.tab);
      } else {
        setSettingsTab("account");
      }
      setIsSettingsOpen(true);
    };

    window.addEventListener('open-settings' as any, handleOpenSettings);
    return () => {
      window.removeEventListener('open-settings' as any, handleOpenSettings);
    };
  }, []);

  // Handle user logout
  const handleLogout = () => {
    logout();
    // Show success toast notification
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });
  };

  // Function to get user initials from their name
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Function to get color classes based on user role
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'analyst':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />

      {/* Dropdown menu for user profile */}
      <DropdownMenu>
        {/* Dropdown trigger - user avatar button */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {/* User avatar with gradient background and initials */}
              <AvatarImage src={user.profile_image_url} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {getInitials(user.full_name || user.username)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown menu content */}
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {/* User information section */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              {/* User name */}
              <p className="text-sm font-medium leading-none">
                {user.full_name || user.username}
              </p>
              {/* User email */}
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {/* User role with colored badge */}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          {/* Separator line */}
          <DropdownMenuSeparator />

          {/* Profile menu item */}
          <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditProfileOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          {/* Settings menu item */}
          <DropdownMenuItem className="cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          {/* Help menu item */}
          <DropdownMenuItem className="cursor-pointer" onClick={() => window.dispatchEvent(new Event('open-feedback-widget'))}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </DropdownMenuItem>

          {/* Separator line */}
          <DropdownMenuSeparator />

          {/* Logout menu item with red text for emphasis */}
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default UserProfile;