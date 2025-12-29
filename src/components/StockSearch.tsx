import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Star, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/api';
import { formatStockCurrency, formatLargeNumber } from '@/lib/stock-utils';

// Type Definitions

// Define TypeScript interface for stock data
interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  currency?: string; // Add currency field
}

// Main Component

// Main StockSearch component
const StockSearch = () => {
  // State for managing search term, stock data, loading state, and errors
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback form state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>(''); // Track user role
  const { toast } = useToast();

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const profile = await apiService.getProfile();
        setUserRole(profile.role || '');
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUserRole();
  }, []);

  // Data Fetching

  // Function to fetch stock data using our backend proxy
  const fetchStockData = async (symbol: string) => {
    // Set loading state and clear any previous errors
    setLoading(true);
    setError(null);

    try {
      // Make API request to backend proxy to fetch stock data
      const response = await fetch(`/stock-api/api/stock?symbol=${encodeURIComponent(symbol)}`);
      const data = await response.json();

      // Handle API errors
      if (!response.ok || !data) {
        throw new Error(data.error || `No results found for "${symbol}"`);
      }

      // Transform API response into StockData interface
      const stockInfo: StockData = {
        symbol: data.symbol,
        companyName: data.symbol, // Finnhub doesn't provide company name in quote endpoint
        currentPrice: data.current,
        change: parseFloat(data.change), // Convert string to number
        changePercent: parseFloat(data.changePercent), // Convert string to number
        previousClose: data.prevClose,
        open: data.open,
        dayHigh: data.high,
        dayLow: data.low,
        volume: 0, // Not provided by Finnhub quote endpoint
        marketCap: 0, // Not provided by Finnhub quote endpoint
        currency: data.currency // Add currency from backend response
      };

      // Update state with fetched stock data
      setStockData(stockInfo);
    } catch (err) {
      // Handle and display errors
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data. Please try again.');
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  // Event Handlers

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Only search if we have a valid search term
    if (searchTerm.trim()) {
      fetchStockData(searchTerm.trim().toUpperCase());
    }
  };

  // Handle feedback form submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate rating
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingFeedback(true);

    try {
      // Submit to backend API
      await apiService.submitStockFeedback({
        rating,
        feedback: feedback.trim() || undefined,
        stock_symbol: stockData?.symbol || undefined,
      });

      // Success notification
      toast({
        title: "✨ Thank You!",
        description: `Your ${rating}-star feedback has been saved. We appreciate your input!`,
      });

      // Reset form
      setRating(0);
      setFeedback('');
    } catch (error) {
      // Error notification
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Formatting Functions





  // Render Component

  return (
    // Main container with max width
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Main card container with enhanced styling */}
      <Card className="w-full shadow-lg border-none bg-background/80 backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
        {/* Card header with enhanced styling */}
        <CardHeader className="space-y-1.5 pb-6 border-b border-border/50">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Stock Search
            </span>
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            Search for any company to view real-time market data
          </CardDescription>
        </CardHeader>

        {/* Card content with search form and results */}
        <CardContent className="pt-6">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Enter stock symbol (e.g. AAPL, TSLA)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary/50" />
                </div>
              </div>
              <p className="mt-4 text-muted-foreground font-medium animate-pulse">Analyzing market data...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-destructive/5 rounded-xl border border-destructive/10 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-3 bg-destructive/10 rounded-full mb-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-destructive font-bold text-lg">Unable to Fetch Data</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">{error}</p>
              <Button
                variant="outline"
                className="mt-4 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => fetchStockData(searchTerm.trim().toUpperCase())}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Stock data display */}
          {stockData && !loading && !error && (
            <Card className="border-none shadow-none p-0 bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-0">
                <div className="space-y-6">
                  {/* Company header with name, symbol, price, and change */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{stockData.companyName}</h3>
                      <p className="text-muted-foreground font-mono text-sm mt-1 bg-background/50 inline-block px-2 py-0.5 rounded border border-border/50">
                        {stockData.symbol}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 text-right">
                      <p className="text-3xl font-bold tracking-tighter tabular-nums">
                        {formatStockCurrency(stockData.currentPrice, stockData.symbol, stockData.currency)}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={`flex items-center text-sm font-semibold px-2 py-0.5 rounded-full ${stockData.change >= 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                          }`}>
                          {stockData.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {Math.abs(stockData.changePercent).toFixed(2)}%
                        </span>
                        <span className={`text-sm font-medium tabular-nums ${stockData.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                          {stockData.change >= 0 ? '+' : ''}{formatStockCurrency(stockData.change, stockData.symbol, stockData.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock metrics grid with key financial data */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Previous Close", value: formatStockCurrency(stockData.previousClose, stockData.symbol, stockData.currency) },
                      { label: "Open", value: formatStockCurrency(stockData.open, stockData.symbol, stockData.currency) },
                      { label: "Day High", value: formatStockCurrency(stockData.dayHigh, stockData.symbol, stockData.currency), className: "text-emerald-600" },
                      { label: "Day Low", value: formatStockCurrency(stockData.dayLow, stockData.symbol, stockData.currency), className: "text-rose-600" }
                    ].map((item, i) => (
                      <div key={i} className="bg-background dark:bg-muted/10 rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-colors shadow-sm">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`font-semibold text-lg tabular-nums ${item.className || ''}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state with example stocks */}
          {!stockData && !loading && !error && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Popular stocks to track:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { symbol: 'AAPL', name: 'Apple' },
                  { symbol: 'RELIANCE.NS', name: 'Reliance' },
                  { symbol: 'TCS.NS', name: 'TCS' },
                  { symbol: 'TSLA', name: 'Tesla' },
                  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' }
                ].map((stock) => (
                  <Button
                    key={stock.symbol}
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-muted/30 border-muted-foreground/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                    onClick={() => {
                      setSearchTerm(stock.symbol);
                      fetchStockData(stock.symbol);
                    }}
                  >
                    <span className="font-semibold mr-1">{stock.symbol}</span>
                    <span className="opacity-70 font-normal">{stock.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section - Hidden for Admin users */}
      {userRole !== 'Admin' && (
        <>
          {/* Feedback Form Card - Compact Version */}
          <Card className="w-full shadow-md border-none bg-background/60 backdrop-blur-lg">
            <CardHeader className="space-y-1 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">Share Feedback</CardTitle>
              </div>
              <CardDescription className="text-xs">Help us improve your experience</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                {/* Star Rating - Compact */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Rate Your Experience</label>
                  <div className="bg-muted/30 rounded-md p-2 border flex justify-center">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-1 focus:ring-primary rounded-full p-0.5"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`h-5 w-5 transition-all duration-200 ${star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feedback Text - Compact */}
                <div className="space-y-1">
                  <Textarea
                    id="feedback-text"
                    placeholder="Any comments? (Optional)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[60px] h-[60px] resize-none text-xs"
                    maxLength={500}
                  />
                </div>

                {/* Submit Button - Compact */}
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StockSearch;