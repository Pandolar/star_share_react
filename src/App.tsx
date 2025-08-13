import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import UserCenter from './pages/user/UserCenter';
import { ToastContainer } from './components/Toast';
import GoPlusPage from './pages/features/GoPlusPage';
import RedirectPage from './pages/features/RedirectPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import NewApiPage from './pages/features/NewApiPage';
import { HeroUIProvider } from '@heroui/react';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <HeroUIProvider>
        <Router>
          <div className="App">
            {/* 全局Toast通知容器 */}
            <ToastContainer />
            <Routes>
              {/* 主页路由 */}
              <Route
                path="/"
                element={
                  <ErrorBoundary autoReload={true} reloadDelay={1500}>
                    <HomePage />
                  </ErrorBoundary>
                }
              />

              {/* 认证路由 */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* 用户中心路由 */}
              <Route path="/user-center" element={<UserCenter />} />

              {/* 其他功能路由 */}
              <Route path="/handle_callback" element={<RedirectPage />} />
              <Route path="/goplus" element={<GoPlusPage />} />
              <Route path="/new-api" element={<NewApiPage />} />
            </Routes>
          </div>
        </Router>
      </HeroUIProvider>
    </HelmetProvider>
  );
};

export default App;