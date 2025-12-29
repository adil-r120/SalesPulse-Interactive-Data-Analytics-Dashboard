"""
SalesPulse Backend Runner
Simple script to run the backend server
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

def main():
    """Run the SalesPulse backend server"""
    
    # Load environment variables
    from pathlib import Path
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    environment = os.getenv("ENVIRONMENT", "development")
    reload = environment == "development"
    
    print("Starting SalesPulse Backend")
    print("=" * 40)
    print(f"Server: http://{host}:{port}")
    print(f"API Docs: http://{host}:{port}/docs")
    print(f"Health Check: http://{host}:{port}/health")
    print(f"Auto-reload: {reload}")
    print(f"Environment: {environment}")
    print("=" * 40)
    
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"\nServer error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
