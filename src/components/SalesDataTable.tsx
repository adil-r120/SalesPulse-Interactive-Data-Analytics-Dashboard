import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { usePreferences } from "@/hooks/use-preferences";

// Type definitions
import { SalesRecord } from "@/hooks/use-sales";

// Custom hooks
import { useDeleteSalesRecord } from "@/hooks/use-sales";
import { useToast } from "@/hooks/use-toast";

// Define the props interface for the SalesDataTable component
interface SalesDataTableProps {
  data: SalesRecord[];
}

// Main SalesDataTable component
const SalesDataTable = ({ data }: SalesDataTableProps) => {
  const { formatCurrency } = usePreferences();
  // State for managing the search term
  const [searchTerm, setSearchTerm] = useState("");

  // Hook for deleting sales records with loading state
  const { mutate: deleteSalesRecord, isPending: isDeleting } = useDeleteSalesRecord();

  // Hook for displaying toast notifications
  const { toast } = useToast();

  // DATA FILTERING

  // Filter sales data based on search term across multiple fields
  const filteredData = data.filter(record =>
    record.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.region && record.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // EXPORT FUNCTIONALITY

  // Export filtered data to CSV format
  const exportToCSV = () => {
    // Create CSV content with headers and data rows
    const csvContent = [
      // Header row
      ['Date', 'Product', 'Category', 'Quantity', 'Price', 'Total', 'Region', 'Customer'],

      // Data rows
      ...filteredData.map(record => [
        record.date,
        record.product,
        record.category,
        record.quantity.toString(),
        formatCurrency(record.price),
        formatCurrency(record.total),
        record.region || '',
        record.customer
      ])
    ]
      // Join rows with newlines
      .map(row => row.join(','))
      .join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // DELETE FUNCTIONALITY

  // Handle deletion of a sales record with confirmation and feedback
  const handleDelete = (id: string, product: string) => {
    // Confirm deletion with user
    if (window.confirm(`Are you sure you want to delete the sale record for "${product}"?`)) {
      // Call delete mutation with success and error handlers
      deleteSalesRecord(id, {
        onSuccess: () => {
          // Show success notification
          toast({
            title: "Success",
            description: "Sale record deleted successfully!",
          });
        },
        onError: (error: unknown) => {
          // Extract error message and show error notification
          const errorMessage = error instanceof Error ? error.message : "Failed to delete sale record.";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      });
    }
  };

  // RENDER COMPONENT

  return (
    // Main card container with styling
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">

      {/* Header section with title and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Section title */}
        <h3 className="text-lg font-semibold text-foreground">Sales Transactions</h3>

        {/* Search and export controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search input with icon */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          {/* Export to CSV button */}
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table container with horizontal scrolling */}
      <div className="overflow-x-auto">
        {/* Sales data table */}
        <table className="w-full">
          {/* Table header */}
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qty</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>

          {/* Table body with sales data */}
          <tbody>
            {filteredData.map((record) => (
              // Individual row for each sales record
              <tr key={record.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                {/* Date */}
                <td className="py-3 px-4 text-sm text-foreground">{record.date}</td>

                {/* Product name */}
                <td className="py-3 px-4 text-sm font-medium text-foreground">{record.product}</td>

                {/* Category with styling */}
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {record.category === 'Home & Garden' ? 'Homes' : record.category}
                  </span>
                </td>

                {/* Quantity */}
                <td className="py-3 px-4 text-sm text-right text-foreground">{record.quantity}</td>

                {/* Price */}
                <td className="py-3 px-4 text-sm text-right text-foreground">{formatCurrency(record.price)}</td>

                {/* Total amount with accent color */}
                <td className="py-3 px-4 text-sm text-right font-medium text-sales-accent">{formatCurrency(record.total)}</td>

                {/* Region */}
                <td className="py-3 px-4 text-sm text-muted-foreground">{record.region || 'N/A'}</td>

                {/* Customer name */}
                <td className="py-3 px-4 text-sm text-foreground">{record.customer}</td>

                {/* Action buttons */}
                <td className="py-3 px-4 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(record.id, record.product)}
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state message when no data matches search */}
      {filteredData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found matching your search.
        </div>
      )}
    </Card>
  );
};

export default SalesDataTable;