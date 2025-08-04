import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import UserCenter from './pages/user/UserCenter';
import { ToastContainer } from './components/Toast';
import { RedirectPage, GoPlusPage } from './pages/other';
import { HeroUIProvider } from '@heroui/react';
import { HomeInfoProvider } from './contexts/HomeInfoContext';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <HeroUIProvider>
        <HomeInfoProvider>
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

                {/* 用户中心路由 */}
                <Route path="/user-center" element={<UserCenter />} />

                {/* 其他功能路由 */}
                <Route path="/handle_callback" element={<RedirectPage />} />
                <Route path="/goplus" element={<GoPlusPage />} />
              </Routes>
            </div>
          </Router>
        </HomeInfoProvider>
      </HeroUIProvider>
    </HelmetProvider>
  );
};

export default App;