import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useState, useEffect } from "react";

// Type definitions
import { SalesRecord } from "@/hooks/use-sales";

// Custom hooks for data fetching
import { useCategories, useRegions } from "@/hooks/use-sales";
import { useToast } from "@/hooks/use-toast";

// Icons
import { Plus, Save } from "lucide-react";

// API service
import { apiService } from "@/services/api";

// Define the props interface for the AddSaleForm component
interface AddSaleFormProps {
  onAddSale: () => void;
}

// Main AddSaleForm component
const AddSaleForm = ({ onAddSale }: AddSaleFormProps) => {
  // Hook for displaying toast notifications
  const { toast } = useToast();

  // State for managing form data
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product: '',
    category: '',
    quantity: 1,
    price: 0,
    customer: '',
    region: ''
  });

  // Fetch categories and regions data
  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategories();
  const { data: regionsData, isLoading: isRegionsLoading } = useRegions();

  // State for managing form submission loading state
  const [isLoading, setIsLoading] = useState(false);

  // Extract string arrays from the fetched data
  const categories = categoriesData?.categories || [];
  const regions = regionsData?.regions || [];

  // Live Total Calculation
  const totalAmount = formData.quantity * formData.price;

  // FORM HANDLING

  // Handle input changes for form fields
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Validate required fields
    if (!formData.product || !formData.category || !formData.customer || !formData.region) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Set loading state to prevent multiple submissions
    setIsLoading(true);

    try {
      // Submit the new sales record to the API
      await apiService.createSalesRecord({
        date: formData.date,
        product: formData.product,
        category: formData.category,
        quantity: formData.quantity,
        price: formData.price,
        total: formData.quantity * formData.price,
        customer: formData.customer,
        region: formData.region
      });

      // Show success notification
      toast({
        title: "Success",
        description: "Sale record added successfully!",
      });

      // Reset form to initial state
      setFormData({
        date: new Date().toISOString().split('T')[0],
        product: '',
        category: '',
        quantity: 1,
        price: 0,
        customer: '',
        region: ''
      });

      // Notify parent component to refresh data
      onAddSale();
    } catch (error: unknown) {
      // Handle errors and show error notification
      const errorMessage = error instanceof Error ? error.message : "Failed to add sale record.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // Reset loading state regardless of success or failure
      setIsLoading(false);
    }
  };

  // RENDER COMPONENT

  return (
    // Main card container with styling
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
      {/* Form header with icon and title */}
      <div className="flex items-center gap-2 mb-6">
        <Plus className="w-5 h-5 text-sales-accent" />
        <h3 className="text-lg font-semibold text-foreground">Add New Sale</h3>
      </div>

      {/* Form for adding new sales records */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form fields grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date field */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-foreground">
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full"
              required
            />
          </div>

          {/* Product field */}
          <div className="space-y-2">
            <Label htmlFor="product" className="text-sm font-medium text-foreground">
              Product *
            </Label>
            <Input
              id="product"
              value={formData.product}
              onChange={(e) => handleInputChange('product', e.target.value)}
              placeholder="Enter product name"
              className="w-full"
              required
            />
          </div>

          {/* Category field with combobox */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium text-foreground">
              Category *
            </Label>
            {isCategoriesLoading ? (
              // Show loading state while categories are being fetched
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Loading categories..."
                className="w-full"
                disabled
              />
            ) : (
              // Show combobox with available categories
              <Combobox
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                options={categories}
                placeholder="Select or enter category"
              />
            )}
          </div>

          {/* Quantity field */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-medium text-foreground">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className="w-full"
              required
            />
          </div>

          {/* Price field */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium text-foreground">
              Price (₹) *
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className="w-full"
              required
            />
          </div>

          {/* Customer field */}
          <div className="space-y-2">
            <Label htmlFor="customer" className="text-sm font-medium text-foreground">
              Customer *
            </Label>
            <Input
              id="customer"
              value={formData.customer}
              onChange={(e) => handleInputChange('customer', e.target.value)}
              placeholder="Enter customer name"
              className="w-full"
              required
            />
          </div>

          {/* Region field */}
          <div className="space-y-2">
            <Label htmlFor="region" className="text-sm font-medium text-foreground">
              Region *
            </Label>
            {isRegionsLoading ? (
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                placeholder="Loading regions..."
                className="w-full"
                disabled
              />
            ) : (
              <Combobox
                value={formData.region}
                onValueChange={(value) => handleInputChange('region', value)}
                options={regions}
                placeholder="Select or enter region"
              />
            )}
          </div>
        </div>

        {/* Live Total Display */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-lg font-medium text-foreground">
            Total Amount: <span className="text-primary font-bold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Submit button */}
          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            {isLoading ? (
              // Show loading state while submitting
              <>
                <Save className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              // Show normal submit buttons
              <>
                <Save className="w-4 h-4" />
                Save Sale
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AddSaleForm;