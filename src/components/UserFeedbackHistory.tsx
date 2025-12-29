import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, CheckCircle, Clock, Check } from 'lucide-react';
import apiService from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Feedback {
    id: string;
    rating: number;
    feedback: string;
    stock_symbol: string;
    created_at: string;
    status: 'pending' | 'resolved';
    admin_reply?: string;
    replied_at?: string;
}

const UserFeedbackHistory = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await apiService.get('/api/stock-feedback/history');
                setFeedbacks(data);
            } catch (error) {
                console.error("Failed to fetch feedback history", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <div className="p-4 text-center">Loading history...</div>;

    return (
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
                {feedbacks.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>You haven't submitted any feedback yet.</p>
                    </div>
                ) : (
                    feedbacks.map((item) => (
                        <Card key={item.id} className="border bg-card/50">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-sm font-medium">
                                            {item.stock_symbol ? `Feedback on ${item.stock_symbol}` : 'App Feedback'}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={item.status === 'resolved' ? 'default' : 'secondary'} className="text-xs">
                                        {item.status === 'resolved' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                        {item.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-3 w-3 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground italic mb-3">"{item.feedback}"</p>

                                {item.admin_reply && (
                                    <div className="bg-primary/5 border border-primary/10 rounded-md p-3 mt-3">
                                        <p className="text-xs font-semibold text-primary mb-1 flex items-center">
                                            <Check className="h-3 w-3 mr-1" /> Admin Response
                                        </p>
                                        <p className="text-sm">{item.admin_reply}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </ScrollArea>
    );
};

export default UserFeedbackHistory;
