import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility function to merge class names with Tailwind CSS
// Combines clsx (for conditional classes) with twMerge (for Tailwind conflicts)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}