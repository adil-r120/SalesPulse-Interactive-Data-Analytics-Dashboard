import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

// Interface for goal data structure
export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  target_date: string;
  category: string;
  status: string;
  progress_percentage: number;
  created_at: string;
}

// Interface for creating a new goal
interface CreateGoalData {
  title: string;
  description?: string;
  target_value: number;
  target_date: string;
  category: string;
}

// Interface for updating an existing goal
interface UpdateGoalData {
  title?: string;
  description?: string;
  target_value?: number;
  target_date?: string;
  category?: string;
  current_value?: number;
  status?: string;
}

// Hook to fetch goals with optional status filter
export const useGoals = (status?: string) => {
  return useQuery<Goal[]>({
    queryKey: ["goals", status],
    queryFn: async () => {
      try {
        const response = await apiService.getGoals(status);
        // The response should already match the Goal interface
        return response;
      } catch (error) {
        console.error('Error fetching goals:', error);
        throw error;
      }
    },
    // Add retry and error handling options
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to create a new goal
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateGoalData) => apiService.createGoal({
      title: data.title,
      description: data.description,
      target_value: data.target_value,
      current_value: 0, // New goals start with 0 current amount
      target_date: data.target_date,
      category: data.category,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
    }
  });
};

// Hook to update an existing goal
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalData }) => 
      apiService.updateGoal(id, {
        title: data.title,
        description: data.description,
        target_value: data.target_value,
        target_date: data.target_date,
        category: data.category,
        current_value: data.current_value,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
    }
  });
};

// Hook to delete a goal
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
    }
  });
};