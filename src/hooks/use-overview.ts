import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";

// Interface for overview metrics data structure
export interface OverviewMetrics {
  total_revenue: number;
  total_sales: number;
  avg_order_value: number;
  customer_count: number;
  monthly_growth: number;
  top_product: string;
  top_category: string;
  top_region: string;
}

// Hook to fetch dashboard overview metrics
export const useOverview = (filters?: { start_date?: string; end_date?: string }) => {
  return useQuery<OverviewMetrics>({
    queryKey: ["overview", filters],
    queryFn: () => apiService.getOverview(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};