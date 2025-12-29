import React from 'react';
import {
  BarChart3,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Twitter,
  Github,
  Heart,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Main Footer component
const Footer = () => {
  // Function to scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    // Main footer container with gradient background and top border
    <footer className="bg-gradient-card border-t border-border/50 shadow-card mt-auto">
      {/* Main content container with responsive padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Grid layout for footer sections - responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Information Section */}
          <div className="space-y-4">
            {/* Logo and company name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">SalesPulse</h3>
                <p className="text-sm text-muted-foreground">Analytics Dashboard</p>
              </div>
            </div>
            {/* Company description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering businesses with intelligent sales analytics, real-time insights,
              and data-driven decision making tools for sustainable growth.
            </p>
            {/* Social media links */}
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#data" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Login Page/Signup Page
                </a>
              </li>
              <li>
                <a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Ai Analytics
                </a>
              </li>
              <li>
                <a href="#reports" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Reports
                </a>
              </li>
              <li>
                <a href="#goals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Goals & Targets
                </a>
              </li>
              <li>
                <a href="#export" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Export Tools
                </a>
              </li>
            </ul>
          </div>

          {/* Features Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Features</h4>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">Real-time Stock Analytics</li>
              <li className="text-sm text-muted-foreground">Goal Tracking</li>
              <li className="text-sm text-muted-foreground">AI-Powered Insights</li>
              <li className="text-sm text-muted-foreground">Export & Share</li>
              <li className="text-sm text-muted-foreground">Dark/Light Mode</li>
              <li className="text-sm text-muted-foreground">Notifications</li>
              <li className="text-sm text-muted-foreground">Data Visualization</li>
              {/* Additional features that are commented out */}
              {/* <li className="text-sm text-muted-foreground">User Management</li>
              <li className="text-sm text-muted-foreground">Data Analysis</li>
              <li className="text-sm text-muted-foreground">Data Reporting</li>
              <li className="text-sm text-muted-foreground">Data Export</li>
              <li className="text-sm text-muted-foreground">Data Import</li>
              <li className="text-sm text-muted-foreground">Data Cleaning</li>
              <li className="text-sm text-muted-foreground">Data Transformation</li>
              <li className="text-sm text-muted-foreground">Data Loading</li> */}
            </ul>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Contact Us</h4>
            <div className="space-y-3">
              {/* Email contact */}
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {/* <span className="text-sm text-muted-foreground">Feedback</span> */}
                <span className="text-sm text-muted-foreground">support@salespulse.com</span>
              </div>
              {/* Phone contact */}
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">+91-7562867331</span>
              </div>
              {/* Location */}
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Bihar, India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section with copyright and additional links */}
        <div className="mt-8 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright information */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>© 2025 SalesPulse. All rights reserved.</span>
            </div>

            {/* Additional links and scroll to top button */}
            <div className="flex items-center space-x-6 text-sm">
              <a href="#privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              {/* Scroll to top button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={scrollToTop}
                className="h-8 w-8 p-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;