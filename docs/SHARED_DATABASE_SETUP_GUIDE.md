# RoomiLink — Shared Cloud SQL Database Setup Guide

This guide details the plan, architecture, and step-by-step instructions for connecting RoomiLink to a **shared, free Cloud MySQL database**. This ensures that multiple developers, team members, or deployed frontends and backends share the same live data (users, properties, rooms, rental agreements, and payments).

---

## 1. Architecture Overview

### Current State (Local SQLite) vs Shared Cloud Database

```
[CURRENT LOCAL SETUP]
Developer 1 Machine  ---> instance/roomilink_dev.db  (Only visible to Developer 1)
Developer 2 Machine  ---> instance/roomilink_dev.db  (Only visible to Developer 2)
Deployed Server      ---> instance/roomilink_dev.db  (Empty, data wiped on redeploy)

[SHARED CLOUD MYSQL SETUP]
Developer 1 (Local)  ----\
Developer 2 (Local)  -----\
Vercel/Frontend      ------> [ RoomiLink Backend ] ---> [ Free Cloud MySQL Database ]
Staging / Production -----/                               (Hosted 24/7 in Cloud)
                                                          • users
                                                          • properties & rooms
                                                          • rental_agreements
                                                          • subscriptions & payments
```

### Key Advantages
- **Real-Time Data Sync**: Listings added or edited by one person are immediately accessible to everyone.
- **Persistent Storage**: Data is never lost when pulling new code or restarting local servers.
- **Zero Local Server Setup**: No need to install and configure local MySQL Server or XAMPP on every developer's machine.
- **Zero Cost**: Stays within generous free-tier limits.

---

## 2. Free Cloud MySQL Providers Comparison

| Feature | **TiDB Cloud (Serverless)** *(Recommended)* | **Aiven for MySQL** | **Clever Cloud** |
| :--- | :--- | :--- | :--- |
| **Free Tier Storage** | **5 GiB** | **5 GB** | Up to 10 MB (Free addon) |
| **Compute / Quota** | 50M Request Units / month | 1 CPU, 1 GB RAM | Shared VM |
| **Credit Card Required?** | ❌ **No** | ❌ **No** | ❌ **No** |
| **MySQL Compatibility** | 100% MySQL 8.0 Protocol | Native MySQL 8.0 Engine | Native MySQL 8.0 |
| **SSL / TLS Encryption** | Enforced by default | Enforced by default | Optional / Supported |
| **Default Port** | `4000` | Typically `10000+` (custom) | `3306` |
| **Setup Time** | ~2 minutes | ~3 minutes | ~3 minutes |

> **Recommendation**: **TiDB Cloud Serverless** is the top choice for teams because it requires no credit card, provides 5 GB free storage, is fully compatible with PyMySQL, and provides a direct connection string builder in the dashboard.

---

## 3. Step-by-Step Setup: Option A — TiDB Cloud Serverless (Recommended)

### Step 1: Create Free Account & Cluster
1. Visit [tidbcloud.com](https://tidbcloud.com/) and click **Sign Up** (Login with GitHub or Google).
2. In the dashboard, click **Create Cluster**.
3. Select **Serverless** (Free plan).
4. Choose a region close to your team (e.g., `AWS / us-east-1` or `AWS / ap-southeast-1` / `Mumbai (ap-south-1)` if available).
5. Set cluster name to `roomilink-db` and click **Create**. The cluster spins up in ~30 seconds.

### Step 2: Retrieve Connection String
1. On your cluster page, click **Connect**.
2. Under **Connect Type**, choose **Standard Connection**.
3. Under **Language / Framework**, select **SQLAlchemy** or **Python (PyMySQL)**.
4. TiDB will generate a connection string that looks like:
   ```text
   mysql+pymysql://<user>:<password>@<host>:4000/<database>?ssl_verify_cert=true
   ```
5. Click **Reset Password** if you did not save the generated root password, and copy the full connection URI.

---

## 4. Step-by-Step Setup: Option B — Aiven for MySQL

1. Visit [aiven.io](https://aiven.io/) and create a free account.
2. Click **Create Service** -> Select **MySQL**.
3. Select the **Free Plan** and your preferred cloud provider and region.
4. Under Service Name, enter `roomilink-mysql`.
5. Once running (Status: *Running*), find **Service URI** on the overview tab.
6. The URI format will be:
   ```text
   mysql+pymysql://avnadmin:<password>@<host>:<port>/defaultdb?ssl-mode=REQUIRED
   ```

---

## 5. Backend Code Integration

RoomiLink uses Flask-SQLAlchemy with `PyMySQL` and `cryptography` (both already installed in `backend/requirements.txt`).

### A. Connection Resilience in `backend/config.py`
Cloud databases may disconnect idle connections after 5–15 minutes. To prevent connection drop errors (`MySQL server has gone away`), update `backend/config.py` with SQLAlchemy engine options:

```python
# In backend/config.py:
class Config:
    # ... existing settings ...
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine options for cloud stability
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,       # Tests connections before using them
        "pool_recycle": 280,         # Recycles connections every ~5 mins
        "pool_timeout": 20,          # Connection timeout in seconds
    }
    
    db_url = os.getenv("DATABASE_URL")
    sqlite_fallback_path = basedir / "instance" / "roomilink_dev.db"
    
    if db_url and ("mysql" in db_url or "postgresql" in db_url):
        SQLALCHEMY_DATABASE_URI = db_url
    else:
        # Local SQLite fallback if DATABASE_URL is not set
        sqlite_fallback_path.parent.mkdir(parents=True, exist_ok=True)
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_fallback_path}"
```

### B. Environment Variables (`backend/.env`)
Each developer or server deployment creates/edits `backend/.env`:

```env
# Flask Settings
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=roomilink-super-secret-key-2026
JWT_SECRET_KEY=roomilink-jwt-secret-key-2026

# Shared Cloud MySQL Database URL
DATABASE_URL=mysql+pymysql://<username>:<password>@<host>:<port>/<dbname>?ssl_verify_cert=true

# Frontend URL
CORS_ORIGINS=http://localhost:3000
```

> **Security Note**: Never commit `backend/.env` with your real cloud database password to GitHub! `backend/.env` is already included in `.gitignore`. Keep sample placeholders in `backend/.env.example`.

---

## 6. Initializing Schema & Seeding Cloud Database

Once `DATABASE_URL` is configured in `backend/.env`:

1. Open PowerShell / Terminal in the project root:
   ```powershell
   cd backend
   ```
2. Activate your virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
3. Run the seed script:
   ```powershell
   python seed.py
   ```

### What `seed.py` Does:
1. Connects to the Cloud MySQL server.
2. Automatically generates all tables:
   - `users`
   - `properties`
   - `rooms`
   - `room_amenities`
   - `rental_agreements`
   - `signatures`
   - `subscriptions`
   - `payment_transactions`
   - `split_expenses`
3. Seeds initial demo records:
   - **Admin**: `admin@roomilink.com` / `Admin@123`
   - **Landlord**: `landlord@roomilink.com` / `Landlord@123`
   - **Tenant**: `tenant@roomilink.com` / `Tenant@123`
   - Initial verified properties and room listings across prime areas.

---

## 7. Verifying the Connection

You can run a quick one-line verification test to confirm your connection:

```powershell
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); print('Connected to:', db.engine.url)"
```

Expected output:
```text
Connected to: mysql+pymysql://<username>:***@<host>:<port>/<database>
```

---

## 8. Common Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `OperationalError: (2003, "Can't connect to MySQL server")` | Wrong host, port, or cloud firewall | Verify hostname and port. Ensure cloud cluster allows connections from all IPs (`0.0.0.0/0`). |
| `InternalError: (1045, "Access denied for user")` | Incorrect username or password | Recheck credentials in `DATABASE_URL`. Reset password in cloud console if needed. |
| `SSLError` or `SSL connection error` | Missing SSL parameters | Add `?ssl_verify_cert=true` (for TiDB) or `?ssl-mode=REQUIRED` to the end of `DATABASE_URL`. |
| `MySQL server has gone away` | Connection idle timeout | Ensure `pool_pre_ping: True` and `pool_recycle: 280` are in `SQLALCHEMY_ENGINE_OPTIONS` in `config.py`. |
| `Table already exists` during seed | Tables were already created | `seed.py` will update or skip existing tables safely. |

---

## 9. Team Collaboration Workflow

1. One team member creates the free cloud database and runs `python seed.py` once.
2. The team member shares the connection string securely (via private channel / vault).
3. Each team member places the `DATABASE_URL` in their own local `backend/.env`.
4. Everyone runs `npm run dev` (frontend) and `python run.py` (backend).
5. All actions taken by any teammate (e.g. creating a listing or generating an agreement) are instantly synchronized!
