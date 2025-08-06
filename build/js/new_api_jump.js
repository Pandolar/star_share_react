// 使用IIFE包裹以避免全局变量污染
(async function() {
    // 等待页面加载完成
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });

    // 检查逻辑（核心函数）
    async function checkAndHandleActions() {
        try {
            // 直接通过精准选择器获取按钮
            const continueButton = getContinueButton();
            const registerButton = getRegisterButton();
            
            // 检查按钮是否存在且可用
            const continueButtonExists = !!continueButton && !isButtonDisabled(continueButton);
            const registerButtonExists = !!registerButton && !isButtonDisabled(registerButton);
            
            // 日志与逻辑处理
            if (!continueButtonExists && !registerButtonExists) {
                console.log("未检测到可用的继续按钮和注册按钮");
                return;
            }
            
            if (continueButtonExists) {
                console.log("检测到可用的'继续'按钮");
                const mainDomain = getMainDomain();
                const currentDomain = window.location.hostname;
                
                if (registerButtonExists) {
                    console.log("检测到可用的'注册'按钮，准备跳转");
                    const registerUrl = `https://${mainDomain}/register?fromurl=https://${currentDomain}/login`;
                    setTimeout(() => window.location.href = registerUrl, 0);
                } else {
                    console.log("未检测到可用的'注册'按钮，准备请求接口");
                    const apiUrl = `https://${mainDomain}/u/check_newapi`;
                    fetch(apiUrl)
                        .then(res => console.log("接口请求状态：", res.status))
                        .catch(err => console.error("接口请求失败：", err));
                }
            } else {
                console.log("仅检测到注册按钮，未检测到继续按钮，不执行操作");
            }
        } catch (error) {
            console.error("处理过程中发生错误：", error);
        }
    }

    // 精准获取"继续"按钮（利用子元素文本和类名组合定位）
    function getContinueButton() {
        return document.querySelector(
            'button.semi-button.semi-button-primary.semi-button-size-large.w-full.\\!rounded-full[type="submit"]:has(.semi-button-content:contains("继续"))'
        );
    }

    // 精准获取"注册"按钮
    function getRegisterButton() {
        return document.querySelector(
            'button.semi-button.semi-button-primary.semi-button-size-large.w-full.\\!rounded-full[type="submit"]:has(.semi-button-content:contains("注册"))'
        );
    }

    // 检查按钮是否禁用
    function isButtonDisabled(button) {
        return button.disabled || button.getAttribute('aria-disabled') === 'true';
    }

    // 提取主域名（同步方法，无需异步）
    function getMainDomain() {
        const currentDomain = window.location.hostname;
        const domainParts = currentDomain.split('.');
        return domainParts.length >= 2 
            ? domainParts.slice(-2).join('.') 
            : currentDomain;
    }

    // 路由变化处理函数
    function handleRouteChange() {
        console.log("检测到前端路由变化，执行检查...");
        // 路由变化后DOM可能未更新，延迟检查
        setTimeout(checkAndHandleActions, 300);
    }

    // 监听路由变化
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handleRouteChange();
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        handleRouteChange();
    };

    window.addEventListener('popstate', handleRouteChange);

    // 初始检查
    console.log("页面初始加载，执行首次检查...");
    checkAndHandleActions();

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('popstate', handleRouteChange);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
    });
})();
