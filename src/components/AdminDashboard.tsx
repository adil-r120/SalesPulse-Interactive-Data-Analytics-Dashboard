import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, UserCheck, UserX, Trash2, RefreshCw, Mail, Activity, MonitorDot, UserCog, MessageSquare } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import AdminFeedbackManagement from './AdminFeedbackManagement';

interface UserData {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
}

const AdminDashboard = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [activityStats, setActivityStats] = useState<any>(null);
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [sessionInfo, setSessionInfo] = useState<any>(null);

    // Notification dialog state
    const [showNotifyDialog, setShowNotifyDialog] = useState(false);
    const [notifyTitle, setNotifyTitle] = useState('');
    const [notifyMessage, setNotifyMessage] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAllUsers();
            setUsers(data);
        } catch (error) {
            toast({
                title: "Access Denied",
                description: "You need admin privileges to view this panel.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchActivity = async () => {
        try {
            const data = await apiService.getUserActivity();
            setActivityStats(data);

            const history = await apiService.getLoginHistory(20);
            setLoginHistory(history);
        } catch (error) {
            console.error("Failed to fetch activity");
        }
    };

    const fetchSessions = async () => {
        try {
            const data = await apiService.getActiveSessions();
            setSessionInfo(data);
        } catch (error) {
            console.error("Failed to fetch sessions");
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchActivity();
        fetchSessions();
    }, []);

    const toggleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.size === 0) return;
        try {
            await apiService.bulkUserAction(Array.from(selectedUsers), 'delete');
            toast({ title: "Success", description: `Deleted ${selectedUsers.size} users` });
            setSelectedUsers(new Set());
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Bulk delete failed", variant: "destructive" });
        }
    };

    const handleBulkRoleChange = async (role: string) => {
        if (selectedUsers.size === 0) return;
        try {
            await apiService.bulkUserAction(Array.from(selectedUsers), 'change_role', role);
            toast({ title: "Success", description: `Updated ${selectedUsers.size} users to ${role}` });
            setSelectedUsers(new Set());
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Bulk role change failed", variant: "destructive" });
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await apiService.updateUserRole(userId, newRole);
            toast({ title: "Role Updated", description: `User role changed to ${newRole}` });
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
        }
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        try {
            await apiService.deleteUser(userId);
            toast({ title: "User Deleted", description: `${username} has been removed` });
            fetchUsers();
        } catch (error) {
            toast({ title: "Delete Failed", description: "Could not delete user", variant: "destructive" });
        }
    };

    const handleSendNotification = async () => {
        if (selectedUsers.size === 0) {
            toast({ title: "No Users Selected", description: "Please select users to notify", variant: "destructive" });
            return;
        }
        if (!notifyTitle || !notifyMessage) {
            toast({ title: "Missing Information", description: "Please fill in title and message", variant: "destructive" });
            return;
        }
        try {
            await apiService.notifyUsers(Array.from(selectedUsers), notifyTitle, notifyMessage);
            toast({ title: "✅ Notification Sent", description: `Sent to ${selectedUsers.size} users` });
            setShowNotifyDialog(false);
            setNotifyTitle('');
            setNotifyMessage('');
            setSelectedUsers(new Set());
        } catch (error) {
            toast({ title: "Send Failed", description: "Could not send notification", variant: "destructive" });
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'Manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        admins: users.filter(u => u.role === 'Admin').length,
    };

    if (loading) {
        return (
            <Card className="bg-gradient-card border-border/50 shadow-card animate-pulse">
                <CardHeader><CardTitle>Loading Security Dashboard...</CardTitle></CardHeader>
                <CardContent className="h-40" />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" /> Security & User Management
                    </h2>
                    <p className="text-muted-foreground">Advanced admin controls and system monitoring</p>
                </div>
                <Button onClick={() => { fetchUsers(); fetchActivity(); fetchSessions(); }} variant="outline" size="icon">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                    <TabsTrigger value="users">👥 Users</TabsTrigger>
                    <TabsTrigger value="activity">📊 Activity</TabsTrigger>
                    <TabsTrigger value="sessions">🖥️ Sessions</TabsTrigger>
                    <TabsTrigger value="feedback">💬 Feedback</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-l-4 border-l-blue-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                <p className="text-xs text-muted-foreground">Registered accounts</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-l-4 border-l-green-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                                <UserCheck className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                                <p className="text-xs text-muted-foreground">Currently enabled</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-l-4 border-l-red-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                                <Shield className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.admins}</div>
                                <p className="text-xs text-muted-foreground">Admin accounts</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedUsers.size > 0 && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="pt-6">
                                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0">
                                    <p className="text-sm font-medium mb-2 sm:mb-0">{selectedUsers.size} users selected</p>
                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                                        <Select onValueChange={handleBulkRoleChange}>
                                            <SelectTrigger className="w-[140px]">
                                                <UserCog className="h-4 w-4 mr-2" />
                                                <SelectValue placeholder="Change Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                                <SelectItem value="Manager">Manager</SelectItem>
                                                <SelectItem value="Viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={() => setShowNotifyDialog(true)} variant="outline">
                                            <Mail className="h-4 w-4 mr-2" /> Notify
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete {selectedUsers.size} Users?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete all selected users and their data. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">
                                                        Delete All
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>Manage all registered users and their permissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedUsers.size === users.length && users.length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Full Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center">No users found</TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id} className="h-12 hover:bg-muted/50">
                                                    <TableCell className="p-2">
                                                        <Checkbox
                                                            checked={selectedUsers.has(user.id)}
                                                            onCheckedChange={() => toggleSelectUser(user.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium p-2">{user.username}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground p-2">{user.email}</TableCell>
                                                    <TableCell className="text-sm p-2">{user.full_name || '-'}</TableCell>
                                                    <TableCell className="p-2">
                                                        <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole)}>
                                                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Admin">Admin</SelectItem>
                                                                <SelectItem value="Manager">Manager</SelectItem>
                                                                <SelectItem value="Viewer">Viewer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {user.is_active ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 py-0 h-6">
                                                                <UserCheck className="h-3 w-3 mr-1" /> Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 py-0 h-6">
                                                                <UserX className="h-3 w-3 mr-1" /> Inactive
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right p-2">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 text-destructive hover:text-destructive p-0">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete <strong>{user.username}</strong> and all their data.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.username)} className="bg-destructive">
                                                                        Delete Account
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" /> User Activity Logs
                            </CardTitle>
                            <CardDescription>Monitor system usage and user behavior</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activityStats && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Total Users</p>
                                            <p className="text-2xl font-bold">{activityStats.total_users}</p>
                                        </div>
                                        <div className="p-4 bg-green-500/10 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Active</p>
                                            <p className="text-2xl font-bold text-green-600">{activityStats.active_users}</p>
                                        </div>
                                        <div className="p-4 bg-gray-500/10 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Inactive</p>
                                            <p className="text-2xl font-bold text-gray-600">{activityStats.inactive_users}</p>
                                        </div>
                                        <div className="p-4 bg-blue-500/10 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Roles</p>
                                            <p className="text-2xl font-bold text-blue-600">{Object.keys(activityStats.role_distribution || {}).length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <h4 className="font-semibold mb-2">Role Distribution</h4>
                                        <div className="space-y-2">
                                            {Object.entries(activityStats.role_distribution || {}).map(([role, count]) => (
                                                <div key={role} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                                    <span className="font-medium">{role}</span>
                                                    <Badge variant="secondary">{count as number} users</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8">
                                <h3 className="text-lg font-medium mb-4">Recent Login Attempts</h3>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>IP Address</TableHead>
                                                <TableHead>User Agent</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loginHistory.map((entry: any) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="text-sm">
                                                        {new Date(entry.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{entry.username}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={entry.status === "Success" ? "outline" : "destructive"}
                                                            className={entry.status === "Success" ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                            {entry.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{entry.ip_address}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={entry.user_agent}>
                                                        {entry.user_agent}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {loginHistory.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                        No login attempts recorded yet
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sessions">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MonitorDot className="h-5 w-5" /> Active Sessions
                            </CardTitle>
                            <CardDescription>Monitor and manage user sessions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sessionInfo && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-muted/50 rounded-lg text-center">
                                        <p className="text-4xl font-bold text-primary mb-2">{sessionInfo.active_user_count}</p>
                                        <p className="text-muted-foreground">Active Users</p>
                                    </div>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">{sessionInfo.message}</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{sessionInfo.note}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="feedback">
                    <AdminFeedbackManagement />
                </TabsContent>
            </Tabs>

            {/* Notification Dialog */}
            <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Notification to {selectedUsers.size} Users</DialogTitle>
                        <DialogDescription>
                            This will send an in-app notification to all selected users.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="notify-title">Title</Label>
                            <Input
                                id="notify-title"
                                value={notifyTitle}
                                onChange={(e) => setNotifyTitle(e.target.value)}
                                placeholder="Notification title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="notify-message">Message</Label>
                            <Textarea
                                id="notify-message"
                                value={notifyMessage}
                                onChange={(e) => setNotifyMessage(e.target.value)}
                                placeholder="Enter your message..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNotifyDialog(false)}>Cancel</Button>
                        <Button onClick={handleSendNotification}>
                            <Mail className="h-4 w-4 mr-2" /> Send Notification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboard;
