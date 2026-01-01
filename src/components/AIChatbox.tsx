import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  RefreshCw,
  AlertCircle,
  Mic,
  MicOff,
  Copy,
  Minimize2,
  Maximize2,
  Search,
  Sparkles,
  ChevronDown,
  Volume2,
  VolumeX,
  ArrowRight,
  ExternalLink,
  Trash2
} from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import apiService from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '@/hooks/use-preferences';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

// Interface for chat messages
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion';
}

// Simple Markdown Formatter Component
const FormattedText = ({ text }: { text: string }) => {
  // Split by newlines to handle paragraphs
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, i) => {
        // Check for list items
        if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex items-start ml-2 space-x-2">
              <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(paragraph.substring(2)) }} />
            </div>
          );
        }
        // Numbered lists
        if (/^\d+\.\s/.test(paragraph)) {
          return (
            <div key={i} className="flex items-start ml-2 space-x-2">
              <span className="font-semibold text-xs mt-0.5 mr-1">{paragraph.split(' ')[0]}</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(paragraph.substring(paragraph.indexOf(' ') + 1)) }} />
            </div>
          );
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineStyles(paragraph) }} />;
      })}
    </div>
  );
};

// Helper to handle bold/italic
const formatInlineStyles = (text: string) => {
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
  return formatted;
};

// Rich Message Renderer Component
const RichMessageRenderer = ({ content }: { content: string }) => {
  const navigate = useNavigate();
  const parts = content.split(/(:::(?:CHART|ACTION)_DATA=\{.*?\}:::)/g);

  return (
    <div className="space-y-3 w-full">
      {parts.map((part, index) => {
        // Handle Charts
        if (part.startsWith(':::CHART_DATA=')) {
          try {
            const jsonStr = part.replace(':::CHART_DATA=', '').replace(':::', '');
            const data = JSON.parse(jsonStr);

            return (
              <div key={index} className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-2 mb-2 w-full h-[180px]">
                <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">{data.title || 'Data Visualization'}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.data}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                      dataKey={data.xKey || "name"}
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis
                      hide={true}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey={data.yKey || "value"}
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          } catch (e) {
            return null; // Fail silently if JSON is bad
          }
        }

        // Handle Actions
        if (part.startsWith(':::ACTION_DATA=')) {
          try {
            const jsonStr = part.replace(':::ACTION_DATA=', '').replace(':::', '');
            const action = JSON.parse(jsonStr);

            return (
              <Button
                key={index}
                onClick={() => navigate(action.path)}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md group"
              >
                {action.label}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            );
          } catch (e) {
            return null;
          }
        }

        // Standard Text (but skip empty strings from split)
        if (!part.trim()) return null;

        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

// AIChatbox component
const AIChatbox = () => {
  const { language } = usePreferences();
  // Chat state
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! 👋 I'm **SalesPulse AI**, your personal data companion. I can help you uncover insights, track trends, or simply answer questions about your sales. What's on your mind?",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Listen for external open events
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  // Enhanced features state
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Streaming text state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Check AI Status
  const checkStatus = async () => {
    try {
      const status = await apiService.getChatStatus();
      if (status.status === 'connected') {
        setAiStatus('connected');
        setAiError(null);
      } else {
        setAiStatus('disconnected');
        setAiError(status.message || "AI Service Disconnected");
      }
    } catch (error) {
      console.error("Failed to check AI status", error);
      setAiStatus('disconnected');
      setAiError("Unable to connect to backend");
    }
  };

  const hasCheckedStatus = useRef(false);

  useEffect(() => {
    if (isOpen && !hasCheckedStatus.current) {
      hasCheckedStatus.current = true;
      checkStatus();
    }
    if (!isOpen) {
      hasCheckedStatus.current = false;
    }
  }, [isOpen]);

  // Quick Suggestions

  const quickSuggestions = [
    { icon: DollarSign, text: 'Total Revenue', query: 'What is my total revenue so far?' },
    { icon: TrendingUp, text: 'Sales Trends', query: 'What are the current sales trends?' },
    { icon: BarChart3, text: 'Top Category', query: 'What is my best performing category?' },
    { icon: AlertCircle, text: 'Active Goals', query: 'Do I have any active goals right now?' },
    { icon: RefreshCw, text: 'Recent Sales', query: 'What was my last sales transaction?' },
    { icon: Sparkles, text: 'Stocks Info', query: 'How is Apple stock performing today?' },
  ];

  // Fetch AI response
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // Append language instruction
      const messageWithContext = `${userMessage} (System: Respond in ${language} language effectively)`;

      const response = await apiService.chatWithAI(messageWithContext);
      setAiError(null);
      setAiStatus('connected'); // Update status on successful call
      return response.response;
    } catch (error: unknown) {
      console.error('Error getting AI response:', error);
      const errorMsg = error instanceof Error ? error.message : 'AI service is temporarily unavailable.';
      setAiError(errorMsg);
      setAiStatus('disconnected');
      throw new Error(errorMsg);
    }
  };

  // Load history
  const loadChatHistory = async () => {
    if (isLoadingHistory) return;

    setIsLoadingHistory(true);
    try {
      const history = await apiService.getChatHistory(20);
      if (history.messages && history.messages.length > 0) {
        // Define interface for history item to avoid 'any'
        interface HistoryItem {
          id: string;
          message: string;
          response: string;
          created_at: string;
        }

        const userMessages: Message[] = (history.messages as HistoryItem[]).map((msg) => ({
          id: msg.id,
          content: msg.message,
          sender: 'user',
          timestamp: new Date(msg.created_at),
        }));

        const aiMessages: Message[] = (history.messages as HistoryItem[]).map((msg) => ({
          id: `${msg.id}-response`,
          content: msg.response,
          sender: 'ai',
          timestamp: new Date(msg.created_at),
        }));

        const historyMessages = [...userMessages, ...aiMessages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Init history
  const hasLoadedHistory = useRef(false);

  useEffect(() => {
    if (isOpen && !hasLoadedHistory.current) {
      hasLoadedHistory.current = true;
      loadChatHistory();
    }
    if (!isOpen) {
      hasLoadedHistory.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Clear history
  const clearChatHistory = async () => {
    try {
      await apiService.clearChatHistory();
      setMessages([
        {
          id: '1',
          content: "Hi there! 👋 I'm **SalesPulse AI**, your personal data companion. I can help you uncover insights, track trends, or simply answer questions about your sales. What's on your mind?",
          sender: 'ai',
          timestamp: new Date(),
        }
      ]);
      setAiError(null);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  // Streaming text functions
  const streamResponse = (fullText: string, messageId: string) => {
    // Clear any existing stream
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    const words = fullText.split(' ');
    let currentIndex = 0;
    setStreamingMessageId(messageId);
    setStreamingText('');

    const getDelay = (word: string) => {
      // Pause longer on punctuation for natural feel
      if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) return 250;
      if (word.endsWith(',') || word.endsWith(':')) return 160;
      // Random delay for human-like typing
      return Math.random() * 30 + 60; // 60-90ms per word
    };

    const typeNextWord = () => {
      if (currentIndex < words.length) {
        setStreamingText(prev => {
          const separator = currentIndex === 0 ? '' : ' ';
          return prev + separator + words[currentIndex];
        });
        currentIndex++;

        // Schedule next word with variable delay
        streamingIntervalRef.current = setTimeout(
          typeNextWord,
          getDelay(words[currentIndex - 1])
        );
      } else {
        // Streaming complete
        finishStreaming(messageId, fullText);
      }
    };

    // Start streaming
    typeNextWord();

    // Trigger TTS if enabled
    if (isTTSEnabled) {
      speakText(fullText);
    }
  };

  const finishStreaming = (messageId: string, fullText: string) => {
    // Update the message with full text
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, content: fullText } : msg
      )
    );
    setStreamingMessageId(null);
    setStreamingText('');
    if (streamingIntervalRef.current) {
      clearTimeout(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
  };

  const skipStreaming = () => {
    if (streamingMessageId && streamingIntervalRef.current) {
      // Find the message being streamed
      const streamingMessage = messages.find(m => m.id === streamingMessageId);
      if (streamingMessage) {
        // Get the full text from the message content (it should be stored)
        finishStreaming(streamingMessageId, streamingMessage.content || streamingText);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearTimeout(streamingIntervalRef.current);
      }
    };
  }, []);

  // Message Handling

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return; // Prevent duplicate sends

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const aiResponse = await getAIResponse(content);
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: aiResponse, // Store full content
        sender: 'ai',
        timestamp: new Date(),
      };

      // Add message to list (will show as streaming)
      setMessages(prev => [...prev, aiMessage]);

      // Start streaming animation
      streamResponse(aiResponse, aiMessageId);

    } catch (error) {
      // Error is handled in UI via aiError state
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickSuggestion = (query: string) => {
    handleSendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Utility Functions

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : messages;

  // TTS Functions
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel existing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    // Clean text for better speech (remove markdown)
    utterance.text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');

    // Select voice (prefer Google US English or standard)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.1; // Slightly faster natural speed
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleTTS = () => {
    if (isTTSEnabled) {
      stopSpeaking();
      setIsTTSEnabled(false);
    } else {
      setIsTTSEnabled(true);
      // Optional: Speak greeting
      speakText("Voice mode enabled.");
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Render Component

  return (
    <>
      {/* Floating Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 h-10 w-10 md:h-14 md:w-14 rounded-full shadow-2xl hover:shadow-black/20 hover:scale-110 active:scale-95 transition-all duration-300 bg-gradient-to-r from-blue-600 to-violet-600 border-2 border-white/20"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-7 w-7 text-white" />}
      </Button>

      {/* Main Chat Window */}
      {isOpen && (
        <Card className={`fixed z-50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-white/20 backdrop-blur-2xl bg-white/95 dark:bg-slate-950/95 overflow-hidden transition-all duration-300 
          ${isMinimized ? 'h-14 w-72' : 'h-[80vh] sm:h-[600px] w-[90vw] sm:w-[380px]'}
          bottom-20 right-4 sm:bottom-[84px] sm:right-6 rounded-2xl flex flex-col
        `}>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-700 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-white/20 shadow-sm bg-white/10">
                  <AvatarImage src="/logo.png" className="object-cover" />
                  <AvatarFallback className="bg-white/20 text-white"><img src="/logo.png" alt="AI" className="w-full h-full object-cover" /></AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 border-2 border-blue-600 rounded-full ${aiStatus === 'connected' ? 'bg-green-400' :
                  aiStatus === 'checking' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-sm leading-none">SalesPulse AI</h3>
                <span className="text-[10px] text-blue-100 font-medium opacity-80 mt-1">
                  {aiStatus === 'connected' ? 'Online • Powered by Gemini' :
                    aiStatus === 'checking' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-full transition-colors ${isTTSEnabled ? 'text-white bg-white/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  onClick={toggleTTS}
                  title={isTTSEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {isTTSEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:bg-white/20 hover:text-white rounded-full"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
              {!isMinimized && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/80 hover:bg-white/20 hover:text-white rounded-full"
                      title="Clear history"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="z-50">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your conversation history with SalesPulse AI. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearChatHistory} className="bg-red-600 hover:bg-red-700 text-white">
                        Delete History
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {!isMinimized && (
            <>
              {/* Search Bar (Optional) */}
              {searchQuery && (
                <div className="px-4 py-2 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-transparent border-none focus:outline-none"
                      placeholder="Search in chat..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={() => setSearchQuery('')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {aiError && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-2.5 text-amber-700 dark:text-amber-400 text-xs flex items-center shadow-inner">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="font-medium">{aiError}</span>
                </div>
              )}

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4 py-4 bg-slate-50/50 dark:bg-slate-900/50" ref={scrollAreaRef}>
                <div className="space-y-6 pb-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className={`flex max-w-[90%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5`}>
                        {/* Avatar */}
                        <Avatar className={`h-8 w-8 mt-1 border shadow-sm flex-shrink-0 ${message.sender === 'ai' ? 'bg-white border-indigo-200' : 'bg-blue-600 border-blue-600'}`}>
                          {message.sender === 'ai' ? (
                            <AvatarFallback className="bg-white"><img src="/logo.png" alt="AI" className="w-full h-full object-cover" /></AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-blue-600 text-white"><User className="h-4 w-4" /></AvatarFallback>
                          )}
                        </Avatar>

                        {/* Bubble */}
                        <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed relative ${message.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                              }`}
                          >
                            <RichMessageRenderer content={message.id === streamingMessageId ? streamingText : message.content} />
                          </div>
                        </div>

                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-[10px] text-muted-foreground opacity-70">
                            {formatTime(message.timestamp)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyMessage(message.content, message.id)}
                          >
                            {copiedMessageId === message.id ? <span className="text-[10px] font-bold text-green-500">✓</span> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start w-full animate-in fade-in duration-300">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-8 w-8 mt-1 bg-white border border-indigo-200">
                          <AvatarFallback className="bg-white"><img src="/logo.png" alt="AI" className="w-full h-full object-cover" /></AvatarFallback>
                        </Avatar>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm">
                          <div className="flex space-x-1.5 items-center h-4">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800/50">
                {/* Floating Suggestions Popup */}
                {showSuggestions && (
                  <div className="absolute bottom-20 left-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Queries</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowSuggestions(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {quickSuggestions.map((qs, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            handleQuickSuggestion(qs.query);
                            setShowSuggestions(false);
                          }}
                          className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <div className={`p-1.5 rounded-md ${i % 3 === 0 ? 'bg-blue-100 text-blue-600' :
                            i % 3 === 1 ? 'bg-purple-100 text-purple-600' :
                              'bg-emerald-100 text-emerald-600'
                            } mr-3`}>
                            <qs.icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{qs.text}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{qs.query}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner">
                  <Button
                    onClick={toggleVoiceInput}
                    size="icon"
                    variant="ghost"
                    className={`shrink-0 h-9 w-9 rounded-full transition-all ${isListening
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                      }`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  <Button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    size="icon"
                    variant="ghost"
                    className={`shrink-0 h-9 w-9 rounded-full transition-all ${showSuggestions
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                      }`}
                    title="Suggested Queries"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>

                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    className="min-h-[36px] max-h-[120px] py-2 px-1 bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 resize-none text-base sm:text-sm dark:text-slate-200"
                    rows={1}
                  />

                  <Button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    size="icon"
                    className={`shrink-0 h-9 w-9 rounded-full transition-all shadow-sm ${inputValue.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                      }`}
                  >
                    {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                  </Button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400">AI can make mistakes. Verify important information.</p>
                </div>
              </div>
            </>
          )
          }
        </Card >
      )}
    </>
  );
};

export default AIChatbox;