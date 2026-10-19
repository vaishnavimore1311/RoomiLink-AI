# RoomiLink AI — Developer Setup & Run Guide

Welcome to **RoomiLink AI**! This guide walks you through setting up and running the complete full-stack platform (Next.js frontend + Python Flask REST API + MySQL database) step-by-step from scratch after cloning from GitHub.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:

| Tool | Minimum Version | Check Installation Command | Download Link |
| :--- | :--- | :--- | :--- |
| **Git** | 2.30+ | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Python** | 3.10+ | `python --version` | [python.org](https://www.python.org/) *(Check "Add to PATH")* |
| **Node.js** | 18.17+ (LTS) | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0+ | `npm --version` | Bundled with Node.js |

---

## 2. Step 1: Clone the Repository

Open PowerShell, Command Prompt, or your preferred terminal:

```powershell
git clone https://github.com/vaishnavimore1311/RoomiLink-AI.git
cd RoomiLink-AI
```

---

## 3. Step 2: Environment Variables Configuration

The project uses two separate `.env` files for security and separation of concerns. Neither of these files is tracked in Git.

### A. Configure Backend Environment (`backend/.env`)

1. Navigate to the `backend/` folder:
   ```powershell
   cd backend
   ```
2. Create your `.env` file from the example template:
   - **Windows PowerShell**:
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Windows Command Prompt (cmd)**:
     ```cmd
     copy .env.example .env
     ```
   - **macOS / Linux**:
     ```bash
     cp .env.example .env
     ```
3. Open `backend/.env` in your editor and verify or customize:
   ```env
   # Flask Environment
   FLASK_APP=run.py
   FLASK_ENV=development
   SECRET_KEY=roomilink-dev-secret-key-2026-super-safe
   JWT_SECRET_KEY=roomilink-jwt-secret-key-2026-secure

   # Allowed Frontend CORS Origins
   CORS_ORIGINS=http://localhost:3000

   # Database: Shared Cloud MySQL (TiDB Cloud) OR local fallback
   DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:4000/<database>?ssl_verify_cert=true

   # Razorpay Payment Gateway (Test Mode)
   RAZORPAY_KEY_ID=rzp_test_RoomiLinkDemo2026
   RAZORPAY_KEY_SECRET=roomilink_secret_demo_key_9988

   # Optional LLM API Key (Uses deterministic rule-based fallback if blank)
   LLM_PROVIDER=openai
   LLM_API_KEY=
   LLM_MODEL=gpt-4o-mini
   LLM_TIMEOUT_SECONDS=10
   ```

> **Note on Database**: If you do not have a Cloud MySQL URL, leave `DATABASE_URL` unset or commented out. The backend will automatically fall back to a local SQLite database (`backend/instance/roomilink_dev.db`).

---

### B. Configure Frontend Environment (`frontend/.env.local`)

1. Navigate to the `frontend/` folder:
   ```powershell
   cd ../frontend
   ```
2. Create your `.env.local` file:
   - **Windows PowerShell**:
     ```powershell
     Copy-Item .env.example .env.local
     ```
   - **Windows Command Prompt (cmd)**:
     ```cmd
     copy .env.example .env.local
     ```
   - **macOS / Linux**:
     ```bash
     cp .env.example .env.local
     ```
3. Ensure it points to the Flask API:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```

---

## 4. Step 3: Backend Setup & Installation

From the project root:

```powershell
cd backend
```

### 1. Create a Python Virtual Environment
```powershell
python -m venv .venv
```

### 2. Activate the Virtual Environment
- **Windows PowerShell**:
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
  *(If you get a script execution policy error, run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`)*
- **Windows Command Prompt (cmd)**:
  ```cmd
  .\.venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  source .venv/bin/activate
  ```

### 3. Install Python Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Verify Database Connectivity (Diagnostic Tool)
Test your connection before launching:
```powershell
python test_db_connection.py
```
*You should see a green `[SUCCESS] Database is fully operational` message.*

### 5. Initialize Schema & Seed Demo Data
Creates all relational tables and seeds Pune listings, admin accounts, and roommate profiles:
```powershell
python seed.py
```

### 6. Start the Backend Server
```powershell
python run.py
```
*The Flask REST API will start at: **`http://127.0.0.1:5000`***  
*Health Check: **`http://127.0.0.1:5000/api/v1/health`***

---

## 5. Step 4: Frontend Setup & Installation

Open a **new terminal window**, navigate to the `frontend` folder from the project root:

```powershell
cd frontend
```

### 1. Install Node.js Dependencies
```powershell
npm install
```

### 2. Start the Frontend Development Server
```powershell
npm run dev
```

*The Next.js application will start at: **`http://localhost:3000`***

---

## 6. Step 5: Test Accounts & Seed Credentials

Once both servers are running, navigate to **`http://localhost:3000`** in your browser. You can test different roles using these pre-seeded accounts:

| Role | Email Address | Password | Permissions & Views |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@roomilink.ai` | `AdminPassword123!` | Access to `/admin`, approve listings, verify user badges, manage subscriptions. |
| **Pune Host (Lister)** | `rahul.pune@example.com` | `Password123!` | Create and manage room listings, view tenant inquiries. |
| **Roommate (Seeker)** | `sarah@example.com` | `Password123!` | Search rooms (`/rooms`), find roommates (`/roommates`), calculate compatibility. |

---

## 7. Step 6: Running Automated Tests

To verify that all services, authentication, database pooling, and API endpoints are working properly:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

*Expected output: **22 passed** (0 failures).*

---

## 8. Common Troubleshooting & FAQs

### Q1: PowerShell error: `File ... Activate.ps1 cannot be loaded because running scripts is disabled`
**Solution**: Open PowerShell as Administrator or run in your terminal:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Then run `.\.venv\Scripts\Activate.ps1` again.

---

### Q2: Port 5000 or Port 3000 is already in use
**Solution**: Find and stop the process using the port, or run the backend on a different port:
- To run backend on port 5001:
  ```powershell
  $env:PORT=5001; python run.py
  ```
  *(Remember to update `NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1` in `frontend/.env.local`)*.

---

### Q3: `MySQL server has gone away` or Cloud Database timeout
**Solution**: 
RoomiLink includes built-in connection pool resilience (`pool_pre_ping=True` and `pool_recycle=280` in `backend/config.py`). Ensure your cloud database firewall allows connections from `0.0.0.0/0` and that `?ssl_verify_cert=true` is appended to the `DATABASE_URL`.

---

### Q4: CORS Error in Browser Console
**Solution**: Ensure `CORS_ORIGINS=http://localhost:3000` in `backend/.env` matches the exact URL of your frontend.

---

## 9. Project Directory Overview

```text
RoomiLink-AI/
├── SETUP_GUIDE.md                # This setup guide
├── README.md                     # High-level product overview & architecture
├── docs/                         # Detailed architecture, PRD, and design docs
│   ├── SHARED_DATABASE_SETUP_GUIDE.md
│   ├── architecture.md
│   ├── project-requirements.md
│   └── user-stories.md
├── backend/                      # Python Flask REST API
│   ├── app/                      # Routes, models, services, and AI fallbacks
│   ├── instance/                 # Local SQLite fallback storage
│   ├── tests/                    # 22 automated Pytest test cases
│   ├── .env.example              # Backend environment template
│   ├── config.py                 # SQLAlchemy pooling & configuration
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Flask application entry point
│   ├── seed.py                   # Database schema & demo data seeder
│   └── test_db_connection.py     # Connection diagnostic tool
└── frontend/                     # Next.js 14+ TypeScript Client
    ├── app/                      # App router views (rooms, roommates, household, admin)
    ├── components/               # UI components (modal, badges, uploader)
    ├── .env.example              # Frontend environment template
    ├── package.json              # Node dependencies & dev scripts
    └── tsconfig.json             # TypeScript compiler settings
```

Happy coding! If you encounter any issues, check `test_db_connection.py` or review [`docs/SHARED_DATABASE_SETUP_GUIDE.md`](docs/SHARED_DATABASE_SETUP_GUIDE.md).
