import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Pause, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { INDIAN_STOCKS_LIST as INDIAN_STOCKS, formatStockCurrency } from '@/lib/stock-utils';

// Stock data interface
interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  high24h: number;
  low24h: number;
  sparklineData: { date: string; price: number }[];
  open: number;
  prevClose: number;
  currency?: string;
}



// Main StockMarketWidget component
const StockMarketWidget = () => {
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<typeof INDIAN_STOCKS>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Custom Watchlist State
  const [watchedStocks, setWatchedStocks] = useState<typeof INDIAN_STOCKS>(() => {
    const saved = localStorage.getItem('salespulse_watched_stocks');
    return saved ? JSON.parse(saved) : INDIAN_STOCKS;
  });

  // Save to localStorage whenever list changes
  useEffect(() => {
    localStorage.setItem('salespulse_watched_stocks', JSON.stringify(watchedStocks));
  }, [watchedStocks]);

  // Add stock handler
  const addToWatchlist = (symbol: string, name?: string) => {
    if (watchedStocks.some(s => s.symbol === symbol)) {
      toast.error('Stock already in watchlist');
      return;
    }
    const newStock = { symbol, name: name || symbol };
    const newList = [...watchedStocks, newStock];
    setWatchedStocks(newList);
    setCurrentIndex(newList.length - 1); // Switch to new stock
    setIsPlaying(false);
    setSearchTerm('');
    setShowSearchResults(false);
    toast.success(`Added ${symbol} to watchlist`);
  };

  // Remove stock handler
  const removeFromWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // Prevent triggering selection
    if (watchedStocks.length <= 1) {
      toast.error('Cannot remove the last stock');
      return;
    }

    const newList = watchedStocks.filter(s => s.symbol !== symbol);
    setWatchedStocks(newList);

    // Adjust index if needed
    if (currentIndex >= newList.length) {
      setCurrentIndex(0);
    }
    toast.success('Stock removed from watchlist');
  };

  // Fetch stock by symbol
  const fetchStockDataBySymbol = async (symbol: string) => {
    try {
      // Fetch both current data and history in parallel
      const [stockResponse, historyResponse] = await Promise.all([
        fetch(`/stock-api/api/stock?symbol=${encodeURIComponent(symbol)}`),
        fetch(`/stock-api/api/history?symbol=${encodeURIComponent(symbol)}&range=1d&interval=15m`)
      ]);

      const data = await stockResponse.json();

      let sparklineData = [];

      // Try to parse history data
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.data && historyData.data.length > 0) {
          sparklineData = historyData.data.map((item: any) => ({
            date: new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: item.close
          }));
        }
      }

      // Fallback if history failed or empty (use simulated data based on current price)
      if (sparklineData.length === 0) {
        const basePrice = data.current || 100;
        const volatility = Math.abs(data.change / basePrice) || 0.01;
        for (let i = 19; i >= 0; i--) {
          const timeFactor = i / 20;
          const noise = (Math.random() - 0.5) * volatility * basePrice * 2;
          const price = basePrice - (data.change * (1 - timeFactor)) + noise;
          sparklineData.push({
            date: `${20 - i}m`,
            price: Math.max(0, price)
          });
        }
      }

      if (stockResponse.ok && data) {
        return {
          symbol: data.symbol,
          companyName: watchedStocks.find(s => s.symbol === symbol)?.name || data.symbol,
          currentPrice: data.current,
          change: parseFloat(data.change),
          changePercent: parseFloat(data.changePercent),
          marketCap: 0,
          volume: 0,
          high24h: data.high,
          low24h: data.low,
          sparklineData,
          open: data.open,
          prevClose: data.prevClose,
          currency: data.currency
        };
      }

      throw new Error(data.error || 'Stock data not found');
    } catch (err) {
      console.error('Error fetching stock data:', err);
      throw new Error('Failed to fetch stock data');
    }
  };

  // Fetch current stock
  const fetchCurrentStock = useCallback(async () => {
    if (watchedStocks.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Safety check for index
      const safeIndex = currentIndex % watchedStocks.length;
      const symbol = watchedStocks[safeIndex].symbol;
      const data = await fetchStockDataBySymbol(symbol);
      setStockData(data);
      setLastUpdated(new Date()); // Update the timestamp
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
      // If error, move to next stock automatically after a short delay
      setTimeout(() => {
        if (isPlaying) {
          setCurrentIndex((prev) => (prev + 1) % watchedStocks.length);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [currentIndex, isPlaying, watchedStocks]);

  // Retry fetch
  const retryFetch = useCallback(() => {
    fetchCurrentStock();
  }, [fetchCurrentStock]);

  // Initial fetch and update when index changes
  useEffect(() => {
    fetchCurrentStock();
  }, [fetchCurrentStock]);

  // Auto-cycle timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && watchedStocks.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % watchedStocks.length);
      }, 3000); // Change every 3 seconds for more dynamic feel
    }

    return () => clearInterval(interval);
  }, [isPlaying, watchedStocks.length]);

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Filter stocks based on symbol or company name (from ALL known Indian stocks list + current watched)
    // For now, we search within the default list + watched list to avoid duplicates
    const allKnownStocks = [...INDIAN_STOCKS];
    // Add any custom ones in watchedStocks that aren't in INDIAN_STOCKS
    watchedStocks.forEach(ws => {
      if (!allKnownStocks.some(ks => ks.symbol === ws.symbol)) {
        allKnownStocks.push(ws);
      }
    });

    const filtered = allKnownStocks.filter(stock =>
      stock.symbol.toLowerCase().includes(term.toLowerCase()) ||
      stock.name.toLowerCase().includes(term.toLowerCase())
    );

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Selection handler
  const handleStockSelect = (symbol: string, name?: string) => {
    // Check if it's already in the watchlist
    const existingIndex = watchedStocks.findIndex(stock => stock.symbol === symbol);

    if (existingIndex !== -1) {
      // Select it
      setCurrentIndex(existingIndex);
    } else {
      // Add it
      addToWatchlist(symbol, name);
    }

    setIsPlaying(false);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };



  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSearchResults && event.target instanceof Element) {
        const searchContainer = document.querySelector('.relative.mt-2');
        if (searchContainer && !searchContainer.contains(event.target)) {
          setShowSearchResults(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Keyboard nav
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      (e.target as HTMLInputElement).blur();
      setSearchTerm(''); // Clear on escape
      return;
    }

    // ... (rest of keyboard nav logic same)
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        handleStockSelect(searchResults[0].symbol, searchResults[0].name);
      } else if (searchTerm.trim()) {
        // Allow adding custom symbol on enter if no results
        handleStockSelect(searchTerm.toUpperCase(), searchTerm.toUpperCase());
      }
    }
  };

  // Button keyboard handler
  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    // ... (logic mostly same, just pass name to handler)
    if (e.key === 'Enter') {
      e.preventDefault();
      const stock = searchResults[index];
      handleStockSelect(stock.symbol, stock.name);
    }
  };

  // Render
  return (
    <Card className="w-full shadow-lg overflow-hidden relative border-none bg-background/80 backdrop-blur-xl transition-all duration-300 hover:shadow-xl group">


      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Stock Market
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md font-mono">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div className="flex bg-muted/30 rounded-lg p-0.5 border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={retryFetch}
                className="h-7 w-7 rounded-md hover:bg-background shadow-none"
                title="Refresh Data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-7 w-7 rounded-md hover:bg-background shadow-none"
                title={isPlaying ? "Pause Rotation" : "Resume Rotation"}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </Button>
            </div>
          </div>
        </CardTitle>

        {/* Search Bar */}
        <div className="relative mt-2 group">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search symbol (e.g. RELIANCE.NS)..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pr-20 bg-muted/30 border-muted-foreground/10 focus:bg-background transition-all duration-300 rounded-xl"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              {searchTerm ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="h-6 w-6 hover:bg-muted/50 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </Button>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mr-2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
              {searchResults.length > 0 ? (
                searchResults.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleStockSelect(stock.symbol, stock.name)}
                    onKeyDown={(e) => handleButtonKeyDown(e, index)}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary/5 flex justify-between items-center focus:bg-muted focus:outline-none border-b border-border/30 last:border-none transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-sm">{stock.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">{stock.name}</span>
                    </div>
                    {watchedStocks.some(s => s.symbol === stock.symbol) && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Watching</span>
                    )}
                  </button>
                ))
              ) : (
                <button
                  onClick={() => handleStockSelect(searchTerm.toUpperCase(), searchTerm.toUpperCase())}
                  className="w-full text-left px-4 py-3 hover:bg-primary/5 text-primary font-medium flex items-center justify-between transition-colors"
                >
                  <span className="text-sm">Add "{searchTerm.toUpperCase()}"</span>
                  <div className="bg-primary/10 p-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {loading && !stockData ? (
          <div className="flex flex-col items-center justify-center py-8 h-[250px] animate-pulse">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-sm text-muted-foreground font-medium">Connecting to market...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center h-[250px] bg-destructive/5 rounded-xl border border-destructive/10 mx-2">
            <AlertCircle className="h-8 w-8 text-destructive/80 mb-2" />
            <p className="text-destructive font-semibold">Connection Error</p>
            <p className="text-muted-foreground text-xs mt-1 mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={retryFetch}
              className="border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              Retry Connection
            </Button>
          </div>
        ) : stockData ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Stock header */}
            <div className="flex flex-row items-center justify-between px-1 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 truncate pr-2">
                  {stockData.companyName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {stockData.symbol}
                  </span>

                  {/* Remove Button for Current Stock */}
                  <button
                    onClick={(e) => removeFromWatchlist(e, stockData.symbol)}
                    className="text-[10px] px-2 py-0.5 bg-destructive/5 text-destructive/80 rounded hover:bg-destructive/15 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 duration-200"
                    title="Remove from watchlist"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="text-right shrink-0">
                <p className="text-2xl sm:text-3xl font-bold tracking-tighter tabular-nums transition-all duration-300">
                  {formatStockCurrency(stockData.currentPrice, stockData.symbol, stockData.currency)}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span
                    className={`flex items-center text-sm font-semibold px-2 py-0.5 rounded-full ${stockData.change >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                  >
                    {stockData.change >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 mr-1" />
                    )}
                    {Math.abs(stockData.changePercent).toFixed(2)}%
                  </span>
                  <span className={`text-xs font-medium tabular-nums ${stockData.change >= 0 ? 'text-emerald-600/70' : 'text-rose-600/70'
                    }`}>
                    {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sparkline chart */}
            <div className="h-36 sm:h-44 w-full bg-gradient-to-b from-background to-muted/20 rounded-xl p-0.5 border border-border/40 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25 pointer-events-none"></div>

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stockData.sparklineData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={stockData.change >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={stockData.change >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    hide={true}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    hide={true}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass px-3 py-2 rounded-lg shadow-xl border border-white/20 ring-1 ring-black/5">
                            <p className="font-bold text-sm tabular-nums">
                              {formatStockCurrency(payload[0].value as number, stockData.symbol, stockData.currency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 font-medium">
                              {payload[0].payload.date}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="natural"
                    dataKey="price"
                    stroke={stockData.change >= 0 ? "#10b981" : "#f43f5e"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 4,
                      fill: stockData.change >= 0 ? "#10b981" : "#f43f5e",
                      stroke: "white"
                    }}
                    animationDuration={1500}
                  />
                  <Line
                    type="natural"
                    dataKey="price"
                    stroke="none"
                    fill="url(#colorPrice)"
                    fillOpacity={1}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pagination dots (with remove capability) */}
            <div className="flex justify-center items-center gap-1.5 pt-1 pb-1 max-w-full overflow-hidden">
              {watchedStocks.map((stock, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`transition-all duration-500 rounded-full !border-none !outline-none !p-0 ${idx === currentIndex
                    ? '!w-6 !h-1.5 bg-primary shadow-sm shadow-primary/30'
                    : '!w-1.5 !h-1.5 !min-w-[6px] !min-h-[6px] bg-muted-foreground/20 hover:bg-primary/40'
                    }`}
                  title={stock.name}
                  aria-label={`Switch to ${stock.name}`}
                />
              ))}
            </div>

            <p className="text-[10px] text-center text-muted-foreground/50">
              Auto-rotating every 3s • Click dot to pause
            </p>

          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};


export default StockMarketWidget;