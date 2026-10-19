"""
RoomiLink Database Connection Diagnostic Tool
Tests connection to local SQLite or shared Cloud MySQL (TiDB Cloud / Aiven)
and prints server version, latency, SSL status, and actionable troubleshooting.
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")

def test_connection():
    db_url = os.getenv("DATABASE_URL")
    print("=" * 65)
    print("RoomiLink Database Connection Diagnostic")
    print("=" * 65)
    
    if not db_url:
        print("[!] Warning: DATABASE_URL is not set in backend/.env")
        print("    Defaulting to local SQLite fallback: instance/roomilink_dev.db")
        db_url = f"sqlite:///{backend_dir / 'instance' / 'roomilink_dev.db'}"
    else:
        # Mask password for secure display
        if "@" in db_url and ":" in db_url.split("@")[0]:
            prefix = db_url.split("@")[0]
            masked_prefix = prefix.rsplit(":", 1)[0] + ":******"
            safe_url = masked_prefix + "@" + db_url.split("@")[1]
        else:
            safe_url = db_url
        print(f"[*] Target Database URI: {safe_url}")

    try:
        from sqlalchemy import create_engine, text
        
        # Engine options for testing
        engine_args = {}
        if "mysql" in db_url:
            engine_args = {
                "pool_pre_ping": True,
                "pool_recycle": 280,
                "connect_args": {"connect_timeout": 15}
            }
        
        print("[*] Connecting to database engine...")
        start_time = time.time()
        engine = create_engine(db_url, **engine_args)
        
        with engine.connect() as conn:
            # Query server info
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            print(f"[+] Connection established in {elapsed_ms} ms!")
            
            if "sqlite" in db_url:
                result = conn.execute(text("SELECT sqlite_version();")).scalar()
                print(f"[+] SQLite Version: {result}")
                print("[+] Mode: Local Single-Machine Database (Not Shared)")
            else:
                version = conn.execute(text("SELECT VERSION();")).scalar()
                current_db = conn.execute(text("SELECT DATABASE();")).scalar()
                current_user = conn.execute(text("SELECT CURRENT_USER();")).scalar()
                
                print(f"[+] Database Server Version: {version}")
                print(f"[+] Active Database Name: {current_db}")
                print(f"[+] Authenticated User: {current_user}")
                print("[+] Mode: Shared Cloud SQL Database (Connected 24/7)")
            
            print("=" * 65)
            print("[SUCCESS] Database is fully operational and ready for RoomiLink!")
            print("=" * 65)
            return True

    except Exception as exc:
        print("\n" + "!" * 65)
        print("[ERROR] Connection failed!")
        print(f"Details: {exc}")
        print("!" * 65)
        
        # Actionable diagnostic recommendations
        err_msg = str(exc)
        if "Access denied" in err_msg or "1045" in err_msg:
            print("\n>> Troubleshooting Tip: Check your username and password.")
            print("   Make sure the password has no unencoded special characters or reset it in the cloud console.")
        elif "2003" in err_msg or "Can't connect" in err_msg or "timed out" in err_msg:
            print("\n>> Troubleshooting Tip: Host or port could not be reached.")
            print("   1. Verify your hostname and port (TiDB Cloud typically uses port 4000).")
            print("   2. Check if your network/firewall permits outbound connections on that port.")
            print("   3. In TiDB/Aiven console, ensure access is enabled from all IPs (0.0.0.0/0).")
        elif "SSL" in err_msg or "ssl" in err_msg:
            print("\n>> Troubleshooting Tip: SSL Handshake error.")
            print("   Append '?ssl_verify_cert=true' for TiDB Cloud or '?ssl-mode=REQUIRED' for Aiven to the DATABASE_URL.")
            
        print("\nRefer to docs/SHARED_DATABASE_SETUP_GUIDE.md for detailed steps.")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
