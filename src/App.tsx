import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './LandingPage';
import CookieConsentBanner from './components/CookieConsentBanner';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { getPortfolioSlugFromHostname } from './shared/portfolioSubdomain';

const PortfolioPublicPage = lazyWithRetry(() => import('./PortfolioPublicPage'));
const AuthPage = lazyWithRetry(() => import('./AuthPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('./ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./ResetPasswordPage'));
const ResumeBuilder = lazyWithRetry(() => import('./ResumeBuilder'));
const Dashboard = lazyWithRetry(() => import('./Dashboard'));
const TemplatesGallery = lazyWithRetry(() => import('./TemplatesGallery'));
const AdminPage = lazyWithRetry(() => import('./AdminPage'));
const RecruiterPage = lazyWithRetry(() => import('./RecruiterPage'));
const PricingPage = lazyWithRetry(() => import('./PricingPage'));
const BlogPage = lazyWithRetry(() => import('./BlogPage'));
const JobPostingPage = lazyWithRetry(() => import('./JobPostingPage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('./PrivacyPolicyPage'));
const TermsPage = lazyWithRetry(() => import('./TermsPage'));
const LegalNoticePage = lazyWithRetry(() => import('./LegalNoticePage'));
const ContactPage = lazyWithRetry(() => import('./ContactPage'));
const AboutPage = lazyWithRetry(() => import('./AboutPage'));
const NotFoundPage = lazyWithRetry(() => import('./NotFoundPage'));
const CookiePolicyPage = lazyWithRetry(() => import('./CookiePolicyPage'));
const RefundPolicyPage = lazyWithRetry(() => import('./RefundPolicyPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#090e1a] flex items-center justify-center text-slate-400 text-xs">
      Chargement...
    </div>
  );
}

export default function App() {
  // A published-portfolio subdomain (jean-dupont-a1b2c3.cvpilot.fr) always
  // serves the portfolio, regardless of path — checked once per load since
  // the hostname can't change without a full page navigation.
  const portfolioSlugFromHost = getPortfolioSlugFromHostname(window.location.hostname);

  return (
    <AuthProvider>
      <Router>
        <CookieConsentBanner />
        <Suspense fallback={<RouteFallback />}>
          {portfolioSlugFromHost ? (
            <Routes>
              <Route path="*" element={<PortfolioPublicPage slug={portfolioSlugFromHost} />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter"
                element={
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <RecruiterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/builder" element={<ResumeBuilder />} />
              <Route path="/templates" element={<TemplatesGallery />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/mentions-legales" element={<LegalNoticePage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
              <Route path="/refund" element={<RefundPolicyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/a-propos" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/job/:id" element={<JobPostingPage />} />
              <Route path="/jobs/:id" element={<JobPostingPage />} />
              <Route path="/p/:slug" element={<PortfolioPublicPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          )}
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
