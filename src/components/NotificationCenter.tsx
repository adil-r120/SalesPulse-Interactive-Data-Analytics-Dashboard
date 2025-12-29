import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  X,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { usePreferences } from '@/hooks/use-preferences';
import apiService from '@/services/api';
import { toast } from 'sonner';

// Interface for notification objects
interface Notification {
  id: string;
  type: 'success' | 'warning' | ' info' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon_type?: string;
}

// Main NotificationCenter component
const NotificationCenter = () => {
  // Access global preferences
  const { notifications: prefNotifs } = usePreferences();

  // State for managing notification dropdown visibility
  const [isOpen, setIsOpen] = useState(false);

  // State for storing notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // State for unread count
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // State for loading
  const [loading, setLoading] = useState(false);

  // Request notification permission if enabled in settings
  useEffect(() => {
    if (prefNotifs.push && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [prefNotifs.push]);

  // Handle browser notifications when unread count increases
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      setPrevUnreadCount(unreadCount);
      return;
    }

    if (unreadCount > prevUnreadCount) {
      // New notification received! Fetch detail to show content
      const showNewNotification = async () => {
        try {
          const freshNotifications = await apiService.get('/api/notifications/');
          // Find the most recent unread notification
          const latest = freshNotifications.find((n: Notification) => !n.read);

          if (latest) {
            // 1. Show In-App Toast
            toast.info(latest.title, {
              description: latest.message,
              duration: 5000,
              icon: getIcon(latest.type, latest.icon_type),
              action: {
                label: 'View',
                onClick: () => handleNotificationClick(latest)
              }
            });

            // 2. Show System Push Notification (Run in background)
            if (prefNotifs.push && 'Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(latest.title, {
                body: latest.message,
                icon: '/favicon.ico'
              });
              n.onclick = () => {
                window.focus();
                handleNotificationClick(latest);
              };
            }
          }
        } catch (error) {
          console.error("Failed to fetch notification details", error);
        }
      };

      showNewNotification();
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prefNotifs.push]);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      const response = await apiService.get('/api/notifications/');
      setNotifications(response);

      // Update unread count
      const unread = response.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Fetch unread count only (lightweight for polling)
  const fetchUnreadCount = async () => {
    try {
      const response = await apiService.get('/api/notifications/unread-count');
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time polling for unread count (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('refresh-notifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Function to mark a specific notification as read
  const markAsRead = async (id: string) => {
    try {
      await apiService.put(`/api/notifications/${id}/read`, {});

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success('Marked as read');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiService.put('/api/notifications/mark-all-read', {});

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      toast.success('All marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Function to remove a notification
  const removeNotification = async (id: string) => {
    try {
      await apiService.delete(`/api/notifications/${id}`);

      // Update local state
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));

      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast.success('Notification removed');
    } catch (error) {
      console.error('Failed to remove notification:', error);
      toast.error('Failed to remove notification');
    }
  };

  // Get icon based on type
  const getIcon = (type: string, icon_type?: string) => {
    const className = "h-4 w-4";

    if (icon_type === 'target') return <Target className={className} />;
    if (icon_type === 'dollar') return <DollarSign className={className} />;
    if (icon_type === 'alert') return <AlertTriangle className={className} />;
    if (icon_type === 'users') return <Users className={className} />;
    if (icon_type === 'calendar') return <Calendar className={className} />;
    if (icon_type === 'check') return <CheckCircle className={className} />;

    // Fallback based on type
    if (type === 'achievement') return <Target className={className} />;
    if (type === 'success') return <CheckCircle className={className} />;
    if (type === 'warning') return <AlertTriangle className={className} />;
    return <TrendingUp className={className} />;
  };

  // Function to get color classes based on notification type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'achievement': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Function to format timestamp into relative time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  // Handle clicking a notification
  const handleNotificationClick = (n: Notification) => {
    // Logic to navigate based on notification content
    if (n.title.toLowerCase().includes('feedback') || n.message.toLowerCase().includes('feedback') ||
      n.title.toLowerCase().includes('reply')) {
      // Dispatch event to open Settings -> Feedback
      window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'feedback' } }));
    }

    // Close dropdown if open
    setIsOpen(false);

    // Mark as read
    if (!n.read) {
      markAsRead(n.id);
    }
  };

  return (
    // Container for the notification bell and dropdown
    <div className="relative">
      {/* Notification bell button - only highlighted when unread exist */}
      <Button
        variant={unreadCount > 0 ? "default" : "ghost"}
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-9 w-9 ${unreadCount > 0 ? 'animate-pulse' : ''}`}
      >
        <Bell className="h-4 w-4" />
        {/* Badge showing unread notification count - only shows when > 0 */}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification dropdown menu */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 z-50 shadow-2xl border-0">
          {/* Header with title and action buttons */}
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                {/* Mark all as read button (only shown when there are unread notifications) */}
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Notification list content */}
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="p-2">
                {/* Empty state when no notifications exist */}
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  // List of notifications
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-background'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Notification icon with color based on type */}
                          <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                            {getIcon(notification.type, notification.icon_type)}
                          </div>
                          {/* Notification content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Notification title with different styling for read/unread */}
                                <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </p>
                                {/* Notification message */}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                {/* Timestamp */}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                              {/* Remove notification button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeNotification(notification.id)}
                                className="h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            {/* Mark as read button (only shown for unread notifications) */}
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="mt-2 text-xs h-6"
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;