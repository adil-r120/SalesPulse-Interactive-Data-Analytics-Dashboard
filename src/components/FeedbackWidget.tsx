import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageCircle, FileText, ArrowLeft, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import apiService from "@/services/api";

const FeedbackWidget = () => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'menu' | 'form'>('menu');
    const [requestText, setRequestText] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleOpen = () => {
            setOpen(true);
            setView('menu');
        };
        window.addEventListener('open-feedback-widget', handleOpen);
        return () => window.removeEventListener('open-feedback-widget', handleOpen);
    }, []);

    const handleSubmit = async () => {
        if (!requestText.trim()) return;
        setLoading(true);
        try {
            // Submit as "Feedback" with a default rating (3 - Neutral/Query) for documentation requests
            await apiService.post('/api/stock-feedback/', {
                rating: 3,
                feedback: `[Help Request]: ${requestText}`,
            });
            toast.success("Request submitted successfully!");
            window.dispatchEvent(new Event('refresh-notifications'));
            setRequestText("");
            setView('menu');
            setOpen(false);
        } catch (error) {
            toast.error("Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{view === 'menu' ? 'Help & Support' : 'Submit Request'}</DialogTitle>
                    <DialogDescription>
                        {view === 'menu' ? 'How can we assist you today?' : 'Please describe what you need help with.'}
                    </DialogDescription>
                </DialogHeader>

                {view === 'menu' ? (
                    <div className="grid gap-4 py-4">
                        <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => setView('form')}>
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="text-left flex-1">
                                <div className="font-semibold">Submit Help Request</div>
                                <div className="text-xs text-muted-foreground">Submit a request for documentation or support</div>
                            </div>
                            <ArrowLeft className="h-4 w-4 opacity-50 rotate-180" />
                        </Button>

                        <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => window.location.href = 'mailto:support@salespulse.com'}>
                            <Mail className="h-5 w-5 text-primary" />
                            <div className="text-left flex-1">
                                <div className="font-semibold">Email Support</div>
                                <div className="text-xs text-muted-foreground">Get in touch with our team</div>
                            </div>
                        </Button>

                        <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => {
                            setOpen(false);
                            window.dispatchEvent(new Event('open-ai-chat'));
                        }}>
                            <MessageCircle className="h-5 w-5 text-primary" />
                            <div className="text-left flex-1">
                                <div className="font-semibold">Ask AI Assistant</div>
                                <div className="text-xs text-muted-foreground">Get instant answers</div>
                            </div>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4 animate-in fade-in slide-in-from-right-5 duration-300">
                        <div className="grid gap-2">
                            <Label htmlFor="request">Describe your request</Label>
                            <Textarea
                                id="request"
                                value={requestText}
                                onChange={e => setRequestText(e.target.value)}
                                placeholder="I need documentation on... / I am facing an issue with..."
                                className="resize-none"
                                rows={5}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setView('menu')}>Back</Button>
                            <Button onClick={handleSubmit} disabled={loading || !requestText.trim()}>
                                {loading ? "Sending..." : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Submit
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter className="sm:justify-center text-xs text-muted-foreground">
                    SalesPulse v1.0.0
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackWidget;
