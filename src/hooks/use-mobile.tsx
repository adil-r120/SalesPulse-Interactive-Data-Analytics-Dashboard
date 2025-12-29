import * as React from "react"

// Define the mobile breakpoint in pixels
const MOBILE_BREAKPOINT = 768

// Hook to detect if the current device is mobile
export function useIsMobile() {
  // State to track mobile detection status
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  // Effect to handle mobile detection and window resize events
  React.useEffect(() => {
    // Create media query listener for mobile breakpoint
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler function to update mobile detection state
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add event listener for media query changes
    mql.addEventListener("change", onChange)
    
    // Set initial mobile detection state
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup function to remove event listener
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Return boolean value indicating mobile status
  return !!isMobile
}