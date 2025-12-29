import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, CheckCircle, Clock, Send, Filter, Download, Share2, FileJson, FileSpreadsheet, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import apiService from '@/services/api';
import { toast } from 'sonner';

interface Feedback {
    id: string;
    rating: number;
    feedback: string;
    stock_symbol: string;
    created_at: string;
    status: string;
    admin_reply?: string;
    replied_at?: string;
    user_email?: string;
}

const AdminFeedbackManagement = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [accessDenied, setAccessDenied] = useState(false);

    // Check if user is admin
    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const profile = await apiService.getProfile();
                setUserRole(profile.role || '');

                if (profile.role !== 'Admin') {
                    setAccessDenied(true);
                    toast.error('Access Denied: Admin privileges required');
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to verify admin access:', error);
                setAccessDenied(true);
                toast.error('Failed to verify access permissions');
                setLoading(false);
            }
        };

        checkAdminAccess();
    }, []);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            let url = '/api/stock-feedback/admin/all';
            const params = [];
            if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
            if (ratingFilter !== 'all') params.push(`rating_type=${ratingFilter}`);
            if (params.length > 0) url += '?' + params.join('&');

            const data = await apiService.get(url);
            setFeedbacks(data);
        } catch (error) {
            console.error("Failed to fetch feedbacks", error);
            toast.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === 'Admin') {
            fetchFeedbacks();
        }
    }, [statusFilter, ratingFilter, userRole]);

    const handleReply = async () => {
        if (!selectedFeedback || !replyText.trim()) {
            toast.error("Please enter a reply");
            return;
        }

        setSubmitting(true);
        try {
            await apiService.post(`/api/stock-feedback/admin/reply/${selectedFeedback.id}`, {
                reply: replyText,
                status: 'resolved'
            });

            toast.success("Reply sent successfully");
            setReplyText('');
            setSelectedFeedback(null);
            fetchFeedbacks();
        } catch (error) {
            console.error("Failed to send reply", error);
            toast.error("Failed to send reply");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAutoArchive = async (days: number) => {
        try {
            const result = await apiService.post(`/api/stock-feedback/admin/auto-archive?days=${days}`, {});
            toast.success(result.message);
            fetchFeedbacks();
        } catch (error) {
            console.error("Failed to archive", error);
            toast.error("Failed to archive feedback");
        }
    };

    const handleExportCSV = () => {
        if (feedbacks.length === 0) {
            toast.error("No feedback to export");
            return;
        }

        // Create CSV content
        const headers = ['ID', 'User Email', 'Stock Symbol', 'Rating', 'Feedback', 'Status', 'Admin Reply', 'Created At', 'Replied At'];
        const rows = feedbacks.map(f => [
            f.id,
            f.user_email || 'N/A',
            f.stock_symbol || 'General',
            f.rating.toString(),
            `"${(f.feedback || '').replace(/"/g, '""')}"`, // Escape quotes
            f.status,
            `"${(f.admin_reply || '').replace(/"/g, '""')}"`,
            new Date(f.created_at).toLocaleString(),
            f.replied_at ? new Date(f.replied_at).toLocaleString() : 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${feedbacks.length} feedback records`);
    };

    const handleExportJSON = () => {
        if (feedbacks.length === 0) {
            toast.error("No feedback to export");
            return;
        }

        const jsonContent = JSON.stringify(feedbacks, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${feedbacks.length} feedback records as JSON`);
    };

    const handleShare = async () => {
        const summary = `Feedback Summary:\n- Total: ${feedbacks.length}\n- Pending: ${feedbacks.filter(f => f.status === 'pending').length}\n- Resolved: ${feedbacks.filter(f => f.status === 'resolved').length}\n- Average Rating: ${feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : '0.0'} ⭐`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'User Feedback Summary',
                    text: summary,
                });
                toast.success("Shared successfully!");
            } catch (error) {
                console.error("Failed to share", error);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(summary);
                toast.success("Summary copied to clipboard!");
            } catch (error) {
                toast.error("Failed to copy to clipboard");
            }
        }
    };

    if (accessDenied) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
                <Shield className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground">Access Denied</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                    You do not have permission to view this page. This area is restricted to administrators only.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center">Loading feedbacks...</div>;
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Manage User Feedback</h2>
                    <p className="text-muted-foreground mt-1">View and respond to user feedback</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleAutoArchive(30)}>
                        Archive Old (30d)
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExportCSV}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportJSON}>
                                <FileJson className="w-4 h-4 mr-2" />
                                Export as JSON
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Rating" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="good">Positive (4-5 Star)</SelectItem>
                            <SelectItem value="bad">Negative (1-3 Star)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Feedback List */}
            <ScrollArea className="h-[600px] border rounded-md p-4">
                {feedbacks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No feeedback found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {feedbacks.map((item) => (
                            <Card key={item.id} className={`transition-all ${item.status === 'resolved' ? 'opacity-80' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={item.rating >= 4 ? "default" : "destructive"} className="flex gap-1">
                                                {item.rating} <Star className="h-3 w-3 fill-current" />
                                            </Badge>
                                            <span className="font-medium text-sm">{item.stock_symbol || 'General'}</span>
                                            {item.user_email && <span className="text-xs text-muted-foreground">({item.user_email})</span>}
                                        </div>
                                        <Badge variant="outline" className={
                                            item.status === 'resolved' ? "text-green-600 border-green-200 bg-green-50" :
                                                item.status === 'archived' ? "text-gray-600" :
                                                    "text-yellow-600 border-yellow-200 bg-yellow-50"
                                        }>
                                            {item.status}
                                        </Badge>
                                    </div>

                                    <p className="text-sm mb-3">{item.feedback}</p>

                                    {item.admin_reply && (
                                        <div className="bg-muted p-3 rounded-md mb-3 text-sm">
                                            <div className="flex items-center gap-2 mb-1 text-primary font-medium">
                                                <CheckCircle className="h-3 w-3" /> Admin Reply
                                            </div>
                                            {item.admin_reply}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {item.status !== 'resolved' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedFeedback(item)}
                                                className="h-6"
                                            >
                                                Reply
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Reply Dialog */}
            <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reply to Feedback</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p className="font-medium mb-1">User Feedback:</p>
                            <p>{selectedFeedback?.feedback}</p>
                        </div>
                        <Textarea
                            placeholder="Type your reply here..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setSelectedFeedback(null)}>Cancel</Button>
                            <Button onClick={handleReply} disabled={submitting}>
                                {submitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Reply & Resolve
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminFeedbackManagement;
