# RoomiLink AI

> **Beyond Finding a Room, Building Compatible Shared Living**  
> *An intelligent full-stack platform for room search, roommate compatibility matching, and ongoing household lifecycle management.*

[![Project Status: Phase 1 Documentation Complete](https://img.shields.io/badge/Status-Phase%201%20Documentation%20Complete-blue.svg)](#implementation-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stack: Next.js + Flask + MySQL + LLM](https://img.shields.io/badge/Stack-Next.js%20%7C%20Flask%20%7C%20MySQL%20%7C%20LLM-emerald.svg)](#technology-stack)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Problem Statement & Solution](#problem-statement--solution)
3. [Key Features](#key-features)
4. [AI Capabilities & Differentiators](#ai-capabilities--differentiators)
5. [Technology Stack](#technology-stack)
6. [Architecture Overview](#architecture-overview)
7. [Repository Structure](#repository-structure)
8. [Documentation Index](#documentation-index)
9. [Installation & Setup (Windows Guide)](#installation--setup-windows-guide)
10. [Environment Variables](#environment-variables)
11. [Running the Application](#running-the-application)
12. [Testing & Quality Assurance](#testing--quality-assurance)
13. [Security & Privacy](#security--privacy)
14. [Implementation Status & Roadmap](#implementation-status--roadmap)
15. [Future Enhancements](#future-enhancements)

---

## Project Overview

**RoomiLink AI** is an intelligent, full-stack web application designed for university students, young working professionals, and relocators moving to new cities. 

Unlike traditional flat-hunting portals that abandon tenants as soon as a lease is signed, RoomiLink AI treats shared living as an **ongoing interpersonal relationship**. It supports the entire co-living lifecycle across four interconnected phases:
1. **Find:** Discover verified rooms and properties matching budget, commute, and lifestyle preferences.
2. **Connect:** Match with prospective roommates using multidimensional compatibility algorithms and explainable reasoning.
3. **Live Together:** Manage shared household finances, chore rotations, communal inventory, and living agreements in a centralized workspace.
4. **AI Household Intelligence:** Proactively identify behavior drift, simulate the household impact of proposed lifestyle changes, detect unspoken micro-issues, and balance visible and invisible domestic labor.

---

## Problem Statement & Solution

### The Problem
Finding and sustaining shared living in modern cities is fraught with friction:
* **Superficial Matching:** Platforms match roommates purely on rent and location, ignoring sleep patterns, hygiene habits, and noise tolerance.
* **Behavior Drift:** Flatmates compatible at move-in often experience routine shifts after 2 to 6 months, causing unexpected strain.
* **Cascading Decisions:** One roommate's decision (e.g., getting a pet, late-night shifts, frequent overnight guests) alters the entire household's living condition.
* **Unspoken Resentment:** Small grievances (dishes left in the sink, delayed utility repayments) go unaddressed until they erupt into major conflicts.
* **Invisible Labor Imbalance:** Household management requires invisible mental and physical work (restocking groceries, paying bills on time, communicating with landlords) that is rarely shared equally.
* **Rental Fraud:** Fake listings, unverified hosts, and scam deposits create high financial and safety risks for relocators.

### The Solution
RoomiLink AI delivers an integrated solution combining:
* **Multidimensional lifestyle vectors** and explainable compatibility scores.
* **Identity verification badges** and community trust flags.
* **Operational shared-living tools** (debt-minimized expense ledgers, rotating chore boards, digital living agreements).
* **Non-invasive, explainable AI agents** that monitor household dynamics, simulate lifestyle impacts, and provide neutral mediation recommendations with full user consent.

---

## Key Features

### 1. User & Profile Management
* Secure authentication with password hashing (bcrypt/PBKDF2) and JWT sessions.
* 8-dimensional lifestyle profiling: sleep schedule, cleanliness, guest policy, noise tolerance, smoking/drinking, dietary habits, work routine, and pets.
* Privacy and data sovereignty controls with granular AI consent toggles.

### 2. Room & Property Discovery
* Property and room listings with detailed descriptions, pricing, rules, and photo galleries.
* Multi-criteria search filters by city, budget, room type (private/shared), and amenities.
* Saved favorites and bookmark management.

### 3. Roommate Matching
* Mathematical compatibility scoring (0–100%) weighting essential and negotiable lifestyle habits.
* **Explainable Match Breakdown** detailing key strengths and potential friction areas in plain English.
* Interactive Living Simulation scenarios measuring authentic domestic reactions.

### 4. Trust & Safety
* ID and document verification workflow (student ID, employment letter, or government ID).
* Verified trust badges displayed across profiles and listings.
* Suspicious listing reporting pipeline and user blocking functionality.

### 5. In-App Communication
* Direct messaging between room seekers, prospective flatmates, and property listers.
* Conversation inboxes, unread counters, and automated in-app notifications.

### 6. Household Management Suite
* Household workspace creation with unique 8-character invitation codes.
* Shared expense logging with equal and custom split calculations.
* Real-time **"Who Owes Whom"** debt ledger with manual payment settlement confirmations.
* Recurring monthly bill scheduler (rent, Wi-Fi, utilities) with reminder alerts.
* Rotational chore schedule with single-click completion check-offs.
* Communal household inventory tracker with low-stock alerts.
* Move-out notice workflow and replacement roommate search initiation.

---

## AI Capabilities & Differentiators

RoomiLink AI incorporates eight distinct AI capabilities powered by an LLM API:

| AI Capability | Living Phase | Real-Life Problem Addressed | Core Functionality |
| :--- | :--- | :--- | :--- |
| **1. Living Simulation** | Pre-Move-In | Profiles reflect idealized answers, not actual domestic behavior. | Analyzes user decisions in interactive domestic scenarios to build an authentic behavioral profile. |
| **2. Future Conflict Predictor** | Pre-Move-In | Friction points only appear after moving in together. | Performs pairwise comparison of lifestyle habits to highlight top 3 friction risks with pre-move-in discussion questions. |
| **3. Living Agreement Generator** | Pre-Move-In | House rules are vague, verbal, or forgotten. | Synthesizes preferences and predicted conflicts into a tailored, clause-by-clause digital living agreement. |
| **4. Behavior Drift Detector** | Active Living | Roommate habits drift after 2–6 months. | Compares original agreement baselines with empirical 60–90 day chore and expense logs to detect routine shifts. |
| **5. Change Impact Engine** | Active Living | One person's decision impacts the entire flat. | Simulates the systemic effect of a proposed lifestyle change (pets, night work, guests) on noise, cost, and schedules. |
| **6. Unspoken Problem Detector** | Active Living | Roommates avoid confrontation over minor recurring issues. | Detects patterns from confidential, voluntary micro-issue logs to prompt neutral, diplomatic household discussions. |
| **7. Contribution Calculator** | Active Living | Invisible domestic labor is distributed unequally. | Calculates a fair-share workload score balancing visible chores with invisible tasks (errands, supply restocking, coordination). |
| **8. Replacement Matching** | Transition | Replacing a roommate often breaks whole-house harmony. | Evaluates incoming candidate profiles against the **composite profile of the entire surviving household**. |

---

## Technology Stack

```
+---------------------------------------------------------------------------------+
|                               Technology Stack                                  |
|                                                                                 |
|   Frontend:     Next.js 14+ (React, TypeScript, CSS)                            |
|   Backend:      Python 3.10+ (Flask REST API, Flask-SQLAlchemy, Flask-JWT)      |
|   Database:     MySQL 8.0 (24 Relational Entities)                              |
|   AI / LLM:     LLM API (OpenAI / Gemini / Anthropic compatible)                |
|   Version Ctrl: Git & GitHub                                                    |
+---------------------------------------------------------------------------------+
```

### Architectural Choice & Evolution Note
While earlier conceptual notes mentioned a monolithic Python-only SSR setup (Flask + Jinja2 without JavaScript), modern interactive shared-living requirements (dynamic compatibility sliders, real-time debt balancing, drag-and-drop chore boards, and asynchronous AI spinners) demand a modern client framework.

The project architecture has therefore been standardized on a decoupled **Next.js (Frontend) + Python Flask (Backend REST API) + MySQL (Database)** stack.

---

## Architecture Overview

```mermaid
graph LR
    subgraph Frontend ["Frontend Tier"]
        Next["Next.js App Router (TypeScript)"]
    end

    subgraph Backend ["Backend API Tier"]
        Flask["Flask REST API (Blueprints)"]
        Services["Domain Services (Matching, Expenses, Chores)"]
        AISvc["AI Orchestration & Fallback Engine"]
        Flask --> Services
        Flask --> AISvc
    end

    subgraph Data ["Data & External Tier"]
        DB[("MySQL 8.0 Database")]
        LLM["LLM API (External)"]
        Services --> DB
        AISvc --> DB
        AISvc -- "HTTPS JSON" --> LLM
    end

    Next -- "REST API / JWT" --> Flask
```

* **Frontend:** Next.js handles presentation, client state, and responsive layouts.
* **Backend:** Flask REST API provides modular blueprints (`auth`, `rooms`, `matching`, `chat`, `household`, `ai`, `admin`), validating requests and enforcing role-based permissions.
* **Database:** MySQL 8.0 enforces referential integrity across 24 entities grouped into Users & Trust, Search & Match, Household Management, and AI Insights.
* **AI Resilience:** The backend AI Service enforces explicit user consent, strict 10-second timeouts, JSON validation, and deterministic rule-based fallbacks if the LLM API is unavailable.

---

## Repository Structure

```text
RoomiLink-AI/
├── frontend/                     # Next.js 14+ frontend application (planned)
│   ├── app/                      # App router views (rooms, roommates, household, admin)
│   ├── components/               # Reusable UI & domain components
│   ├── lib/                      # Central API client & helpers
│   ├── services/                 # Typed API abstraction services
│   ├── hooks/                    # Custom React hooks (useAuth, useHousehold)
│   ├── types/                    # TypeScript interfaces
│   ├── public/                   # Static assets & icons
│   ├── package.json              # NPM dependencies
│   └── .env.example              # Frontend environment template
├── backend/                      # Python Flask backend application (planned)
│   ├── app/                      # Core Flask package
│   │   ├── routes/               # Modular Flask Blueprints
│   │   ├── models/               # SQLAlchemy entity models (24 tables)
│   │   ├── services/             # Business logic (matching, expenses, chores)
│   │   ├── ai/                   # AI prompts, LLM client, and fallbacks
│   │   ├── utils/                # Security, hashing, validators, uploads
│   │   └── __init__.py           # Application factory
│   ├── tests/                    # Pytest test suite
│   ├── config.py                 # Environment configurations
│   ├── run.py                    # Server entry point
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Backend environment template
├── docs/                         # Project documentation
│   ├── project-requirements.md   # PRD: requirements, scope, priorities
│   ├── architecture.md           # Architecture: diagrams, workflows, schemas
│   ├── user-stories.md           # Agile user stories with acceptance criteria
│   ├── folder-structure.md       # Folder structure and file purpose guide
│   └── design.md                 # UI/UX design: tokens, wireframes, accessibility
├── .gitignore                    # Git exclusions
└── README.md                     # Project overview and instructions (this file)
```

---

## Documentation Index

The complete documentation suite is available in the [`docs/`](docs/) directory:

1. **[Project Requirements Document (`docs/project-requirements.md`)](docs/project-requirements.md):** Detailed problem statement, target users, functional modules, non-functional requirements, MoSCoW prioritization, and scope boundaries.
2. **[System Architecture Document (`docs/architecture.md`)](docs/architecture.md):** System architecture, Mermaid sequence diagrams, JWT authentication flow, 24-entity ER schema, AI consent and fallback pipelines, and deployment topology.
3. **[User Stories Document (`docs/user-stories.md`)](docs/user-stories.md):** 12 Agile epics with formal acceptance criteria (Given/When/Then) and priority classifications.
4. **[Folder Structure Document (`docs/folder-structure.md`)](docs/folder-structure.md):** Comprehensive file-by-file breakdown explaining architectural patterns and responsibilities.
5. **[UI/UX Design Specification (`docs/design.md`)](docs/design.md):** Color tokens, typography, 8pt spacing system, ASCII screen wireframes, UI state guidelines, and WCAG AA accessibility rules.

---

## Installation & Setup (Windows Guide)

Follow this step-by-step guide to set up the development environment on Windows 10/11.

### Prerequisites
* **Operating System:** Windows 10 or Windows 11
* **Node.js:** v18.17.0 or higher ([Download Node.js](https://nodejs.org/))
* **Python:** v3.10 or higher ([Download Python](https://www.python.org/)) *(Check "Add Python to PATH" during installation)*
* **MySQL:** MySQL Community Server 8.0 ([Download MySQL](https://dev.mysql.com/downloads/installer/))
* **Git:** Git for Windows ([Download Git](https://git-scm.com/))

---

### Step 1: Clone the Repository
Open PowerShell or Command Prompt:
```powershell
git clone https://github.com/vaishnavimore1311/RoomiLink-AI.git
cd RoomiLink-AI
```

---

### Step 2: Backend Setup (Python Flask)

1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Create a Python virtual environment:
   ```powershell
   python -m venv .venv
   ```

3. Activate the virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   *(If PowerShell displays an execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` and re-run the command).*

4. Install the required Python packages:
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Configure your environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
   *Edit `.env` in your text editor and supply your local MySQL database credentials and AI API key.*

6. Initialize the database schema:
   ```powershell
   flask db upgrade
   ```
   *(Or run `python run.py` once the application files are initialized).*

---

### Step 3: Frontend Setup (Next.js)

1. In a separate PowerShell terminal window, navigate to the frontend directory:
   ```powershell
   cd frontend
   ```

2. Install Node dependencies:
   ```powershell
   npm install
   ```

3. Configure frontend environment variables:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   *Verify that `NEXT_PUBLIC_API_URL` points to `http://localhost:5000/api/v1`.*

---

## Environment Variables

### Backend (`backend/.env.example`)
```env
# Flask Core Configuration
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secure-random-secret-key-change-me
JWT_SECRET_KEY=your-secure-random-jwt-key-change-me

# Database Configuration (MySQL 8.0)
DATABASE_URL=mysql+pymysql://roomilink_user:password@localhost:3306/roomilink_db

# External LLM API Configuration
LLM_PROVIDER=openai
LLM_API_KEY=your-llm-api-key-here
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_SECONDS=10

# File Upload Configuration
UPLOAD_FOLDER=app/static/uploads
MAX_CONTENT_LENGTH=5242880

# CORS Configuration
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.example`)
```env
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Application Details
NEXT_PUBLIC_APP_NAME=RoomiLink AI
```

> **Security Note:** Never commit actual `.env` or `.env.local` files containing credentials to version control. Keep `.env` files listed in `.gitignore`.

---

## Running the Application

### 1. Start the Flask Backend
In the first PowerShell terminal (with `.venv` activated):
```powershell
cd backend
python run.py
```
*The Flask REST API will start on `http://127.0.0.1:5000`.*

### 2. Start the Next.js Frontend
In the second PowerShell terminal:
```powershell
cd frontend
npm run dev
```
*The Next.js client will start on `http://localhost:3000`.*

### 3. Access in Browser
Open your web browser (Chrome, Edge, Firefox, or Safari) and visit:  
**`http://localhost:3000`**

---

## Testing & Quality Assurance

### Backend Automated Tests
Backend tests are executed using **pytest**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```
To run tests with code coverage:
```powershell
pytest --cov=app tests/
```

### Frontend Testing & Linting
To check TypeScript types and run ESLint in the frontend:
```powershell
cd frontend
npm run lint
```

---

## Security & Privacy

* **Password Security:** Passwords are never stored in plain text; all credentials use salted hashing via bcrypt or PBKDF2.
* **Token Protection:** Authentication utilizes JSON Web Tokens (JWT) with HTTP-only, secure cookies to prevent XSS-based token theft.
* **Data Sovereignty & Explicit Consent:** User and household data is analyzed by external LLMs strictly upon explicit user consent. Users can withdraw consent at any time from their account settings.
* **Graceful Degradation:** If the external LLM API is unavailable, the application falls back to internal algorithmic scoring without exposing system stack traces.
* **Input Sanitization:** All incoming requests are parameterized via SQLAlchemy ORM to prevent SQL injection, and file uploads are strictly limited to verified MIME types under 5MB.

---

## Implementation Status & Roadmap

| Module | Status | Notes |
| :--- | :--- | :--- |
| **Documentation Suite** | **Completed** | Full PRD, Architecture, User Stories, Folder Structure, and Design specifications created in `docs/`. |
| **Database Schema Design** | **Specified** | 24 relational entities mapped across 4 domains in `docs/architecture.md`. |
| **Backend API Scaffold** | *Planned (Sprint 1)* | Flask application factory, JWT authentication, and user profile blueprints. |
| **Frontend UI Scaffold** | *Planned (Sprint 1)* | Next.js App Router setup, design tokens, navigation, and auth pages. |
| **Rooms & Matching Engines** | *Planned (Sprint 2)* | Property CRUD, multi-criteria search, and lifestyle distance matching algorithm. |
| **Household Operations Hub** | *Planned (Sprint 3)* | Expense splitter, chore rotation board, and communal inventory checklist. |
| **AI Household Intelligence** | *Planned (Sprint 4)* | LLM API integration with prompt schemas, consent checks, and fallback mechanisms. |
| **Admin & Moderation** | *Planned (Sprint 5)* | ID verification review queue, flagged listing management, and audit logs. |

---

## Future Enhancements

* **Native Mobile Apps:** Build iOS and Android cross-platform apps using React Native.
* **Payment Gateway Integration:** Direct rent splitting and automated bank settlements via Stripe, PayPal, or UPI.
* **Commute & Transit Mapping:** Interactive map search displaying live public transit commute times to universities and workplaces.
* **Automated Document OCR:** Instant student ID and receipt verification using computer vision models.
* **Voice & Video Chat:** Secure peer-to-peer audio and video calls within active inquiry threads.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
