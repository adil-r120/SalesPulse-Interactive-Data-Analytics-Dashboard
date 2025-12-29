import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, Users, ShoppingBag } from "lucide-react";
import { useOverview } from "@/hooks/use-overview";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AIDailyInsightProps {
    onNavigate?: () => void;
}

const AIDailyInsight = ({ onNavigate }: AIDailyInsightProps) => {
    const { data: overview, isLoading } = useOverview();
    const navigate = useNavigate();

    if (isLoading || !overview) return null;

    // Insight Generation Logic
    const getInsight = () => {
        // 1. Growth Insight
        if (overview.monthly_growth > 10) {
            return {
                icon: <TrendingUp className="h-5 w-5 text-green-600" />,
                title: "Revenue is surging!",
                message: `You're up ${overview.monthly_growth.toFixed(1)}% this month. Great time to reinvest in ads for your top category.`,
                action: "View Trends",
                path: "/?tab=dashboard#sales-charts"
            };
        }
        if (overview.monthly_growth < -10) {
            return {
                icon: <TrendingDown className="h-5 w-5 text-red-500" />,
                title: "Revenue needs a boost",
                message: `You're down ${Math.abs(overview.monthly_growth).toFixed(1)}%. Consider running a discount campaign to drive volume.`,
                action: "Create Sale",
                path: "/?tab=add"
            };
        }

        // 2. Product Insight
        if (overview.top_product && overview.top_product !== "N/A") {
            return {
                icon: <ShoppingBag className="h-5 w-5 text-indigo-500" />,
                title: "Top Seller Alert",
                message: `"${overview.top_product}" is your best performer. Ensure you have enough inventory for the weekend!`,
                action: "Manage Inventory",
                path: "/?tab=data"
            };
        }

        // 3. Customer Insight (Fallback)
        return {
            icon: <Users className="h-5 w-5 text-blue-500" />,
            title: "Growing Community",
            message: `You now have ${overview.customer_count} customers. Send a thank-you email to encourage repeat purchases.`,
            action: "Customer List",
            path: "/?tab=data"
        };
    };

    const insight = getInsight();

    return (
        <Card className="mb-6 overflow-hidden border-indigo-100 dark:border-indigo-900 bg-gradient-to-r from-white to-indigo-50/50 dark:from-slate-950 dark:to-indigo-950/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-800">
                        <Sparkles className="h-6 w-6 text-indigo-500 fill-indigo-100 dark:fill-indigo-900/50" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                                AI Daily Insight
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                                New
                            </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                            {insight.message}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto pl-12 md:pl-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (insight.path.includes("#")) {
                                const elementId = insight.path.split("#")[1];
                                const element = document.getElementById(elementId);
                                if (element) {
                                    element.scrollIntoView({ behavior: "smooth" });
                                }
                            }
                            navigate(insight.path);
                            if (onNavigate) onNavigate();
                        }}
                        className="w-full md:w-auto border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    >
                        {insight.action}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <span className="sr-only">Dismiss</span>
                        {/* Simple close icon logic could go here, for now just a placeholder action */}
                    </Button>
                </div>

            </div>
        </Card>
    );
};

export default AIDailyInsight;
