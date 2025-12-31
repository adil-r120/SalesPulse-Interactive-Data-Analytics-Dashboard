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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
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
  const { theme, setTheme } = usePreferences();

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
    <nav className="bg-gradient-card border-b border-border/50 shadow-card sticky top-0 z-30 backdrop-blur-md bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center h-auto min-h-[3.5rem] md:h-16 py-2 md:py-0 transition-all duration-300">

          {/* Row 1: Logo, Title, and Menu (Mobile) */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Sales Analytics</h1>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Business Intelligence Dashboard</p>
              </div>
            </div>

            {/* Mobile Actions: Theme Toggle + Menu */}
            <div className="md:hidden flex items-center gap-2">
              {/* Direct Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
                <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl border-border/50 shadow-xl backdrop-blur-xl bg-background/95">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">User Controls</DropdownMenuLabel>

                  <div className="flex items-center justify-around p-2 bg-muted/50 rounded-lg mb-2">
                    <NotificationCenter />
                    <UserProfile />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navigation Controls Section (Desktop) */}
          <div className="flex items-center space-x-2 sm:space-x-4 w-full md:w-auto justify-end hidden md:flex">
            {/* Desktop Navigation */}
            <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
              {tabs.map((tab) => {
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
            {/* Desktop User Controls */}
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
                  <DropdownMenuItem onSelect={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTheme("system")}>
                    <Laptop className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <UserProfile />
            </div>
          </div >

          {/* Row 2: Mobile Navigation Tabs (Distributed Below) */}
          <div className="md:hidden w-full flex items-center justify-between px-2 mt-2 pt-2 border-t border-border/30 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                      relative flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
                      ${isActive
                      ? 'text-primary bg-primary/10 scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                    `}
                >
                  <Icon className="w-5 h-5 pointer-events-none" />
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full animate-in fade-in zoom-in" />
                  )}
                  <span className="sr-only">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div >
      </div >
    </nav >
  );
};

export default Navigation;