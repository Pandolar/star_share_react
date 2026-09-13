import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider, ToastProvider } from '@heroui/react';
import './styles/globals.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { stripRecoveryParam } from './utils/assetRecovery';
import { enableChunkCacheBypass } from './utils/chunkCacheBypass';
import { installGlobalClientErrorHandlers } from './services/clientLogger';

// 自愈重载会带一次性时间戳参数绕过缓存；异步 chunk 也复用该参数
enableChunkCacheBypass();
stripRecoveryParam();
installGlobalClientErrorHandlers();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <HeroUIProvider locale="zh-CN">
      <ToastProvider placement="top-right" maxVisibleToasts={4} />
      <App />
    </HeroUIProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`);
  });
}
