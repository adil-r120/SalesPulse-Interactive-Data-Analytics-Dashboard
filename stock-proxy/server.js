// Stock Proxy Server for Yahoo Finance API
// This server acts as a proxy to fetch stock market data from Yahoo Finance
// It provides a simplified API interface for the frontend application
// Includes fallback mock data for when the Yahoo Finance API is unavailable

import express from "express";
import cors from "cors";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const YahooFinance = require("yahoo-finance2").default; // Class
const yahooFinance = new YahooFinance(); // Instance

// Create Express application
const app = express();
// Enable CORS for cross-origin requests
app.use(cors());
// Define server port
const PORT = 5000;

// Mock stock data with realistic values (Fallback)
const mockStockData = {
  // "AAPL": { c: 175.43, o: 173.44, h: 176.89, l: 173.21, pc: 173.09, currency: "USD" },
  "TSLA": { c: 248.50, o: 252.30, h: 255.30, l: 246.75, pc: 253.70, currency: "USD" },
  "MSFT": { c: 378.85, o: 375.20, h: 380.25, l: 375.40, pc: 374.18, currency: "USD" },
  "GOOGLE": { c: 142.67, o: 141.80, h: 143.50, l: 141.20, pc: 141.44, currency: "USD" },
  "AMZN": { c: 155.89, o: 156.20, h: 157.10, l: 155.20, pc: 156.64, currency: "USD" },
  "RELIANCE.NS": { c: 2550.50, o: 2540.20, h: 2565.75, l: 2535.30, pc: 2545.40, currency: "INR" },
  "TCS.NS": { c: 3750.25, o: 3740.80, h: 3775.50, l: 3735.20, pc: 3745.60, currency: "INR" },
  "INFY.NS": { c: 1550.75, o: 1540.30, h: 1565.40, l: 1535.10, pc: 1545.20, currency: "INR" },
  "HDFCBANK.NS": { c: 1750.25, o: 1740.80, h: 1765.50, l: 1735.20, pc: 1745.60, currency: "INR" },
  "ICICIBANK.NS": { c: 1050.75, o: 1040.30, h: 1065.40, l: 1035.10, pc: 1045.20, currency: "INR" }
};

// Stock data endpoint
app.get("/api/stock", async (req, res) => {
  // Extract stock symbol from query parameters
  const symbol = req.query.symbol;
  // Validate symbol parameter
  if (!symbol) return res.status(400).json({ error: "Missing symbol parameter" });

  try {
    // Fetch live stock data from Yahoo Finance
    const quote = await yahooFinance.quote(symbol);
    console.log(`Quote for ${symbol}:`, JSON.stringify(quote, null, 2));

    // Check if data was returned
    if (!quote) {
      throw new Error("No data returned from Yahoo Finance");
    }

    // Map Yahoo Finance data to standardized format
    // Finnhub: c (current), d (change), dp (change percent), h (high), l (low), o (open), pc (previous close)
    const current = quote.regularMarketPrice;
    const prevClose = quote.regularMarketPreviousClose;
    const open = quote.regularMarketOpen;
    const high = quote.regularMarketDayHigh;
    const low = quote.regularMarketDayLow;
    const change = quote.regularMarketChange;
    const changePercent = quote.regularMarketChangePercent;

    // Determine currency for the stock
    let currency = quote.currency;
    if (!currency) {
      // Check for Indian stock exchanges
      if (symbol.endsWith(".NS") || symbol.endsWith(".BO") || symbol.endsWith(".BSE") || symbol.endsWith(".NSE")) {
        currency = "INR";
      } else {
        currency = "USD";
      }
    }

    console.log("Sending response with currency:", currency); // Debug log

    // Return standardized stock data
    res.json({
      symbol,
      current: current,
      open: open,
      high: high,
      low: low,
      prevClose: prevClose,
      change: change ? change.toFixed(2) : (current - prevClose).toFixed(2),
      changePercent: changePercent ? changePercent.toFixed(2) : (((current - prevClose) / prevClose) * 100).toFixed(2),
      currency: currency // Return currency
    });

  } catch (err) {
    console.error("Error fetching stock:", err.message);

    // Fallback to mock data on error
    console.log("Error occurred, using mock data for symbol:", symbol);
    const normalizedSymbol = symbol.toUpperCase();

    // Check if we have specific mock data for this symbol
    if (mockStockData[normalizedSymbol]) {
      const mockData = mockStockData[normalizedSymbol];
      const randomFactor = 1 + (Math.random() - 0.5) * 0.02; // ±1% variation
      const current = mockData.c * randomFactor;
      const change = current - mockData.pc;
      const changePercent = (change / mockData.pc) * 100;

      return res.json({
        symbol,
        current: parseFloat(current.toFixed(2)),
        open: mockData.o,
        high: mockData.h,
        low: mockData.l,
        prevClose: mockData.pc,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        currency: mockData.currency || "USD"
      });
    } else {
      // If we don't have mock data for this specific symbol, generate generic mock data
      // based on the symbol name hash to be consistent
      const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const basePrice = 100 + (seed % 900); // Price between 100 and 1000

      return res.json({
        symbol,
        current: basePrice,
        open: basePrice * 0.99,
        high: basePrice * 1.01,
        low: basePrice * 0.98,
        prevClose: basePrice * 0.995,
        change: (basePrice * 0.005).toFixed(2),
        changePercent: "0.50",
        currency: "USD"
      });
    }
  }

});

// Historical Data Endpoint
app.get("/api/history", async (req, res) => {
  const symbol = req.query.symbol;
  const interval = req.query.interval || "1d"; // 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
  const range = req.query.range || "1mo"; // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max

  if (!symbol) return res.status(400).json({ error: "Missing symbol parameter" });

  try {
    const queryOptions = { period1: range, interval: interval }; // period1 is used as range in node-yahoo-finance2 somewhat loosely or we use queryOptions properly

    // The yahoo-finance2 chart API is better for history
    const queryResult = await yahooFinance.chart(symbol, {
      period1: range, // 1d, 5d, 1mo, etc
      interval: interval,
    });

    if (!queryResult || !queryResult.quotes) {
      throw new Error("No historical data returned");
    }

    // Format data for frontend (recharts or lightweight-charts)
    // We will return standard array of objects
    const history = queryResult.quotes.map(q => ({
      time: q.date, // Date object or string
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume
    })).filter(q => q.close !== null); // Filter out nulls which can happen

    res.json({
      symbol,
      interval,
      range,
      data: history
    });

  } catch (err) {
    console.error(`Error fetching history for ${symbol}:`, err.message);

    // Mock history generation
    const mockHistory = [];
    const now = new Date();
    const days = range === '1d' ? 1 : range === '1mo' ? 30 : 7;
    const points = 50;

    let basePrice = 150;
    if (mockStockData[symbol.toUpperCase()]) {
      basePrice = mockStockData[symbol.toUpperCase()].c;
    }

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * (86400000 / points) * days));
      const randomChange = (Math.random() - 0.5) * 2;
      basePrice += randomChange;
      mockHistory.push({
        time: time.toISOString(),
        open: basePrice,
        high: basePrice + Math.random(),
        low: basePrice - Math.random(),
        close: basePrice + (Math.random() - 0.5),
        volume: Math.floor(Math.random() * 10000)
      });
    }

    res.json({
      symbol,
      mock: true,
      data: mockHistory
    });
  }
});

// Start the server
app.listen(PORT, () =>
  console.log(`✅ Real-time Stock API (Yahoo Finance) running on http://localhost:${PORT}`)
);