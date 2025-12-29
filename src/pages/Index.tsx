import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import MetricsCards from "@/components/MetricsCards";
import SalesChart from "@/components/SalesChart";
import SalesDataTable from "@/components/SalesDataTable";
import AddSaleForm from "@/components/AddSaleForm";
import AIDailyInsight from "@/components/AIDailyInsight";
import ReportsPage from "@/components/ReportsPage";
import SalesGoals from "@/components/SalesGoals";
import ExportTools from "@/components/ExportTools";
import StockMarketWidget from "@/components/StockMarketWidget";
import StockSearch from "@/components/StockSearch";
import Footer from "@/components/Footer";
import { useOverview } from "@/hooks/use-overview";
import { useSalesRecords } from "@/hooks/use-sales";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

// Main Index component
const Index = () => {
  // State for managing active tab in navigation
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchParams, setSearchParams] = useSearchParams();
  // Get query client for data invalidation
  const queryClient = useQueryClient();

  // Date Range State
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  // Prepare date filters
  const dateFilters = date?.from ? {
    start_date: format(date.from, "yyyy-MM-dd"),
    end_date: date.to ? format(date.to, "yyyy-MM-dd") : undefined
  } : undefined;

  // Fetch overview data from API with filters
  const { data: overviewData, isLoading: isOverviewLoading, error: overviewError } = useOverview(dateFilters);
  // Fetch sales records from API
  const { data: salesData, isLoading: isSalesLoading, error: salesError, refetch } = useSalesRecords({ limit: 100 });

  // Force refetch sales data when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Sync tab with URL search params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Transform overview data to match the expected format for MetricsCards component
  const metrics = overviewData ? {
    totalRevenue: overviewData.total_revenue,
    totalSales: overviewData.total_sales,
    avgOrderValue: overviewData.avg_order_value,
    topProduct: overviewData.top_product,
    monthlyGrowth: overviewData.monthly_growth,
    totalCustomers: overviewData.customer_count,
  } : {
    totalRevenue: 0,
    totalSales: 0,
    avgOrderValue: 0,
    topProduct: "N/A",
    monthlyGrowth: 0,
    totalCustomers: 0,
  };

  // Function to refresh all data when changes occur
  const handleDataChange = () => {
    // Invalidate all relevant queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["sales-records"] });
    queryClient.invalidateQueries({ queryKey: ["revenue-trend"] });
    queryClient.invalidateQueries({ queryKey: ["sales-by-category"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["regions"] });
  };

  // Sync state with URL when tab changes manually
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "dashboard") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Function to render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Header with Date Picker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {date?.from && (
                  <Button variant="ghost" onClick={() => setDate(undefined)} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Show loading, error, or metrics cards based on data state */}
            {isOverviewLoading ? (
              <div className="flex justify-center p-8">Loading overview data...</div>
            ) : overviewError ? (
              <div className="text-destructive p-4 border border-destructive/20 rounded-md">Error loading overview data: {overviewError.message}</div>
            ) : (
              <>
                <AIDailyInsight />
                <MetricsCards data={metrics} />
              </>
            )}
            {/* Stock market widget and sales charts for dashboard view */}
            <StockMarketWidget />
            <SalesChart />
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            {isSalesLoading ? (
              <div>Loading sales data...</div>
            ) : salesError ? (
              <div>Error loading sales data: {salesError.message}</div>
            ) : (
              <SalesDataTable data={salesData || []} />
            )}
          </div>
        );

      case "add":
        // Add sale form with callback to refresh data after submission
        return <AddSaleForm onAddSale={handleDataChange} />;

      case "reports":
        return (
          <div className="space-y-6">
            {/* Reports page with sales data */}
            <ReportsPage data={salesData || []} />
            {/* Export tools with converted data format */}
            {/* Convert SalesRecord[] to Record<string, unknown>[] for ExportTools */}
            <ExportTools
              data={(salesData || []).map(record => ({
                id: record.id,
                date: record.date,
                product: record.product,
                category: record.category,
                quantity: record.quantity,
                price: record.price,
                total: record.total,
                region: record.region,
                customer: record.customer
              }))}
              reportType="Sales Report"
            />
          </div>
        );

      case "goals":
        // Sales goals tracking component
        return <SalesGoals />;

      case "stock":
        return (
          <div className="space-y-6">
            {/* Stock search component */}
            <StockSearch />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    // Main layout with navigation, content area, and conditional footer
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation bar with tab switching */}
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main content area with responsive padding */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {renderContent()}
      </main>

      {/* Footer shown on all pages except dashboard */}
      {activeTab !== "dashboard" && <Footer />}
    </div>
  );
};

export default Index;