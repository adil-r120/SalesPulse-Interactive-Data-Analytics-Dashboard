import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

// Interface for sales record data structure
export interface SalesRecord {
  id: string;
  date: string;
  product: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  region: string;
  customer: string;
  created_at: string;
}

// Interface for revenue trend data structure
export interface RevenueTrend {
  month: string;
  revenue: number;
  sales_count: number;
}

// Interface for category sales data structure
export interface CategoryData {
  category: string;
  revenue: number;
  sales_count: number;
  percentage: number;
}

// Hook to fetch sales records with optional filtering parameters
export const useSalesRecords = (params?: { skip?: number; limit?: number; category?: string; region?: string }) => {
  return useQuery<SalesRecord[]>({
    queryKey: ["sales-records", params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
      if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
      if (params?.category) searchParams.append("category", params.category);
      if (params?.region) searchParams.append("region", params.region);

      const queryString = searchParams.toString();
      const url = queryString ? `/api/sales-records?${queryString}` : "/api/sales-records";
      return apiService.get(url);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch revenue trend data for a specified number of months
export const useRevenueTrend = (months: number = 12) => {
  return useQuery<RevenueTrend[]>({
    queryKey: ["revenue-trend", months],
    queryFn: () => apiService.getRevenueTrend(months),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch sales data grouped by category
export const useSalesByCategory = () => {
  return useQuery<CategoryData[]>({
    queryKey: ["sales-by-category"],
    queryFn: () => apiService.getSalesByCategory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch available product categories
export const useCategories = () => {
  return useQuery<{ categories: string[] }>({
    queryKey: ["categories"],
    queryFn: () => apiService.get("/api/categories"),
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch available regions
export const useRegions = () => {
  return useQuery<{ regions: string[] }>({
    queryKey: ["regions"],
    queryFn: () => apiService.get("/api/regions"),
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to delete a sales record with automatic data refetching
export const useDeleteSalesRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteSalesRecord(id),
    onSuccess: () => {
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["sales-records"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-trend"] });
      queryClient.invalidateQueries({ queryKey: ["sales-by-category"] });
    },
  });
};