import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import BrowseTutors from './pages/BrowseTutors'
import TutorProfile from './pages/TutorProfile'
import ProfileEditor from './pages/ProfileEditor'
import Jobs from './pages/Jobs'
import PostJob from './pages/PostJob'
import JobDetail from './pages/JobDetail'
import MyProposals from './pages/MyProposals'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import SavedTutors from './pages/SavedTutors'
import Admin from './pages/Admin'

function AppLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<AppLayout />}>
          <Route path="/browse-tutors" element={<BrowseTutors />} />
          <Route path="/tutors/:id" element={<TutorProfile />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />

          <Route path="/dashboard" element={<ProtectedRoute roles={['student', 'tutor']}><Dashboard /></ProtectedRoute>} />
          <Route path="/messages/:conversationId?" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><SavedTutors /></ProtectedRoute>} />
          <Route path="/jobs/new" element={<ProtectedRoute roles={['student']}><PostJob /></ProtectedRoute>} />
          <Route path="/proposals" element={<ProtectedRoute roles={['tutor']}><MyProposals /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute roles={['tutor']}><ProfileEditor /></ProtectedRoute>} />
          <Route path="/create-profile" element={<Navigate to="/profile/edit" replace />} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
