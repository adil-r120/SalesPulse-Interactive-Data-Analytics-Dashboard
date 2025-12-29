import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp } from "lucide-react";
import { SalesRecord } from "@/hooks/use-sales";
import { usePreferences } from "@/hooks/use-preferences";

interface ReportsPageProps {
  data: SalesRecord[];
}

const ReportsPage = ({ data }: ReportsPageProps) => {
  const { formatCurrency } = usePreferences();

  const generateReport = (reportType: string) => {
    let reportData: (string | number)[][] = [];
    let filename = '';

    switch (reportType) {
      case 'category': {
        const categoryStats = data.reduce((acc, record) => {
          if (!acc[record.category]) {
            acc[record.category] = { totalSales: 0, totalRevenue: 0, count: 0 };
          }
          acc[record.category].totalSales += record.quantity;
          acc[record.category].totalRevenue += record.total;
          acc[record.category].count += 1;
          return acc;
        }, {} as Record<string, { totalSales: number; totalRevenue: number; count: number }>);

        reportData = Object.entries(categoryStats).map(([category, stats]) => [
          category,
          stats.count,
          stats.totalSales,
          formatCurrency(stats.totalRevenue)
        ]);

        reportData.unshift(['Category', 'Transactions', 'Units Sold', 'Total Revenue']);
        filename = 'sales-by-category.csv';
        break;
      }

      case 'region': {
        const regionStats = data.reduce((acc, record) => {
          if (!acc[record.region]) {
            acc[record.region] = { totalSales: 0, totalRevenue: 0, count: 0 };
          }
          acc[record.region].totalSales += record.quantity;
          acc[record.region].totalRevenue += record.total;
          acc[record.region].count += 1;
          return acc;
        }, {} as Record<string, { totalSales: number; totalRevenue: number; count: number }>);

        reportData = Object.entries(regionStats).map(([region, stats]) => [
          region,
          stats.count,
          stats.totalSales,
          formatCurrency(stats.totalRevenue)
        ]);

        reportData.unshift(['Region', 'Transactions', 'Units Sold', 'Total Revenue']);
        filename = 'sales-by-region.csv';
        break;
      }

      case 'monthly': {
        const monthlyStats = data.reduce((acc, record) => {
          const month = record.date.substring(0, 7);
          if (!acc[month]) {
            acc[month] = { totalSales: 0, totalRevenue: 0, count: 0 };
          }
          acc[month].totalSales += record.quantity;
          acc[month].totalRevenue += record.total;
          acc[month].count += 1;
          return acc;
        }, {} as Record<string, { totalSales: number; totalRevenue: number; count: number }>);

        reportData = Object.entries(monthlyStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, stats]) => [
            month,
            stats.count,
            stats.totalSales,
            formatCurrency(stats.totalRevenue)
          ]);

        reportData.unshift(['Month', 'Transactions', 'Units Sold', 'Total Revenue']);
        filename = 'monthly-sales.csv';
        break;
      }
    }

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reports = [
    {
      title: 'Sales by Category',
      description: 'Detailed breakdown of sales performance across all product categories',
      type: 'category',
      icon: TrendingUp
    },
    {
      title: 'Sales by Region',
      description: 'Geographic analysis of sales distribution and regional performance',
      type: 'region',
      icon: TrendingUp
    },
    {
      title: 'Monthly Sales Trends',
      description: 'Monthly sales performance and growth trends over time',
      type: 'monthly',
      icon: TrendingUp
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Sales Reports</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate comprehensive sales reports to analyze performance, identify trends, and make data-driven decisions for your business.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <Card key={report.type} className="p-6 bg-gradient-card border-border/50 shadow-card hover:shadow-glow transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>

              <Button
                onClick={() => generateReport(report.type)}
                className="w-full bg-gradient-primary hover:bg-gradient-secondary transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-sales-primary mb-1">
              {data.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Transactions</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-sales-secondary mb-1">
              {formatCurrency(data.reduce((sum, record) => sum + record.total, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-sales-accent mb-1">
              {new Set(data.map(record => record.category)).size}
            </div>
            <div className="text-sm text-muted-foreground">Product Categories</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;