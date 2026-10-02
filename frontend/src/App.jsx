import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/home/HomePage';
import Search from './pages/SearchPage';
import SearchHistory from './pages/SearchHistoryPage';
import Watch from './pages/WatchPage';
import CustomVideos from './pages/CustomVideosPage';
import UploadVideo from './pages/UploadVideoPage';
import WatchCustomVideo from './pages/WatchCustomVideoPage';
import Login from './pages/LoginPage';
import SignUp from './pages/SignUpPage';
import ForgotPassword from './pages/ForgotPasswordPage';
import ResetPassword from './pages/ResetPasswordPage';
import EmailVerification from './pages/EmailVerificationPage';
import NotFound from './pages/NotFoundPage';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuthStore } from './store/auth.store.js';

function App() {
  const { checkAuth, isCheckingAuth, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  return (
    <>
      <Routes>
        {/* protected routes */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={user ? <Search /> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <SearchHistory /> : <Navigate to="/login" />} />
        <Route path="/watch/:id" element={user ? <Watch /> : <Navigate to="/login" />} />
        <Route path="/custom-videos" element={user ? <CustomVideos /> : <Navigate to="/login" />} />
        <Route path="/upload" element={user ? <UploadVideo /> : <Navigate to="/login" />} />
        <Route path="/watch-custom/:id" element={user ? <WatchCustomVideo /> : <Navigate to="/login" />} />

        {/* public routes for the authentication or authorization page */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" />} />
        <Route path="/forgot/password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route path="/reset/password/:token" element={!user ? <ResetPassword /> : <Navigate to="/" />} />
        <Route
          path="/verify/email"
          element={user && !user?.isVerified ? <EmailVerification /> : <Navigate to="/login" />}
        />

        {/* Add more routes as needed */}
        {/* <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} /> */}

        {/* route for the 404 page */}
        <Route path="/*" element={<NotFound />} />
      </Routes>
      <Footer />
      <Toaster />
    </>
  );
}

export default App;
