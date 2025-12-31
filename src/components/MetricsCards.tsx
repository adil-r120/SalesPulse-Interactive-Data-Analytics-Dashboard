import { useState } from "react";
import { usePreferences } from "@/hooks/use-preferences";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Users,
  BarChart,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiService } from "@/services/api";

// Define the props interface for the MetricsCards component
interface MetricsCardsProps {
  data: {
    totalRevenue: number;
    totalSales: number;
    avgOrderValue: number;
    topProduct: string;
    monthlyGrowth: number;
    totalCustomers: number;
  };
}

interface SalesRecord {
  id: string;
  date: string;
  product: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  region: string;
  customer: string;
}

interface CustomerData {
  name: string;
  totalSpend: number;
  orderCount: number;
  lastOrderDate: string;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
}

// Main MetricsCards component
const MetricsCards = ({ data }: MetricsCardsProps) => {
  const { formatCurrency, currency } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCardClick = async (title: string) => {
    setActiveMetric(title);
    setIsOpen(true);
    setIsLoading(true);

    try {
      // Fetch sales records to populate the views
      // We fetch a larger limit for aggregated views
      const limit = (title === "Customers" || title === "Total Revenue" || title === "Average Order Value") ? 1000 : 50;
      const records = await apiService.getSalesRecords(0, limit);

      if (title === "Total Sales") {
        setSalesData(records);
      } else if (title === "Customers") {
        processCustomerData(records);
      } else if (title === "Total Revenue") {
        processRevenueData(records);
      } else if (title === "Average Order Value") {
        // For AOV, we can reuse the sales data table but maybe sort by value or show different insights
        // For now, let's show the high value orders
        setSalesData(records.sort((a, b) => b.total - a.total).slice(0, 50));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processCustomerData = (records: SalesRecord[]) => {
    const customers: Record<string, CustomerData> = {};

    records.forEach(record => {
      if (!customers[record.customer]) {
        customers[record.customer] = {
          name: record.customer,
          totalSpend: 0,
          orderCount: 0,
          lastOrderDate: record.date
        };
      }

      customers[record.customer].totalSpend += record.total;
      customers[record.customer].orderCount += 1;

      // Update last order date if this record is more recent
      if (new Date(record.date) > new Date(customers[record.customer].lastOrderDate)) {
        customers[record.customer].lastOrderDate = record.date;
      }
    });

    setCustomerData(Object.values(customers).sort((a, b) => b.totalSpend - a.totalSpend));
  };

  const processRevenueData = (records: SalesRecord[]) => {
    const categories: Record<string, number> = {};
    let totalRev = 0;

    records.forEach(record => {
      if (!categories[record.category]) {
        categories[record.category] = 0;
      }
      categories[record.category] += record.total;
      totalRev += record.total;
    });

    const categoryRevenue: CategoryRevenue[] = Object.entries(categories).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRev > 0 ? (revenue / totalRev) * 100 : 0
    }));

    setCategoryData(Object.values(categoryRevenue).sort((a, b) => b.revenue - a.revenue));
  };

  // Define the metrics data with titles, values, icons, colors, and change percentages
  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      icon: IndianRupee,
      color: "sales-primary",
      change: data.monthlyGrowth,
    },
    {
      title: "Total Sales",
      value: data.totalSales.toLocaleString(),
      icon: ShoppingCart,
      color: "sales-secondary",
      change: 8.2,
    },
    {
      title: "Average Order Value",
      value: formatCurrency(data.avgOrderValue),
      icon: BarChart,
      color: "sales-accent",
      change: 3.1,
    },
    {
      title: "Customers",
      value: data.totalCustomers.toLocaleString(),
      icon: Users,
      color: "sales-warning",
      change: 12.5,
    },
  ];

  const getDialogDescription = (metric: string | null) => {
    switch (metric) {
      case "Total Sales":
        return "Recent sales transactions and their details.";
      case "Customers":
        return "Overview of your top customers and their spending.";
      case "Total Revenue":
        return "Revenue breakdown by product category.";
      case "Average Order Value":
        return "Top high-value orders contributing to your average.";
      default:
        return "Metric details";
    }
  };

  return (
    <>
      {/* Grid container for all metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          // Get the icon component for this metric
          const Icon = metric.icon;

          // Determine if the change is positive or negative for styling
          const isPositive = metric.change > 0;

          return (
            // Individual metric card with hover effects and styling
            <Card
              key={index}
              className="p-6 bg-gradient-card border-border/50 shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer active:scale-95"
              onClick={() => handleCardClick(metric.title)}
            >
              <div className="flex items-center justify-between">
                {/* Metric information section */}
                <div>
                  {/* Metric title */}
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>

                  {/* Metric value */}
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{metric.value}</p>

                  {/* Change indicator with trend icon */}
                  <div className="flex items-center mt-2">
                    {Number(metric.value.replace(/[^0-9.-]+/g, "")) !== 0 && (
                      <>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4 text-sales-accent mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-sales-danger mr-1" />
                        )}
                        <span className={`text-sm font-medium ${isPositive ? 'text-sales-accent' : 'text-sales-danger'}`}>
                          {isPositive ? '+' : ''}{metric.change}% from last month
                        </span>
                      </>
                    )}
                    {Number(metric.value.replace(/[^0-9.-]+/g, "")) === 0 && (
                      <span className="text-sm font-medium text-muted-foreground">
                        No data available
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric icon with colored background */}
                <div className={`p-3 rounded-full bg-${metric.color}/10`}>
                  <Icon className={`w-6 h-6 text-${metric.color}`} />
                </div>
              </div>
            </Card >
          );
        })}
      </div>

      {/* Details Dialog */}
      < Dialog open={isOpen} onOpenChange={setIsOpen} >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeMetric} Details</DialogTitle>
            <DialogDescription>
              {getDialogDescription(activeMetric)}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-4">
              {activeMetric === "Total Sales" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.date}</TableCell>
                        <TableCell className="font-medium">{sale.product}</TableCell>
                        <TableCell>{sale.customer}</TableCell>
                        <TableCell>{sale.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeMetric === "Customers" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Total Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerData.map((customer, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.lastOrderDate}</TableCell>
                        <TableCell className="text-center">{customer.orderCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.totalSpend)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeMetric === "Total Revenue" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue Contribution</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.map((cat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right">{cat.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeMetric === "Average Order Value" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Order Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.date}</TableCell>
                        <TableCell className="font-medium">{sale.product}</TableCell>
                        <TableCell>{sale.customer}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(sale.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MetricsCards;