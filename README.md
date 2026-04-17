# 🏟️ Smart Venue Experience

A real-time, zero-dependency, multi-portal venue management system simulating the operational dynamics of large-scale sporting events and stadiums.

The platform provides a **Node.js + WebSockets backend** operating as a live IoT simulation engine, broadcasting queue times, zone occupancies, and automated workflow events to three distinct role-based front-end portals.

---

## 📸 Portals Overview

**1. 📱 Attendee Portal (`/attendee/`)**  
A mobile-first SPA built for stadium visitors. Features live queue wait-times, food ordering with seat delivery routing, issue reporting, and an interactive venue map.

**2. 🦺 Staff Operations (`/staff/`)**  
A role-gated portal for marshals and supervisors. Features walkie-talkie style zone chat, incident claiming and resolution, and manual sensor overrides for queue lengths.

**3. 🖥️ Command Center (`/command/`)**  
A desktop-optimized dashboard for venue directors. Features a dynamic heat map, live gate queue bar charts, incident escalation matrices, and SLA performance gauges.

---

## ⚙️ Architecture & Features

### 🔌 Live WebSocket Synchronization
Instead of a database, the system uses an **in-memory RAM store** on the Node.js server. A background IoT simulator "ticks" every 6 seconds, slightly altering crowd flows and wait times. These changes are broadcast to all open portals instantly via WebSockets — creating a completely synced real-time experience across all connected devices.

### 🤖 5 Automated Workflows
The backend runs continuous listeners that trigger automation events without human intervention:
- **Crowd Surge:** Alerts attendees and deploys staff if a zone exceeds 85% capacity.
- **Queue Threshold:** Pushes a notification to attendees in the zone when a line drops below a 5-minute wait.
- **Incident Escalation:** Auto-assigns nearest available staff to a new incident in 3s; escalates to a supervisor after 8s.
- **Order Routing:** Triggers a dispatcher when food prep finishes, marking a runner as "busy".
- **Gate Balancing:** Suggests alternative, faster entry gates to attendees if their current line exceeds expected loads.

### ✨ AI Incident summarization
The Command Center integrates directly with the **Google Gemini API** (`gemini-2.5-flash`). Venue directors can click "AI Summary" to have the LLM evaluate all open/critical incidents in the venue and formulate a 1-sentence tactical action plan.

### 🛡️ Production Readiness & Security
The REST API is hardened with **Helmet** (HTTP header shielding), **express-rate-limit** (DDoS mitigation), and **compression** (Gzip Brotli payloads). Codebase quality is maintained via a strict **ESLint** flat-config, and automated testing is handled via **Jest** and **Supertest** covering workflow automation routing.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (0 dependencies)
- **Backend:** Node.js, Express
- **Real-time:** `ws` (native WebSockets instance)
- **AI Integration:** `@google/genai` (Gemini 2.5 Flash)
- **Testing & Tooling:** Jest, Supertest, ESLint, Prettier
- **Security:** Helmet, express-rate-limit, compression, dotenv

---

## 🚀 Running Locally

1. Ensure **Node.js** is installed.
2. Clone this repository and move into the project folder.
3. Install the dependencies for the backend:
```bash
npm install
```
4. Start the server (which hosts both the API and the front-end files):
```bash
npm start
```
5. Open your browser and go to `http://localhost:3000` to dive into the landing hub.

---

## 🌐 Deploying to Production (Railway/Render)

The application is configured to run flawlessly on standard containerized platforms like **Railway.app** or **Render.com**. 
The repository intentionally contains a root-level `package.json` with a single unified `start` script, so standard container build processes will detect it automatically. No build step or environment variables are heavily required, as the WebSockets auto-detect the production environment domain.
