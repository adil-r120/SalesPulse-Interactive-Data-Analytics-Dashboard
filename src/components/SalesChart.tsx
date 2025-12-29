import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Custom hooks
import { useRevenueTrend, useSalesByCategory } from "@/hooks/use-sales";
import { usePreferences } from "@/hooks/use-preferences";
import { useMemo } from "react";

// React hooks and components
import { useState } from "react";
import {
  BarChartIcon,
  PieChartIcon,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Chart colors
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

// Custom tooltip for revenue trend
const CustomTooltip = ({ active, payload, label, currency }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{`Month: ${label}`}</p>
        {payload.map((entry: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === 'revenue'
              ? `${entry.name}: ${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'}${Number(entry.value).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`
              : `${entry.name}: ${entry.value} sales`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip for categories
const CategoryTooltip = ({ active, payload, currency }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return (
      <div className="bg-background/90 backdrop-blur border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-sm">Revenue: {symbol}{Number(data.revenue).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}</p>
        <p className="text-sm">Sales: {data.sales.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}</p>
        <p className="text-sm">Percentage: {data.value.toFixed(2)}%</p>
      </div>
    );
  }
  return null;
};

// Main SalesChart Component
const SalesChart = () => {
  const { currency, formatCurrency } = usePreferences();
  // Fetch data
  const { data: revenueTrendData, isLoading: isRevenueTrendLoading, error: revenueTrendError } = useRevenueTrend();
  const { data: salesByCategoryData, isLoading: isSalesByCategoryLoading, error: salesByCategoryError } = useSalesByCategory();

  // Chart type state
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  // Format revenue data
  const formattedRevenueTrend = revenueTrendData?.map(item => ({
    month: item.month,
    revenue: item.revenue,
    sales: item.sales_count,
  })) || [];



  // Format category data
  const formattedSalesByCategory = salesByCategoryData?.map((item, index) => ({
    name: item.category === 'Home & Garden' ? 'Homes' : item.category,
    value: item.percentage,
    revenue: item.revenue,
    sales: item.sales_count,
    color: COLORS[index % COLORS.length]
  })) || [];

  // Sort categories
  const sortedSalesByCategory = [...formattedSalesByCategory].sort((a, b) => b.revenue - a.revenue);

  // Loading state
  if (isRevenueTrendLoading || isSalesByCategoryLoading) {
    return <div className="flex items-center justify-center h-64">Loading charts...</div>;
  }

  // Error state
  if (revenueTrendError || salesByCategoryError) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading chart data</div>;
  }

  // Calculate metrics
  const totalRevenue = salesByCategoryData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const totalSales = salesByCategoryData?.reduce((sum, item) => sum + item.sales_count, 0) || 0;
  const topCategory = salesByCategoryData?.length ?
    salesByCategoryData.reduce((max, item) => item.revenue > max.revenue ? item : max, salesByCategoryData[0]) : null;

  // Trend metrics
  const latestMonthData = formattedRevenueTrend.length > 0 ? formattedRevenueTrend[formattedRevenueTrend.length - 1] : null;
  const previousMonthData = formattedRevenueTrend.length > 1 ? formattedRevenueTrend[formattedRevenueTrend.length - 2] : null;

  // Growth calculation
  let growthPercentage = 0;
  let growthIcon = <Minus className="h-4 w-4 text-muted-foreground" />;
  let growthColor = "text-muted-foreground";

  // Calculate growth if data exists
  if (latestMonthData && previousMonthData && previousMonthData.revenue > 0) {
    growthPercentage = ((latestMonthData.revenue - previousMonthData.revenue) / previousMonthData.revenue) * 100;

    if (growthPercentage > 0) {
      growthIcon = <TrendingUp className="h-4 w-4 text-success" />;
      growthColor = "text-success";
    } else if (growthPercentage < 0) {
      growthIcon = <TrendingDown className="h-4 w-4 text-destructive" />;
      growthColor = "text-destructive";
    }
  }

  return (
    // Charts layout
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="sales-charts">

      {/* Revenue Trend Chart */}
      <Card className="p-6 bg-gradient-card border-border/50 shadow-card">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Monthly Revenue Trend</h3>

          {/* Latest data */}
          <div className="flex items-center gap-2">
            {latestMonthData && (
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(latestMonthData.revenue)}</p>
                <div className="flex items-center justify-end gap-1">
                  {growthIcon}
                  <span className={`text-xs ${growthColor}`}>
                    {growthPercentage !== 0 ? `${Math.abs(growthPercentage).toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Total Revenue */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="font-semibold text-sm">
              {formatCurrency(formattedRevenueTrend.reduce((sum, item) => sum + item.revenue, 0))}
            </p>
          </div>

          {/* Avg Revenue */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Avg. Monthly</p>
            <p className="font-semibold text-sm">
              {formattedRevenueTrend.length > 0
                ? formatCurrency(formattedRevenueTrend.reduce((sum, item) => sum + item.revenue, 0) / formattedRevenueTrend.length)
                : formatCurrency(0)}
            </p>
          </div>

          {/* Growth Rate */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Growth Rate</p>
            <p className={`font-semibold text-sm ${growthColor}`}>
              {growthPercentage > 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          {formattedRevenueTrend.length > 0 ? (
            <LineChart data={formattedRevenueTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickMargin={10}
                interval={0}
              />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (currency === 'INR') return `₹${(value / 100000).toFixed(0)}L`;
                  return `${currency === 'EUR' ? '€' : '$'}${(value / 1000).toFixed(0)}K`
                }}
                tickMargin={10}
                width={60}
              />

              <Tooltip content={<CustomTooltip currency={currency} />} />

              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--sales-primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--sales-primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>



              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--sales-primary))"
                strokeWidth={4}
                dot={{ fill: 'hsl(var(--sales-primary))', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 10, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                name="Revenue"
                animationDuration={500}
                animationEasing="ease-out"
              />

              <Line
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--sales-secondary))"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--sales-secondary))', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                yAxisId="right"
                name="Sales Count"
                animationDuration={500}
                animationEasing="ease-out"
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickMargin={10}
                width={40}
              />

              <Legend
                verticalAlign="top"
                height={40}
                formatter={(value) => <span className="text-foreground text-xs font-medium">{value}</span>}
              />
            </LineChart>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">No revenue data available</p>
                <p className="text-sm text-muted-foreground mt-2">Add sales records to see revenue trends</p>
              </div>
            </div>
          )}
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center mt-2 text-xs text-muted-foreground">
          <div className="flex items-center mr-4">
            <div className="w-3 h-0.5 bg-[hsl(var(--sales-primary))] mr-2"></div>
            <span>Revenue ({currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'})</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-[hsl(var(--sales-secondary))] mr-2"></div>
            <span>Sales Count</span>
          </div>
        </div>
      </Card>

      {/* Category Chart */}
      <Card className="p-6 bg-gradient-card border-border/50 shadow-card">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Sales by Category</h3>

          {/* Toggles */}
          <div className="flex gap-2">
            <Button
              variant={chartType === 'pie' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('pie')}
              className="h-8 px-2"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-8 px-2"
            >
              <BarChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Total Revenue */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="font-semibold text-sm">{formatCurrency(totalRevenue)}</p>
          </div>

          {/* Total Sales */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="font-semibold text-sm">{totalSales.toLocaleString('en-IN')}</p>
          </div>

          {/* Top Category */}
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Top Category</p>
            <p className="font-semibold text-sm truncate" title={topCategory?.category === 'Home & Garden' ? 'Homes' : topCategory?.category}>
              {topCategory?.category === 'Home & Garden' ? 'Homes' : topCategory?.category || 'N/A'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={sortedSalesByCategory}
                cx="45%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                  const percentage = (percent * 100).toFixed(1);
                  // if (parseFloat(percentage) < 2) return null; // Showing all labels now

                  const RADIAN = Math.PI / 180;
                  // Push labels further out (radius * 1.6) for better spacing
                  const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);

                  // Capitalize category name
                  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="hsl(var(--foreground))"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      {`${capitalizedName} ${percentage}%`}
                    </text>
                  );
                }}
                labelLine={true}
              >
                {sortedSalesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip content={<CategoryTooltip currency={currency} />} />

              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                formatter={(value, entry, index) => {
                  const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
                  return (
                    <span className="text-xs text-foreground">{capitalizedValue}</span>
                  );
                }}
              />
            </PieChart>
          ) : (
            <BarChart
              data={sortedSalesByCategory}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />

              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (currency === 'INR') return `₹${(value / 1000).toFixed(0)}K`;
                  return `${currency === 'EUR' ? '€' : '$'}${(value / 1000).toFixed(0)}K`
                }}
                width={60}
              />

              <Tooltip content={<CategoryTooltip currency={currency} />} />

              <Bar dataKey="revenue" name="Revenue">
                {sortedSalesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default SalesChart;