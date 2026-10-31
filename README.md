# LAMIF - Full-Stack Educational Platform

![LAMIF Platform Banner](https://via.placeholder.com/1200x400.png?text=LAMIF+Educational+Platform)

LAMIF is a comprehensive, full-stack educational platform built to bridge the gap between students and qualified tutors. The platform features a robust booking system and a professional, responsive interface.

## 🌟 Key Features

LAMIF works like a freelance marketplace, built for tutoring.

**For students**
- **Search & filters:** find tutors by subject, keyword, online/in-person, hourly rate, rating, verification and "available now", with several sort orders.
- **Direct booking:** pick a date, time and duration. The tutor's current rate is **locked into the booking**, so later rate changes never affect it.
- **Job posts:** describe what you need and tutors send proposals. Hire straight from a proposal at the tutor's proposed rate.
- **Reviews:** rate completed sessions (1–5 stars plus written feedback).
- **Saved tutors, messaging, and notifications.**

**For tutors**
- **Rich profiles:** headline, bio, subjects, languages, separate online and in-person rates, weekly availability, max-students capacity, photo and CV.
- **Work history & reputation:** generated automatically from completed bookings and reviews, so it can't be edited by hand. Includes Job Success Score, repeat students and public review replies.
- **Badges:** Verified (admin-approved), Rising Talent and Top Rated, all computed from real history.
- **Live status:** "Active with N students", "Available now" (inside a weekly slot) or "Fully booked" (at capacity).
- **Find work:** browse open jobs, send proposals, and track them in one place.
- **Earnings dashboard:** completed earnings, value of active contracts, rating and Job Success Score.

**For admins**
- Platform stats and a tutor verification queue (approve or reject).

### Booking lifecycle

```
requested ──► accepted ──► paid ──► in_progress ──► completed ──► reviewed
    │            │           │
    ▼            ▼           ▼
rejected     cancelled   cancelled
```

The backend enforces who can make each move (see `lamif-backened/lib/bookingLifecycle.js`). Payment is a manual step for now: the tutor confirms once the student has paid outside the app. A tutor cannot accept two bookings that overlap.

## 🚀 Technologies Used

**Frontend:**
- React 19 (Vite)
- React Router DOM
- Axios for API communication
- Custom CSS with Theme Variables

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT) for secure authentication
- Multer for handling multipart/form-data (CV uploads)
- Cors & Dotenv for environment management

**Deployment:**
- **Frontend:** Hosted on Vercel
- **Backend:** Hosted on Render
- **Database:** MongoDB Atlas

## 📂 Project Structure

This repository is structured as a monorepo containing both the frontend and backend applications:

- `/lamif-frontend` - The React Vite application.
- `/lamif-backened` - The Node.js / Express API.

## 🛠️ Local Development Setup

To run this project locally, you will need Node.js and a MongoDB instance running.

### 1. Clone the repository
```bash
git clone https://github.com/oumersalah2-cmd/lamif-project.git
cd lamif-project
```

### 2. Run everything locally (no database setup needed)
```bash
npm install                          # root: installs `concurrently`
npm install --prefix lamif-backened
npm install --prefix lamif-frontend
npm run dev                          # API on :5000, web app on :5173
```
If no `MONGO_URI` is set, the backend starts an **in-memory MongoDB filled with demo data**. The data resets on every restart. The first run downloads a MongoDB binary (~120 MB).

**Demo accounts** (password `password123`):

| Role | Emails |
| --- | --- |
| Admin | `admin@lamif.dev` |
| Tutors | `abebe@lamif.dev`, `hana@lamif.dev`, `dawit@lamif.dev` (pending verification), `sara@lamif.dev` |
| Students | `meron@lamif.dev`, `yonas@lamif.dev`, `liya@lamif.dev` |

### 3. Using a real database
Create `lamif-backened/.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```
And `lamif-frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```
To make an existing account an admin:
```bash
cd lamif-backened
npm run make-admin -- someone@example.com
```

### 4. Tests and checks
```bash
cd lamif-backened && npm test        # API tests against an in-memory database
cd lamif-frontend && npm run lint && npm run build
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License.
