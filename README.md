# 🎓 LAMIF — Full-Stack Educational Marketplace

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Globe-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Tests](https://img.shields.io/badge/API%20Tests-12%2F12%20Passing-brightgreen)](https://nodejs.org/api/test.html)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Ethiopia's premier marketplace for learning — bridging the gap between students and qualified tutors with direct booking, proposal bidding, real-time schedule conflict prevention, and verified credentials.**

[Key Features](#-key-features) • [Interactive 3D UI](#-interactive-3d-experience) • [Booking Engine](#-booking-lifecycle-state-machine) • [Tech Stack](#-tech-stack) • [Quickstart](#-quickstart--local-development) • [API Reference](#-api-endpoints)

</div>

---

## 📖 Overview

**LAMIF** is a full-stack, two-sided educational platform tailored for the modern academic landscape. Bringing the proven freelance marketplace model (like Upwork and Preply) to tutoring, LAMIF empowers students—from Grade 1 through university—to easily discover, book, and collaborate with certified tutors for both online and in-person sessions.

Engineered as a clean monorepo, the platform combines a **React 19 & Three.js** interactive client with a secure **Node.js/Express 5 & MongoDB** backend running a strict finite-state booking engine.

---

## 🌟 Key Features

### 👨‍🎓 For Students
* **Multi-Criteria Discovery:** Filter tutors by subject, hourly rate, online vs. in-person availability, rating, admin verification, and live "Available Now" status.
* **Direct Booking with Price Lock:** Select appointment dates, times, and durations. The tutor's rate at booking time is **permanently locked**, shielding students from subsequent price increases.
* **Job Board & Proposal Hiring:** Post custom learning requirements, receive competitive proposals from interested tutors, and hire directly at proposed rates.
* **Verified Reviews:** Submit 1–5 star ratings and detailed written feedback after session completion.
* **Engagement Tools:** Save favorite tutors, view real-time notifications, and direct message tutors before or after booking.

### 👩‍🏫 For Tutors
* **Rich Professional Profiles:** Bio, subject specialties, spoken languages, separate online and in-person rates, weekly time slots, student capacity limits, and CV upload.
* **Tamper-Proof Reputation:** Work history, Job Success Score (JSS), repeat client counts, and client reviews are automatically calculated by the system from completed bookings.
* **Earned Badges:** Dynamic badge engine awards **Verified** (admin-approved), **Rising Talent**, and **Top Rated** based on actual completed contracts and performance metrics.
* **Real-Time Capacity Indicators:** Automated indicators show whether a tutor is *"Available Now"* (within an open slot), *"Active with N students"*, or *"Fully Booked"* (at maximum capacity).
* **Proposal & Job Center:** Browse student job postings, submit tailored bids, and track proposal statuses in one place.
* **Financial & Analytics Dashboard:** Monitor completed earnings, active contract valuation, reviews, and client ratings.

### 🛡️ For Administrators
* **Verification Queue:** Review tutor identity credentials, qualification documents, and CVs with one-click approval or rejection.
* **Platform Analytics:** Real-time statistics on active users, total sessions, platform revenue volume, and booking health.

---

## 🌐 Interactive 3D Experience

LAMIF features an interactive, procedural **Geodesic 3D Globe** built with **Three.js** integrated seamlessly into the authentication and hero sections. The visual experience is complemented by:
* Custom CSS design tokens with full **Dark & Light Mode** toggle support.
* Modern typography, glassmorphism card surfaces, and micro-interactions.
* Fluid mobile-responsive layouts tested across mobile, tablet, and desktop viewports.

---

## 🔄 Booking Lifecycle State Machine

Bookings follow a strict backend-enforced state machine to ensure transactional integrity and schedule conflict prevention:

```
[ requested ] ──► [ accepted ] ──► [ paid ] ──► [ in_progress ] ──► [ completed ] ──► [ reviewed ]
      │                 │            │
      ▼                 ▼            ▼
[ rejected ]      [ cancelled ]  [ cancelled ]
```

### Safety & Integrity Rules
1. **Schedule Conflict Prevention:** A tutor can receive overlapping requests, but accepting one session **automatically blocks conflicting slots** and prevents duplicate bookings.
2. **Actor Enforcement:** Only students can initiate or cancel pending requests; only tutors can accept or reject bookings; only admins/tutors confirm payment settlement.
3. **Immutable Price Locking:** Rates negotiated at the time of booking or proposal acceptance remain fixed throughout the contract.
4. **Validation Bounds:** Tutors cannot book themselves, accept modes they do not support, or exceed their defined student capacity.

---

## 🚀 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19, Vite 8 | Ultra-fast SPA with modern React Hooks & Router v7 |
| **3D Graphics** | Three.js | Procedural 3D geodesic world globe and canvas animations |
| **Styling** | Custom Vanilla CSS | CSS variables design system, light/dark themes, responsive flex/grid |
| **Backend API** | Node.js, Express 5 | RESTful architecture with structured middleware & route modularity |
| **Database** | MongoDB & Mongoose | Flexible document schemas with custom model methods and indexing |
| **Authentication** | JWT & bcryptjs | Stateless JSON Web Tokens with password hashing and role validation |
| **File Storage** | Multer | Local multipart/form-data upload pipeline for tutor CVs |
| **Testing** | Node.js Test Runner | Automated end-to-end integration tests over in-memory database |
| **Dev Tooling** | Concurrently | Single-command root execution for full-stack concurrent development |

---

## 📂 Project Structure

```bash
lamif-project/
├── lamif-backened/             # Node.js + Express API Backend
│   ├── lib/                    # Core business logic (booking lifecycle, stats calculators)
│   ├── middleware/             # Auth JWT verification, admin guards, error handlers
│   ├── models/                 # Mongoose schemas (User, Tutor, Booking, Job, Proposal, Review, etc.)
│   ├── routes/                 # Modular REST API endpoints
│   ├── scripts/                # Utility scripts (make-admin CLI)
│   ├── tests/                  # Integration test suites against in-memory MongoDB
│   ├── uploads/                # Static file uploads (CVs and attachments)
│   ├── app.js                  # Express application setup
│   ├── seed.js                 # Realistic demo data seeder
│   ├── server.js               # Server entry point with automated DB fallback
│   └── package.json
│
├── lamif-frontend/             # React 19 + Vite Frontend
│   ├── public/                 # Public static assets
│   ├── src/
│   │   ├── components/         # Reusable UI (GeodesicGlobe3D, Navbar, AuthLayout, Badges, etc.)
│   │   ├── pages/              # Views (Home, BrowseTutors, TutorProfile, Jobs, Dashboard, Admin, etc.)
│   │   ├── context/            # Global authentication & theme context
│   │   ├── services/           # Axios API service instances
│   │   ├── App.jsx             # Route definitions & layout wrappers
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── package.json                # Monorepo root scripts & orchestration
└── README.md
```

---

## 🛠️ Quickstart & Local Development

LAMIF is designed for **frictionless setup**. If no external MongoDB URI is provided, it automatically provisions an **in-memory MongoDB database** populated with rich demo data—**no database installation required!**

### 1. Clone the repository
```bash
git clone https://github.com/oumersalah2-cmd/lamif-project.git
cd lamif-project
```

### 2. Install all dependencies
```bash
# Installs root, backend, and frontend packages in one command
npm run install:all
```

### 3. Launch the development environment
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)

*(On the first launch without a remote MongoDB URI, the in-memory database will download (~120 MB) and seed accounts automatically).*

---

## 🔑 Pre-Seeded Demo Accounts

All demo accounts use the default password: **`password123`**

| Role | Email | Features to Test |
|---|---|---|
| **Admin** | `admin@lamif.dev` | Tutor verification queue, platform metrics |
| **Tutor (Verified & Top Rated)** | `abebe@lamif.dev` | Profile management, availability, accept bookings, proposal bids |
| **Tutor (Pending Verification)** | `dawit@lamif.dev` | View pending status, CV upload inspection |
| **Tutor** | `hana@lamif.dev` | Active student capacity, earnings dashboard |
| **Student** | `meron@lamif.dev` | Search tutors, book sessions, post jobs, leave reviews |
| **Student** | `yonas@lamif.dev` | Manage job postings, hire from proposals |

---

## ⚙️ Environment Configuration

### Backend (`lamif-backened/.env`)
Copy `lamif-backened/.env.example` to `lamif-backened/.env`:
```env
PORT=5000
# Optional: leave empty for in-memory MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/lamif
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=LAMIF <no-reply@lamif.dev>
```

`SMTP_HOST` is optional. Without it, verification emails are printed in the backend console instead of being sent. Existing accounts and seeded demo accounts are already verified.

### Frontend (`lamif-frontend/.env`)
Copy `lamif-frontend/.env.example` to `lamif-frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### Promote an Account to Admin
```bash
cd lamif-backened
npm run make-admin -- someone@example.com
```

---

## 📡 API Endpoints

| Resource | Base Route | Key Operations |
|---|---|---|
| **Authentication** | `/api/auth` | Register, Login, Current User profile |
| **Tutors** | `/api/tutor` | Search tutors, filter by mode/rate, get public profile, update profile & CV |
| **Bookings** | `/api/booking` | Create booking, accept/reject, mark paid, cancel, complete session |
| **Jobs** | `/api/jobs` | Post new job, list jobs with filters, view job details |
| **Proposals** | `/api/proposals` | Submit proposal, hire from proposal, withdraw proposal |
| **Reviews** | `/api/reviews` | Create review, fetch tutor review history, reply to review |
| **Messages** | `/api/messages` | Send message, fetch thread history, unread count badge |
| **Notifications** | `/api/notifications` | Fetch user alerts, mark as read |
| **Saved** | `/api/saved` | Bookmark/unbookmark tutors, get saved list |
| **Admin** | `/api/admin` | Tutor verification queue, approve/reject tutor, platform metrics |
| **Public** | `/api/public` | Landing page highlights, featured tutors, platform metrics |

---

## 🧪 Testing & Code Quality

LAMIF includes automated integration tests executing against an isolated in-memory database to validate authentication, booking conflict safety, pricing locks, and proposal hiring flows.

```bash
# Run backend integration tests
npm test

# Run frontend linting & production build test
npm run lint
npm run build
```

---

## 🤝 Contributing

Contributions, feedback, and pull requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.

---

<div align="center">
  <sub>Built with ❤️ for education and tutoring in Ethiopia.</sub>
</div>
