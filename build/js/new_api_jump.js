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
            // 先检测是否存在"密码"标签
            const hasPasswordLabel = hasPasswordFieldLabel();
            
            if (!hasPasswordLabel) {
                console.log("未检测到密码标签，不执行操作");
                return;
            }
            
            // 检测按钮
            const continueButton = getTargetButton("继续");
            const registerButton = getTargetButton("注册");
            
            // 检查按钮是否存在且可用
            const continueButtonValid = !!continueButton && !isButtonDisabled(continueButton);
            const registerButtonValid = !!registerButton && !isButtonDisabled(registerButton);
            
            // 组合判断逻辑
            if (continueButtonValid) {
                console.log("检测到密码标签和可用的'继续'按钮，执行继续按钮逻辑");
                handleContinueAction();
            } 
            else if (registerButtonValid) {
                console.log("检测到密码标签和可用的'注册'按钮，执行注册按钮逻辑");
                handleRegisterAction();
            }
            else {
                console.log("检测到密码标签，但未找到可用的继续或注册按钮");
            }
        } catch (error) {
            console.error("处理过程中发生错误：", error);
        }
    }

    // 检测是否存在"密码"标签
    function hasPasswordFieldLabel() {
        const labels = document.querySelectorAll('.semi-form-field-label-text');
        for (const label of labels) {
            if (label.textContent.trim() === "密码" && label.hasAttribute('x-semi-prop') && label.getAttribute('x-semi-prop') === 'label') {
                return true;
            }
        }
        return false;
    }

    // 获取目标按钮（根据文本内容）
    function getTargetButton(text) {
        const buttons = document.querySelectorAll(
            'button.semi-button.semi-button-primary.semi-button-size-large.w-full.\\!rounded-full[type="submit"]'
        );
        
        for (const btn of buttons) {
            const contentSpan = btn.querySelector('.semi-button-content');
            if (contentSpan && contentSpan.textContent.trim() === text) {
                return btn;
            }
        }
        return null;
    }

    // 检查按钮是否禁用
    function isButtonDisabled(button) {
        return button.disabled || button.getAttribute('aria-disabled') === 'true';
    }

    // 提取主域名
    function getMainDomain() {
        const currentDomain = window.location.hostname;
        const domainParts = currentDomain.split('.');
        return domainParts.length >= 2 
            ? domainParts.slice(-2).join('.') 
            : currentDomain;
    }

    // 处理继续按钮逻辑
    function handleContinueAction() {
        const mainDomain = getMainDomain();
        const currentDomain = window.location.hostname;
        
        // 检查是否存在注册按钮（用于判断是否需要跳转）
        const registerButton = getTargetButton("注册");
        const registerButtonExists = !!registerButton && !isButtonDisabled(registerButton);
        
        if (registerButtonExists) {
            console.log("检测到注册按钮，准备跳转至注册页面");
            const registerUrl = `https://${mainDomain}/register?fromurl=https://${currentDomain}/login`;
            setTimeout(() => window.location.href = registerUrl, 0);
        } else {
            console.log("未检测到注册按钮，准备请求check_newapi接口");
            const apiUrl = `https://${mainDomain}/u/check_newapi`;
            fetch(apiUrl)
                .then(res => console.log("接口请求状态：", res.status))
                .catch(err => console.error("接口请求失败：", err));
        }
    }

    // 处理注册按钮逻辑
    function handleRegisterAction() {
        const mainDomain = getMainDomain();
        const currentDomain = window.location.hostname;
        console.log("执行注册按钮逻辑，准备跳转至注册页面");
        const registerUrl = `https://${mainDomain}/register?fromurl=https://${currentDomain}/login`;
        setTimeout(() => window.location.href = registerUrl, 0);
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
