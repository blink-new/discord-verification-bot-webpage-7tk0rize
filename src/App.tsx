import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import VerificationPage from './pages/VerificationPage'
import CallbackPage from './pages/CallbackPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import SecureAdminDashboard from './pages/SecureAdminDashboard'
import BotSetupGuide from './pages/BotSetupGuide'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Router>
        <Routes>
          <Route path="/" element={<VerificationPage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<SecureAdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/setup" element={<BotSetupGuide />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </div>
  )
}

export default App