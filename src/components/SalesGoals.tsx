import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  TrendingUp,
  Calendar,
  Plus,
  Edit3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield // Added Admin Icon
} from 'lucide-react';
import { toast } from 'sonner';

import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/use-goals';
import { format } from 'date-fns';
import { useAuth } from "@/hooks/use-auth"; // Added Auth Hook
import AdminDashboard from "./AdminDashboard"; // Added Admin Component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs

interface GoalForm {
  title: string;
  target_value: number;
  target_date: string;
  category: string;
  description?: string;
}

const SalesGoals = () => {
  const { user } = useAuth(); // Get current user
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [newGoal, setNewGoal] = useState<GoalForm>({
    title: '',
    target_value: 0,
    target_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'revenue',
    description: ''
  });

  const { data: goals = [], isLoading, isError, error } = useGoals();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const handleAddGoal = async () => {
    try {
      await createGoalMutation.mutateAsync(newGoal);
      setNewGoal({
        title: '',
        target_value: 0,
        target_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'revenue',
        description: ''
      });
      setIsAddingGoal(false);
      toast.success('Goal created successfully! 🎯');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal. Please try again.');
    }
  };

  const handleUpdateGoal = async (id: string) => {
    try {
      await updateGoalMutation.mutateAsync({ id, data: newGoal });
      setEditingGoalId(null);
      setNewGoal({
        title: '',
        target_value: 0,
        target_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'revenue',
        description: ''
      });
      toast.success('Goal updated successfully! ✅');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal. Please try again.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoalMutation.mutateAsync(id);
      toast.success('Goal deleted successfully! 🗑️');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal. Please try again.');
    }
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      title: goal.title,
      target_value: goal.target_value,
      target_date: goal.target_date,
      category: goal.category,
      description: goal.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setNewGoal({
      title: '',
      target_value: 0,
      target_date: format(new Date(), 'yyyy-MM-dd'),
      category: 'revenue',
      description: ''
    });
  };

  const getProgressPercentage = (goal: any) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getStatus = (goal: any) => {
    const progress = getProgressPercentage(goal);
    const today = new Date();
    const deadline = new Date(goal.target_date);
    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (progress >= 100) return 'completed';
    if (progress >= 90) return 'exceeded';
    if (progress >= 70) return 'on-track';
    if (daysRemaining < 7 && progress < 70) return 'behind';
    return 'on-track';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'exceeded': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'on-track': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'behind': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'exceeded': return <TrendingUp className="h-4 w-4" />;
      case 'on-track': return <Target className="h-4 w-4" />;
      case 'behind': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const formatValue = (value: number, category: string) => {
    if (category === 'revenue') {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (category === 'conversion') {
      return `${value}%`;
    }
    return value.toString();
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Sales Goals & Targets</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading goals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Sales Goals & Targets</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Error loading goals: {error?.message || 'Unknown error'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }



  // If user is Admin, show Tabs. Otherwise just show Goals directly.
  return (
    <div className="space-y-6">
      <Tabs defaultValue="goals" className="w-full">
        {user?.role === "Admin" && (
          <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
            <TabsTrigger value="goals">Sales Goals</TabsTrigger>
            <TabsTrigger value="admin">
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="goals">
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Sales Goals & Targets</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full sm:w-auto"
                  onClick={() => setIsAddingGoal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Goal List Content (Moved inside Tab) */}
              {(isAddingGoal || editingGoalId) && (
                <div className="p-4 rounded-lg border bg-card/50 mb-4">
                  <h4 className="font-medium text-sm mb-3">
                    {editingGoalId ? 'Edit Goal' : 'Add New Goal'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Goal Title</label>
                      <input
                        type="text"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                        className="w-full p-2 text-sm border rounded"
                        placeholder="e.g. Monthly Revenue Target"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Target Value</label>
                        <input
                          type="number"
                          value={newGoal.target_value}
                          onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                          className="w-full p-2 text-sm border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Deadline</label>
                        <input
                          type="date"
                          value={newGoal.target_date}
                          onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                          className="w-full p-2 text-sm border rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Category</label>
                      <select
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                        className="w-full p-2 text-sm border rounded"
                      >
                        <option value="revenue">Revenue</option>
                        <option value="sales">Sales</option>
                        <option value="customers">Customers</option>
                        <option value="conversion">Conversion</option>
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={editingGoalId ? () => handleUpdateGoal(editingGoalId) : handleAddGoal}
                        disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                      >
                        {createGoalMutation.isPending || updateGoalMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={editingGoalId ? handleCancelEdit : () => setIsAddingGoal(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {goals.map((goal: any) => {
                const progress = getProgressPercentage(goal);
                const status = getStatus(goal);
                const daysRemaining = getDaysRemaining(goal.target_date);
                const isCompleted = progress >= 100;
                const isBehind = progress < 70 && daysRemaining < 7;

                return (
                  <div key={goal.id} className="p-4 rounded-lg border bg-card/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm">{goal.title}</h4>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getStatusColor(status)}`}
                          >
                            {getStatusIcon(status)}
                            <span className="ml-1 capitalize">{status.replace('-', ' ')}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{daysRemaining}d left</span>
                          </span>
                          <span className="capitalize">{goal.category}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditGoal(goal)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={deleteGoalMutation.isPending}
                        >
                          {deleteGoalMutation.isPending && deleteGoalMutation.variables === goal.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatValue(goal.current_value, goal.category)} / {formatValue(goal.target_value, goal.category)}
                        </span>
                        <span className={`font-medium ${isCompleted ? 'text-green-600' : isBehind ? 'text-red-600' : 'text-blue-600'}`}>
                          {progress.toFixed(1)}%
                        </span>
                      </div>

                      <Progress
                        value={progress}
                        className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' :
                          isBehind ? '[&>div]:bg-red-500' :
                            '[&>div]:bg-blue-500'
                          }`}
                      />

                      {isCompleted && (
                        <div className="flex items-center space-x-1 text-green-600 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          <span>Goal achieved! 🎉</span>
                        </div>
                      )}

                      {isBehind && !isCompleted && (
                        <div className="flex items-center space-x-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Behind schedule - needs attention</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {goals.length === 0 && !isAddingGoal && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No goals yet. Add your first goal to get started!</p>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-2xl font-bold text-blue-600">{goals.length}</div>
                    <div className="text-xs text-muted-foreground">Active Goals</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="text-2xl font-bold text-green-600">
                      {goals.length > 0
                        ? `${Math.round(goals.reduce((acc: number, goal: any) => acc + getProgressPercentage(goal), 0) / goals.length)}%`
                        : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg. Progress</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === "Admin" && (
          <TabsContent value="admin">
            <AdminDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SalesGoals;