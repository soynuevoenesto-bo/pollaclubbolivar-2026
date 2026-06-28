import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from './lib/firebase'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import BracketPage from './pages/BracketPage'
import StandingsPage from './pages/StandingsPage'
import AdminPage from './pages/AdminPage'
import './styles/global.css'

function Shell() {
  const { user, userData, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!user) return <AuthPage />

  const handleLogout = () => signOut(auth)

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div className="topbar-brand">
          <span className="ball">⚽</span>
          <span>Polla Mundial 2026</span>
        </div>
        <div className="topbar-nav">
          <NavLink to="/bracket" className={({ isActive }) => isActive ? 'active' : ''}>
            Pronósticos
          </NavLink>
          <NavLink to="/standings" className={({ isActive }) => isActive ? 'active' : ''}>
            Posiciones
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
              Admin
            </NavLink>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '0 4px' }}>
            {userData?.username}
          </span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/bracket" element={<BracketPage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/bracket" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}
