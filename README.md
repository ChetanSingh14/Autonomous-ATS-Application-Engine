# ⚡ AutoApply Engine: Autonomous ATS Application Pipeline

> **Autonomous job ingestion, fit scoring, truth-constrained resume tailoring, automated single-column ATS PDF compilation, and Chrome MV3 browser injection.** Built on a 100% free-tier stack (Supabase PostgreSQL, Upstash TLS Redis, Google Gemini AI).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-indigo.svg)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-orange.svg)](https://ai.google.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-MV3_Extension-green.svg)](https://developer.chrome.com/docs/extensions/)

---

## 🌟 Key Features & Architectural Capabilities

- 🤖 **Multi-Platform Job Ingestion**: Scrapes and ingests live technical job postings from Greenhouse, Lever, Ashby, LinkedIn, Internshala, Naukri, and Wellfound.
- 🎯 **Strict Developer Title & Category Filtering**: Automatically filters out non-software developer roles (e.g. Sales, Marketing, Accounting) before scoring.
- 🧠 **AI Fit Scoring (Google Gemini)**: Evaluates job requirements against candidate master skills & experience, providing a 0–100% match score with detailed missing-skill diffs.
- 🔒 **100% Truth-Constrained Resume Tailoring**: Guaranteed zero hallucination. Tailors bullet points using *only* verifiable candidate facts from the Master Profile.
- 📄 **ATS-Optimized PDF Generator**: Compiles single-column, ATS-parseable resumes via Puppeteer in under 500ms and stores PDF data directly in PostgreSQL.
- 🧩 **Chrome MV3 Browser Extension**: DOM automation extension that auto-fills ATS forms on Greenhouse, Lever, Ashby, LinkedIn, Internshala, Naukri, and Wellfound with tailored candidate data and auto-uploads the compiled PDF resume.
- 🖥️ **Dark-Themed Control Center Dashboard**: Built with Next.js 15, featuring live status filters with interactive loading states, tab count badges, and interactive diff inspection.

---

## 📐 System Architecture

```mermaid
flowchart TD
    A["Job Boards: Greenhouse / Lever / Ashby / LinkedIn"] -->|REST Ingestion| B["Backend Express Server"]
    B -->|Filter Non-Dev Titles| C{"Developer Role?"}
    C -->|No| D["Status: REJECTED_LOW_SCORE (0%)"]
    C -->|Yes| E["Google Gemini AI Engine"]
    E -->|Fit Score >= 65%| F["Truth-Constrained Resume Tailor"]
    F -->|Puppeteer Compilation| G["ATS PDF Resume Generator"]
    G -->|Save PDF & Tailored Data| H[("Supabase PostgreSQL")]
    H -->|Status: QUEUED_FOR_APPLY| I["Next.js 15 Control Center"]
    I -->|Tab Switching / Queue Monitor| J["Candidate Dashboard"]
    J -->|Auto-Fill Injection| K["Chrome MV3 Extension"]
    K -->|DOM Form Fill & Resume Upload| L["Job Application Submitted"]
```

---

## 📁 Repository Structure

```
ats-application-engine/
├── apps/
│   ├── backend/               # Express + Prisma + BullMQ + Gemini AI + Puppeteer
│   │   ├── prisma/            # Database Schema, Seed Data & Cleanup Scripts
│   │   ├── src/
│   │   │   ├── routes/        # REST API Routes (/api/jobs, /api/profile, etc.)
│   │   │   ├── services/      # Ingestion, Gemini AI Tailor, PDF Generator, Queue
│   │   │   └── index.ts       # Server Entry Point
│   │   └── .env               # Backend Configuration (Database, Redis, Gemini Key)
│   ├── web/                   # Next.js 15 Dark-Themed Control Center Dashboard
│   │   ├── src/
│   │   │   ├── app/           # App Router Pages (Dashboard, Master Profile, Diffs)
│   │   │   └── components/    # UI Components & Navigation Header
│   └── extension/             # Manifest V3 Chrome Extension
│       ├── manifest.json      # Extension Manifest
│       ├── background.js      # Service Worker & Network Sync
│       ├── popup.html/js      # Extension Status Popup UI
│       └── content-*.js       # Platform Form Adapters (Greenhouse, Lever, Ashby, LinkedIn, etc.)
├── .env.example               # Template for Environment Variables
└── README.md                  # Project Documentation
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- Node.js `v18+` & `npm`
- Free-tier [Supabase PostgreSQL](https://supabase.com) account
- Free-tier [Upstash Redis](https://upstash.com) database (TLS enabled)
- Free-tier [Google AI Studio Gemini API Key](https://aistudio.google.com)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/ChetanSingh14/Autonomous-ATS-Application-Engine.git
cd Autonomous-ATS-Application-Engine

# Install backend dependencies
cd apps/backend
npm install

# Install web dashboard dependencies
cd ../web
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `apps/backend/.env` and update the connection credentials:

```env
PORT=4000
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require"
REDIS_URL="rediss://default:PASSWORD@xxx.upstash.io:6379"
REDIS_TLS=true
GEMINI_API_KEY="AIzaSy..."
```

### 4. Database Setup & Seeding
```bash
cd apps/backend
npx prisma db push
npx prisma generate
npx prisma db seed
```

### 5. Start Development Servers
In separate terminal tabs:

**Backend Express Server:**
```bash
cd apps/backend
npm run dev
```

**Web Dashboard:**
```bash
cd apps/web
npm run dev
```
Open `http://localhost:3000` to view the **AutoApply Control Center**.

---

## 🧩 Loading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `apps/extension` folder.
4. The extension status icon will display `MV3 Extension Connected` on your Control Center dashboard.

---

## 🛠️ Supported Job Platforms

| Platform | Ingestion Support | DOM Auto-Fill | PDF Resume Upload |
| :--- | :---: | :---: | :---: |
| **Greenhouse** | ✅ Live | ✅ Automated | ✅ PDF Upload |
| **Lever** | ✅ Live | ✅ Automated | ✅ PDF Upload |
| **Ashby** | ✅ Live | ✅ Automated | ✅ PDF Upload |
| **LinkedIn** | ✅ Supported | ✅ Extension Assisted | ✅ PDF Upload |
| **Internshala** | ✅ Supported | ✅ Extension Assisted | ✅ PDF Upload |
| **Naukri.com** | ✅ Supported | ✅ Extension Assisted | ✅ PDF Upload |
| **Wellfound** | ✅ Supported | ✅ Extension Assisted | ✅ PDF Upload |

---

## 🔒 Truth-Constrained AI Guarantee

Unlike generic AI resume tools that generate fictional experience or unverified buzzwords, the AutoApply Engine operates under a **Strict Truth-Constraint**:
- Bullet points are reordered, emphasized, and keyword-tailored **strictly** using facts present in the candidate's Master Profile.
- Zero fabrication of dates, company names, or metrics.
- Output score and diffs highlight exact matching vs missing skills.

---

## 📜 License

Distributed under the MIT License.
