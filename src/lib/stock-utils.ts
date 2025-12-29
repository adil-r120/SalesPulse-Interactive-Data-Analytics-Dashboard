
// Utility functions for stock market data

export const INDIAN_STOCKS_LIST = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
    { symbol: 'INFY.NS', name: 'Infosys' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
    { symbol: 'ITC.NS', name: 'ITC Limited' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceuticals' },
    { symbol: 'TITAN.NS', name: 'Titan Company' },
    { symbol: 'WIPRO.NS', name: 'Wipro' }
];

/**
 * Checks if a stock symbol belongs to an Indian exchange
 */
export const isIndianStock = (symbol: string, currencyCode?: string): boolean => {
    // Check explicit currency code
    if (currencyCode && currencyCode.toUpperCase() === 'INR') return true;

    if (!symbol) return false;
    const upperSymbol = symbol.toUpperCase();

    return (
        upperSymbol.endsWith('.NS') ||
        upperSymbol.endsWith('.BO') ||
        upperSymbol.endsWith('.BSE') ||
        upperSymbol.endsWith('.NSE') ||
        upperSymbol.endsWith('.IN') ||
        // Common Indian company names/keywords
        upperSymbol.includes('RELIANCE') ||
        upperSymbol.includes('TCS') ||
        upperSymbol.includes('HDFC') ||
        upperSymbol.includes('ICICI') ||
        upperSymbol.includes('INFY') ||
        upperSymbol.includes('ITC') ||
        upperSymbol.includes('SBIN') ||
        upperSymbol.includes('BHARTI') ||
        upperSymbol.includes('MARUTI') ||
        upperSymbol.includes('LARSEN') || // LT usually maps to this
        upperSymbol.includes('AXISBANK')
    );
};

/**
 * Formats a numeric value as currency based on the stock symbol/currency
 */
export const formatStockCurrency = (value: number, symbol: string, currencyCode?: string): string => {
    if (isIndianStock(symbol, currencyCode)) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(value);
    }

    // Default to USD or provided currency
    const currency = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(value);
};

/**
 * Formats large numbers (Market Cap, Volume) with appropriate suffixes (K, M, B, Cr, L)
 */
export const formatLargeNumber = (value: number, symbol: string, currencyCode?: string): string => {
    const isIndian = isIndianStock(symbol, currencyCode);

    if (isIndian) {
        // Format in Indian Rupees with Indian numbering system (Crores, Lakhs)
        if (value >= 10_000_000) { // 1 Crore
            return `₹${(value / 10_000_000).toFixed(2)}Cr`;
        }
        if (value >= 100_000) { // 1 Lakh
            return `₹${(value / 100_000).toFixed(2)}L`;
        }
        return `₹${value.toLocaleString('en-IN')}`;

    } else {
        // Format in International system (Billions, Millions)
        const currencySymbol = currencyCode && currencyCode.toUpperCase() !== 'USD' ? `${currencyCode.toUpperCase()} ` : '$';

        if (value >= 1_000_000_000) {
            return `${currencySymbol}${(value / 1_000_000_000).toFixed(2)}B`;
        }
        if (value >= 1_000_000) {
            return `${currencySymbol}${(value / 1_000_000).toFixed(2)}M`;
        }
        if (value >= 1_000) {
            return `${currencySymbol}${(value / 1_000).toFixed(2)}K`;
        }
        return `${currencySymbol}${value.toFixed(2)}`;
    }
};
