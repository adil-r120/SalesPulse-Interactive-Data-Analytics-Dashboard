import {
  BarChart3,
  Database,
  FileText,
  PlusCircle,
  Target,
  Download,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Laptop
} from "lucide-react";

import { useState } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Custom Components
import NotificationCenter from "./NotificationCenter";
import UserProfile from "./UserProfile";
import { usePreferences } from "@/hooks/use-preferences";

// Define the props interface for the Navigation component
interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Main Navigation component
const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const { setTheme } = usePreferences();

  // Define the navigation tabs with their labels and icons
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "data", label: "Sales Data", icon: Database },
    { id: "add", label: "Add Sale", icon: PlusCircle },
    { id: "reports", label: "Reports & Export", icon: FileText },
    { id: "goals", label: "Goals", icon: Target },
    { id: "stock", label: "Stock Search", icon: Search },
  ];




  return (
    // Main navigation container with styling
    <nav className="bg-gradient-card border-b border-border/50 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo and Title Section */}
          <div className="flex items-center space-x-3">
            {/* Logo container with gradient background */}
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>

            {/* Application title and subtitle */}
            <div>
              <h1 className="text-xl font-bold text-foreground">Sales Analytics</h1>
              <p className="text-sm text-muted-foreground">Business Intelligence Dashboard</p>
            </div>
          </div>

          {/* Navigation Controls Section */}
          <div className="flex items-center space-x-4">

            {/* Desktop Navigation - Hidden on mobile devices */}
            <div className="hidden md:flex space-x-1 bg-muted/50 p-1 rounded-lg">
              {tabs.map((tab) => {
                // Get the icon component for this tab
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Navigation - Visible only on mobile devices */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Main navigation tabs for mobile (first 4 tabs) */}
              <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
                {tabs.slice(0, 4).map((tab) => {
                  // Get the icon component for this tab
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`
                        flex items-center space-x-1 px-2 py-2 rounded-md text-xs font-medium transition-all duration-200
                        ${activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-glow'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown menu for remaining tabs on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {tabs.slice(4).map((tab) => {
                    // Get the icon component for this tab
                    const Icon = tab.icon;

                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className="flex items-center space-x-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* User Controls Section */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <UserProfile />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;