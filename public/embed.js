/*!
 * 客服 SDK：一行脚本接入悬浮气泡 + 聊天面板。
 * <script src="https://<cs-domain>/embed.js" data-cs-product="nicecode" defer></script>
 * <script>CS.init({ product: 'nicecode', tokenProvider: () => fetch('/api/cs-token').then(r => r.text()) })</script>
 */
(function () {
  var current = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var base = (function () {
    try { return new URL(current.src).origin; } catch (error) { return window.location.origin; }
  })();
  var product = current && current.getAttribute('data-cs-product');
  var state = { token: null, tokenProvider: null, opened: false, loaded: false, timer: null, listeners: {} };
  var host = null, frame = null, badge = null, button = null;

  function emit(name, payload) {
    (state.listeners[name] || []).forEach(function (handler) {
      try { handler(payload); } catch (error) { /* 宿主回调异常不影响面板 */ }
    });
  }

  function frameUrl() {
    return base + '/embed/chat?product=' + encodeURIComponent(product || '');
  }

  function postToken() {
    if (frame && frame.contentWindow && state.token) {
      frame.contentWindow.postMessage({ type: 'cs:token', token: state.token }, '*');
    }
  }

  async function refreshToken() {
    if (!state.tokenProvider) return;
    try {
      var token = await state.tokenProvider();
      if (typeof token === 'string' && token) { state.token = token; postToken(); }
    } catch (error) { /* 保持旧 token，过期后由宿主重试 */ }
  }

  function ensureDom() {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-cs-widget', product || '');
    host.style.cssText = 'position:fixed;z-index:2147483000;right:20px;bottom:20px;font-family:system-ui,-apple-system,sans-serif;';

    frame = document.createElement('iframe');
    frame.src = frameUrl();
    frame.title = '在线客服';
    frame.style.cssText = 'display:none;width:380px;height:560px;max-height:calc(100vh - 120px);border:0;border-radius:12px;background:#fff;box-shadow:0 12px 32px rgba(15,23,42,.18);';
    frame.addEventListener('load', postToken);

    button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', '打开在线客服');
    button.style.cssText = 'display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px;background:#059669;color:#fff;font-size:14px;cursor:pointer;box-shadow:0 8px 20px rgba(5,150,105,.35);';
    button.textContent = '在线客服';

    badge = document.createElement('span');
    badge.style.cssText = 'display:none;position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;line-height:18px;text-align:center;padding:0 4px;';
    button.style.position = 'relative';
    button.appendChild(badge);

    host.appendChild(frame);
    host.appendChild(button);
    (document.body || document.documentElement).appendChild(host);

    button.addEventListener('click', function () { toggle(); });
    window.addEventListener('message', function (event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'cs:ready') postToken();
      if (event.data.type === 'cs:unread') setUnread(Number(event.data.count) || 0);
      if (event.data.type === 'cs:close') close();
    });
  }

  function setUnread(count) {
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'block' : 'none';
    emit('unread', count);
  }

  function open() {
    ensureDom();
    state.opened = true;
    frame.style.display = 'block';
    button.style.display = 'none';
    postToken();
    emit('open');
  }

  function close() {
    if (!host) return;
    state.opened = false;
    frame.style.display = 'none';
    button.style.display = 'flex';
    emit('close');
  }

  function toggle() { state.opened ? close() : open(); }

  function destroy() {
    if (state.timer) window.clearInterval(state.timer);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = frame = button = badge = null;
    state.opened = false;
  }

  window.CS = {
    init: function (options) {
      options = options || {};
      if (options.product) product = options.product;
      if (options.tokenProvider) state.tokenProvider = options.tokenProvider;
      ensureDom();
      if (state.tokenProvider) {
        void refreshToken();
        if (state.timer) window.clearInterval(state.timer);
        state.timer = window.setInterval(refreshToken, 10 * 60 * 1000);
      }
      return window.CS;
    },
    open: open,
    close: close,
    toggle: toggle,
    destroy: destroy,
    refreshToken: refreshToken,
    setToken: function (token) { state.token = token; postToken(); },
    setUnread: setUnread,
    on: function (name, handler) {
      state.listeners[name] = state.listeners[name] || [];
      state.listeners[name].push(handler);
      return window.CS;
    }
  };

  if (product) ensureDom();
})();
