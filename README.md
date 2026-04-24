# LAMIF - Full-Stack Educational Platform

![LAMIF Platform Banner](https://via.placeholder.com/1200x400.png?text=LAMIF+Educational+Platform)

LAMIF is a comprehensive, full-stack educational platform built to bridge the gap between students and qualified tutors. The platform features a robust booking system and a professional, responsive interface.

## 🌟 Key Features

- **Role-Based Architecture:** Distinct dashboards and capabilities for 'Students' and 'Tutors'.
- **Tutor Profiles & CV Uploads:** Tutors can create professional profiles, list their subjects and hourly rates, and upload their CVs securely.
- **Booking System:** Students can seamlessly browse available tutors, view their qualifications, and book sessions.
- **Modern UI/UX:** A fully responsive, accessible design with glassmorphism elements, CSS micro-animations, and a built-in Dark/Light mode toggle.
- **Secure Authentication:** Robust user registration and login system protected by JWT (JSON Web Tokens) and bcrypt password hashing.

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

### 2. Backend Setup
```bash
cd lamif-backened
npm install
```
Create a `.env` file in the `lamif-backened` directory with the following variables:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```
Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd lamif-frontend
npm install
```
Create a `.env` file in the `lamif-frontend` directory:
```
VITE_API_URL=http://localhost:5000
```
Start the development server:
```bash
npm run dev
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License.
