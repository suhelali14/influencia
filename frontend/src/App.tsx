import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from './store/hooks'
import LandingPage from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import PrivacyPolicy from './pages/Legal/PrivacyPolicy'
import Terms from './pages/Legal/Terms'
import CreatorDashboard from './pages/Creator/CreatorDashboard'
import CreatorProfile from './pages/Creator/Profile'
import CreatorCampaigns from './pages/Creator/Campaigns'
import CreatorAnalytics from './pages/Creator/Analytics'
import CreatorEarnings from './pages/Creator/Earnings'
import SocialConnect from './pages/Creator/SocialConnect'
import CreatorCollaborations from './pages/Creator/CreatorCollaborations'
import CollaborationDetail from './pages/Creator/CollaborationDetail'
import RecommendedCampaigns from './pages/Creator/RecommendedCampaigns'
import BrandDashboard from './pages/Brand/Dashboard'
import BrandCampaigns from './pages/Brand/Campaigns'
import CreateCampaign from './pages/Brand/CreateCampaign'
import DiscoverCreators from './pages/Brand/DiscoverCreators'
import BrandAnalytics from './pages/Brand/Analytics'
import CreatorMatching from './pages/Brand/CreatorMatching'
import CreatorAnalysis from './pages/Brand/CreatorAnalysis'
import Collaborations from './pages/Brand/Collaborations'
import CampaignDetail from './pages/Campaign/Detail'
import NotFound from './pages/NotFound'

function App() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: string }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    if (role && user?.role !== role) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Dashboard Router */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'creator' ? <CreatorDashboard /> : <BrandDashboard />}
          </ProtectedRoute>
        }
      />

      {/* Creator Routes */}
      <Route
        path="/creator/profile"
        element={
          <ProtectedRoute role="creator">
            <CreatorProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/campaigns"
        element={
          <ProtectedRoute role="creator">
            <CreatorCampaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/analytics"
        element={
          <ProtectedRoute role="creator">
            <CreatorAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/earnings"
        element={
          <ProtectedRoute role="creator">
            <CreatorEarnings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/social-connect"
        element={
          <ProtectedRoute role="creator">
            <SocialConnect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/collaborations"
        element={
          <ProtectedRoute role="creator">
            <CreatorCollaborations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/collaborations/:id"
        element={
          <ProtectedRoute role="creator">
            <CollaborationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/recommended-campaigns"
        element={
          <ProtectedRoute role="creator">
            <RecommendedCampaigns />
          </ProtectedRoute>
        }
      />

      {/* Brand Routes */}
      <Route
        path="/brand/campaigns"
        element={
          <ProtectedRoute role="brand_admin">
            <BrandCampaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/create"
        element={
          <ProtectedRoute role="brand_admin">
            <CreateCampaign />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:id"
        element={
          <ProtectedRoute role="brand_admin">
            <CampaignDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:id/edit"
        element={
          <ProtectedRoute role="brand_admin">
            <CreateCampaign />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:campaignId/matches"
        element={
          <ProtectedRoute role="brand_admin">
            <CreatorMatching />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:campaignId/creator/:creatorId/analysis"
        element={
          <ProtectedRoute role="brand_admin">
            <CreatorAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:campaignId/collaborations"
        element={
          <ProtectedRoute role="brand_admin">
            <Collaborations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/discover"
        element={
          <ProtectedRoute role="brand_admin">
            <DiscoverCreators />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/analytics"
        element={
          <ProtectedRoute role="brand_admin">
            <BrandAnalytics />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/campaign/:id"
        element={
          <ProtectedRoute>
            <CampaignDetail />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
