(function () {
    // ==================== 可配置参数区（你可以自由修改这里）====================
    const CONFIG = {
        // --- 悬浮球设置 ---
        ball: {
            imageUrl: 'https://niceaigc-cos.niceaigc.com/casdoor/resource/built-in/admin/221.png',
            size: 40,           // 像素
            right: 20,          // 距离右侧距离（px）
            top: '10%',         // 距离顶部位置（支持 '33%' 或 '100px'）
            title: '打开个人中心',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            hoverScale: 1.1,
            hoverShadow: '0 6px 16px rgba(0,0,0,0.3)'
        },

        // --- 右键菜单设置 ---
        contextMenu: {
            width: 150,         // 菜单宽度(px)
            backgroundColor: '#fff',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            itemHeight: 36,     // 菜单项高度(px)
            itemPadding: '0 16px',
            itemHoverColor: '#f5f5f5',
            itemFontSize: '14px',
            itemColor: '#333'
        },

        // --- iframe 弹窗设置 ---
        modal: {
            width: '82%',       // 占视口宽度
            height: '92%',      // 占视口高度
            maxWidth: 1200,     // 最大宽度（px）
            maxHeight: 800,     // 最大高度（px）
            overlayColor: 'rgba(0, 0, 0, 0.6)',
            backdropBlur: '4px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
        },

        // --- 关闭按钮设置 ---
        closeBtn: {
            size: 40,           // 按钮宽高（px）
            top: -50,           // 距离容器顶部偏移（px）
            right: 0,
            backgroundColor: '#fff',
            borderColor: '#ddd',
            textColor: '#333',
            fontSize: '24px',
            shadow: '0 2px 8px rgba(0,0,0,0.15)'
        },

        // --- 行为控制 ---
        behavior: {
            checkInterval: 10000,           // 每隔多少毫秒检查悬浮球是否存在
            forceOpenOnceIn24h: true,       // 是否24小时内强制打开一次
            closeOnOverlayClick: true,      // 是否点击遮罩层关闭弹窗
            mobile: {
                openInNewWindow: false      // 移动端是否新窗口打开（改为false，移动端走iframe）
            }
        },

        // --- URL 与 存储 ---
        urls: {
            iframe: 'https://183ai.com/user-center',
            checkToken: 'https://183ai.com/u/check_xtoken'  // 新增：token验证接口
        },

        // --- Cookie 配置（重点：在这里统一管理需要清除Cookie的域名）---
        cookieSettings: {
            mainDomain: '.183ai.com',    // 主域名（带前缀点，适配子域名）
            rootDomain: '183ai.com'      // 根域名（不带前缀点）
        },

        // --- 存储键名 ---
        storageKeys: {
            lastOpenTime: 'floating_ball_last_open_time'
        }
    };

    // --------------------- 全局状态 ---------------------
    window.__actions_config = { hidden: true };
    console.log('[初始化] window.__actions_config 已设置:', window.__actions_config);

    // --------------------- 工具函数 ---------------------
    /**
     * 从cookie中获取指定名称的值
     * @param {string} name - cookie名称
     * @returns {string|null} - cookie值，不存在则返回null
     */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    /**
     * 清空所有cookie（包括本域名和父域名）
     */
    function clearAllCookies() {
        console.log('[Cookie] 开始清空所有cookie（本域名和父域名）');
        const cookies = document.cookie.split(';');
        const domains = [
            CONFIG.cookieSettings.mainDomain,
            CONFIG.cookieSettings.rootDomain,
            ''  // 空字符串表示当前域名
        ];

        // 遍历所有cookie并删除
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
                domains.forEach(domain => {
                    // 多种方式删除cookie确保彻底清除
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                    if (domain) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; secure`;
                        document.cookie = `${name}=; max-age=0; path=/; domain=${domain}`;
                    } else {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
                        document.cookie = `${name}=; max-age=0; path=/`;
                    }
                });
            }
        });

        // 额外清理常见认证相关cookie
        const commonAuthCookies = [
            'xuserid', 'xtoken', 'cas_access_token', 'access_token', 'refresh_token',
            'user_session', 'auth_token', 'session_id', 'JSESSIONID', 'sessionid'
        ];
        commonAuthCookies.forEach(name => {
            domains.forEach(domain => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                if (domain) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
                }
            });
        });

        console.log('[Cookie] 所有cookie已清空');
    }

    function isMobile() {
        const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const result = mobileRegex.test(navigator.userAgent);
        console.log('[设备检测] 是否移动端:', result);
        return result;
    }

    function setLastOpenTime() {
        const now = Date.now();
        localStorage.setItem(CONFIG.storageKeys.lastOpenTime, now.toString());
        console.log('[存储] 记录打开时间:', new Date(now).toLocaleString());
    }

    function getLastOpenTime() {
        const timeStr = localStorage.getItem(CONFIG.storageKeys.lastOpenTime);
        const time = timeStr ? parseInt(timeStr, 10) : 0;
        console.log('[读取] 上次打开时间:', time ? new Date(time).toLocaleString() : '无记录');
        return time;
    }

    function hasOpenedInLast24Hours() {
        const now = Date.now();
        const lastTime = getLastOpenTime();
        const isWithin24h = now - lastTime < 24 * 60 * 60 * 1000;
        console.log('[判断] 24小时内已打开？', isWithin24h);
        return isWithin24h;
    }

    // --------------------- 动态加载 jQuery ---------------------
    function loadJQuery(callback) {
        if (typeof window.jQuery !== 'undefined') {
            console.log('[jQuery] 已存在');
            callback();
            return;
        }

        console.log('[jQuery] 动态加载中...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            console.log('[jQuery] 加载完成，版本:', jQuery.fn.jquery);
            callback();
        };
        script.onerror = () => {
            console.warn('[jQuery] 加载失败，使用原生 DOM 操作');
            callback();
        };
        document.head.appendChild(script);
    }

    // --------------------- 打开 iframe 弹窗 ---------------------
    function openIframeModal() {
        console.log('[弹窗] 尝试打开 iframe...');

        if (document.getElementById('floating-iframe-modal')) {
            console.log('[弹窗] 已存在，跳过');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'floating-iframe-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: ${CONFIG.modal.overlayColor};
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            backdrop-filter: blur(${CONFIG.modal.backdropBlur});
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: ${isMobile() ? '90%' : CONFIG.modal.width};
            height: ${isMobile() ? '90%' : CONFIG.modal.height};
            max-width: ${CONFIG.modal.maxWidth}px;
            max-height: ${CONFIG.modal.maxHeight}px;
            background: white;
            border-radius: ${CONFIG.modal.borderRadius};
            overflow: hidden;
            box-shadow: ${CONFIG.modal.boxShadow};
        `;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-floating-iframe';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: ${CONFIG.closeBtn.top}px;
            right: ${CONFIG.closeBtn.right}px;
            width: ${CONFIG.closeBtn.size}px;
            height: ${CONFIG.closeBtn.size}px;
            background: ${CONFIG.closeBtn.backgroundColor};
            border: 2px solid ${CONFIG.closeBtn.borderColor};
            border-radius: 50%;
            font: bold ${CONFIG.closeBtn.fontSize} sans-serif;
            color: ${CONFIG.closeBtn.textColor};
            cursor: pointer;
            box-shadow: ${CONFIG.closeBtn.shadow};
            transition: all 0.3s ease;
            z-index: 100001;
            line-height: ${CONFIG.closeBtn.size}px;
            text-align: center;
            padding: 0;
            margin: 0;
        `;
        closeBtn.onclick = () => closeIframeModal();

        const iframe = document.createElement('iframe');
        iframe.src = CONFIG.urls.iframe;
        iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
        iframe.allow = 'fullscreen';

        container.appendChild(closeBtn);
        container.appendChild(iframe);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        if (CONFIG.behavior.closeOnOverlayClick) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    console.log('[交互] 点击遮罩层，关闭弹窗');
                    closeIframeModal();
                }
            };
        }

        window.__actions_config.hidden = false;
        setLastOpenTime();
        console.log('[弹窗] 已打开，hidden = false');
    }

    // --------------------- 关闭弹窗 ---------------------
    function closeIframeModal() {
        const modal = document.getElementById('floating-iframe-modal');
        if (modal) {
            modal.remove();
            console.log('[弹窗] 已关闭');
        }
        window.__actions_config.hidden = true;
        console.log('[状态] __actions_config.hidden = true');
    }

    // --------------------- 右键菜单相关函数 ---------------------
    /**
     * 移除右键菜单
     */
    function removeContextMenu() {
        const menu = document.getElementById('floating-ball-context-menu');
        if (menu) {
            menu.remove();
            console.log('[右键菜单] 已移除');
        }
    }

    /**
     * 创建并显示右键菜单
     * @param {number} x - 菜单显示的X坐标
     * @param {number} y - 菜单显示的Y坐标
     */
    function createContextMenu(x, y) {
        // 先移除已存在的菜单
        removeContextMenu();

        // 创建菜单容器
        const menu = document.createElement('div');
        menu.id = 'floating-ball-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${CONFIG.contextMenu.width}px;
            background: ${CONFIG.contextMenu.backgroundColor};
            border-radius: ${CONFIG.contextMenu.borderRadius};
            box-shadow: ${CONFIG.contextMenu.boxShadow};
            padding: 4px 0;
            z-index: 99999;
            margin: 0;
            list-style: none;
        `;

        // 创建"退出登录"菜单项
        const logoutItem = document.createElement('div');
        logoutItem.textContent = '退出登录';
        logoutItem.style.cssText = `
            height: ${CONFIG.contextMenu.itemHeight}px;
            line-height: ${CONFIG.contextMenu.itemHeight}px;
            padding: ${CONFIG.contextMenu.itemPadding};
            cursor: pointer;
            font-size: ${CONFIG.contextMenu.itemFontSize};
            color: ${CONFIG.contextMenu.itemColor};
        `;

        // 菜单项 hover 效果
        logoutItem.addEventListener('mouseenter', () => {
            logoutItem.style.backgroundColor = CONFIG.contextMenu.itemHoverColor;
        });
        logoutItem.addEventListener('mouseleave', () => {
            logoutItem.style.backgroundColor = 'transparent';
        });

        // 点击退出登录
        logoutItem.addEventListener('click', () => {
            removeContextMenu();
            performLogout();
        });

        menu.appendChild(logoutItem);
        document.body.appendChild(menu);
        console.log('[右键菜单] 已创建');

        // 点击页面其他地方关闭菜单
        document.addEventListener('click', function closeMenuOnClick(e) {
            if (!menu.contains(e.target)) {
                removeContextMenu();
                document.removeEventListener('click', closeMenuOnClick);
            }
        });
    }

    /**
     * 执行退出登录流程
     */
    function performLogout() {
        console.log('[退出登录] 开始执行退出登录流程');

        // 从配置中获取主域名（去除前面的点）
        const mainDomain = CONFIG.cookieSettings.mainDomain.replace(/^\./, '');
        const shareLogoutUrl = `https://share.${mainDomain}/auth/logout`;
        const mainLogoutUrl = `https://${mainDomain}/logout`;
        const homeUrl = `https://${mainDomain}`;

        console.log('[退出登录] 准备请求:', shareLogoutUrl);
        console.log('[退出登录] 准备请求:', mainLogoutUrl);

        // 1. 发送第一个logout请求
        fetch(shareLogoutUrl, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors'
        })
            .then(response => {
                console.log(`[退出登录] 第一个请求响应: ${response.status}`);
                // 2. 发送第二个logout请求
                return fetch(mainLogoutUrl, {
                    method: 'GET',
                    credentials: 'include',
                    mode: 'cors'
                });
            })
            .then(response => {
                console.log(`[退出登录] 第二个请求响应: ${response.status}`);
                // 3. 清空所有cookie
                clearAllCookies();

                // 4. 新窗口打开主域名
                console.log('[退出登录] 打开主域名:', homeUrl);
                window.open(homeUrl, '_blank');

                // 5. 关闭当前窗口
                console.log('[退出登录] 关闭当前窗口');
                window.close();
            })
            .catch(error => {
                console.error('[退出登录] 请求失败:', error);
                // 即使请求失败也执行后续清理操作
                clearAllCookies();
                window.open(homeUrl, '_blank');
                window.close();
            });
    }

    // --------------------- 创建悬浮球 ---------------------
    function createFloatingBall() {
        if (document.getElementById('floating-ball')) return;

        const ball = document.createElement('img');
        ball.id = 'floating-ball';
        ball.src = CONFIG.ball.imageUrl;
        ball.alt = '悬浮球';
        ball.title = CONFIG.ball.title;

        // 移动端可以适当调整悬浮球大小
        const ballSize = isMobile() ? CONFIG.ball.size * 1.2 : CONFIG.ball.size;

        ball.style.cssText = `
            position: fixed;
            top: ${CONFIG.ball.top};
            right: ${CONFIG.ball.right}px;
            width: ${ballSize}px;
            height: ${ballSize}px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 99998;
            box-shadow: ${CONFIG.ball.boxShadow};
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;

        // 鼠标悬停效果
        ball.addEventListener('mouseenter', () => {
            ball.style.transform = `scale(${CONFIG.ball.hoverScale})`;
            ball.style.boxShadow = CONFIG.ball.hoverShadow;
        });
        ball.addEventListener('mouseleave', () => {
            ball.style.transform = 'scale(1)';
            ball.style.boxShadow = CONFIG.ball.boxShadow;
        });

        // 左键点击打开弹窗（移动端与PC端统一使用iframe弹窗）
        ball.addEventListener('click', () => {
            console.log('[悬浮球] 左键被点击');
            openIframeModal();
        });

        // 右键点击显示菜单
        ball.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止默认右键菜单
            e.stopPropagation();
            console.log('[悬浮球] 右键被点击');

            // 获取悬浮球位置信息
            const rect = ball.getBoundingClientRect();
            // 计算菜单位置：悬浮球正下方，右对齐（菜单右侧与悬浮球右侧对齐）
            const menuLeft = rect.right - CONFIG.contextMenu.width; // 右对齐
            const menuTop = rect.bottom; // 正下方
            createContextMenu(menuLeft, menuTop);
        });

        document.body.appendChild(ball);
        console.log('[悬浮球] 已创建');
    }

    // --------------------- 定期检查悬浮球 ---------------------
    function checkAndCreateBall() {
        if (!document.getElementById('floating-ball')) {
            console.warn('[检查] 悬浮球丢失，正在重建');
            createFloatingBall();
        }
    }

    // --------------------- 增强版：消息监听（支持cookie删除和logout）---------------------
    function setupMessageListener() {
        console.log('[通信] 已启动消息监听（不校验来源）');

        window.addEventListener('message', function (event) {
            const data = event.data;

            // 处理导航跳转
            if (data && data.action === 'navigate' && typeof data.url === 'string') {
                console.log('[通信] 收到跳转指令:', data);

                if (data.newWindow === true) {
                    window.open(data.url, '_blank');
                } else {
                    window.location.href = data.url;
                }
            }
            // 处理cookie删除请求
            else if (data && data.action === 'deleteCookies') {
                console.log('[通信] 收到删除cookies指令:', data);

                const cookieNames = data.cookies || [];
                // 使用配置的主域名（默认从CONFIG取，支持消息中动态传入）
                const domain = data.domain || CONFIG.cookieSettings.mainDomain;

                console.log('[Cookie] 准备删除cookies:', cookieNames);
                console.log('[Cookie] 目标域名:', domain);
                console.log('[Cookie] 删除前的cookies:', document.cookie);

                // 删除指定的cookies
                cookieNames.forEach(cookieName => {
                    if (cookieName && cookieName.trim()) {
                        const name = cookieName.trim();
                        console.log(`[Cookie] 正在删除: ${name}`);

                        // 多种删除方式确保彻底（使用配置的域名）
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.cookieSettings.rootDomain}`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.cookieSettings.mainDomain}`;

                        // 带secure属性的删除
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; secure`;
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.cookieSettings.mainDomain}; secure`;

                        // 使用max-age的删除方式
                        document.cookie = `${name}=; max-age=0; path=/; domain=${domain}`;
                        document.cookie = `${name}=; max-age=0; path=/; domain=${CONFIG.cookieSettings.mainDomain}`;
                    }
                });

                // 额外删除常见的认证cookie（使用配置的域名）
                const commonAuthCookies = [
                    'xuserid', 'xtoken', 'cas_access_token', 'access_token', 'refresh_token',
                    'user_session', 'auth_token', 'session_id', 'JSESSIONID', 'sessionid'
                ];

                commonAuthCookies.forEach(cookieName => {
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.cookieSettings.mainDomain}`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.cookieSettings.rootDomain}`;
                });

                console.log('[Cookie] 删除后的cookies:', document.cookie);
                console.log('[Cookie] ✅ Cookie删除操作完成');
            }
            // 处理logout重定向
            else if (data && data.action === 'logout_redirect' && typeof data.url === 'string') {
                console.log('[通信] 收到logout重定向指令:', data);
                console.log('[Logout] 准备跳转到:', data.url);

                // 关闭弹窗（如果存在）
                const modal = document.getElementById('floating-iframe-modal');
                if (modal) {
                    modal.remove();
                    console.log('[Logout] 已关闭iframe弹窗');
                }

                // 短暂延迟后跳转，确保cookie删除操作完成
                setTimeout(() => {
                    console.log('[Logout] 🚀 执行跳转');
                    window.location.href = data.url;
                }, 100);
            }
            else {
                console.log('[通信] 收到未知消息，忽略:', data);
            }
        });
    }

    /**
     * 检查xuserid和xtoken的有效性
     * 1. 检查cookie中是否存在这两个参数
     * 2. 如不存在，清空cookie并刷新
     * 3. 如存在，调用接口验证有效性
     * 4. 验证失败则清空cookie并刷新
     */
    function checkTokenValidity() {
        return new Promise((resolve, reject) => {
            console.log('[Token检查] 开始验证xuserid和xtoken有效性');

            // 1. 从cookie获取参数
            const xuserid = getCookie('xuserid');
            const xtoken = getCookie('xtoken');

            console.log('[Token检查] xuserid存在:', !!xuserid);
            console.log('[Token检查] xtoken存在:', !!xtoken);

            // 2. 检查参数是否完整
            if (!xuserid || !xtoken) {
                console.log('[Token检查] 缺少xuserid或xtoken，需要清理并刷新');
                clearAllCookies();
                window.location.reload();
                return;
            }

            // 3. 调用接口验证有效性
            console.log('[Token检查] 调用验证接口:', CONFIG.urls.checkToken);
            fetch(CONFIG.urls.checkToken, {
                method: 'GET',
                headers: {
                    'xuserid': xuserid,
                    'xtoken': xtoken,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`接口请求失败，状态码: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('[Token检查] 接口返回数据:', data);

                    // 4. 验证code是否为20000
                    if (data.code === 20000) {
                        console.log('[Token检查] 验证通过，无需操作');
                        resolve();
                    } else {
                        console.log('[Token检查] 验证失败，code非20000');
                        clearAllCookies();
                        window.location.reload();
                    }
                })
                .catch(error => {
                    console.error('[Token检查] 验证过程出错:', error);
                    // 请求失败也视为验证失败
                    clearAllCookies();
                    window.location.reload();
                });
        });
    }

    // --------------------- 初始化 ---------------------
    function init() {
        console.log('[初始化] 启动悬浮球系统，配置已加载');

        setupMessageListener();

        // 仅在PC端执行24小时强制打开逻辑（移动端不强制）
        if (!isMobile() && CONFIG.behavior.forceOpenOnceIn24h && !hasOpenedInLast24Hours()) {
            openIframeModal();
            setLastOpenTime();
        }

        // 移动端和PC端都创建悬浮球并启动定时检查
        createFloatingBall();
        setInterval(checkAndCreateBall, CONFIG.behavior.checkInterval);
    }

    // ==================== 启动 ====================
    loadJQuery(function () {
        // 页面完全加载后先执行token检查，再初始化系统
        function onPageReady() {
            // 先检查token有效性，通过后再执行原有初始化逻辑
            checkTokenValidity().then(init);
        }

        // 确保页面完全加载后执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onPageReady);
        } else {
            onPageReady();
        }
    });

})();