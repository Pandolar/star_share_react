const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:18188';

  // 代理 /star 到后端 /star
  app.use(
    '/star',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
  
  // 代理 /u 到后端 /u  
  app.use(
    '/u',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
};
