// 使用IIFE包裹以避免全局变量污染
(async function() {
    // 等待页面初始加载完成（基础DOM就绪）
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

    // 检测是否存在"密码"标签（精准匹配）
    function hasPasswordFieldLabel() {
        // 精准选择器：类名 + 属性 + 文本内容
        const labels = document.querySelectorAll('.semi-form-field-label-text[x-semi-prop="label"]');
        for (const label of labels) {
            // 严格匹配文本（去除空格后比较）
            if (label.textContent.trim() === "密码") {
                console.log("成功检测到密码标签");
                return true;
            }
        }
        console.log("未找到符合条件的密码标签（类名、属性或文本不匹配）");
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

    // 从cookie中获取指定名称的值
    function getCookie(name) {
        // 将cookie字符串分割成单个cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            // 去除首尾空格
            cookie = cookie.trim();
            // 检查当前cookie是否是目标cookie
            if (cookie.startsWith(`${name}=`)) {
                // 提取并返回cookie值
                return cookie.substring(name.length + 1);
            }
        }
        // 如果没有找到指定cookie，返回空字符串
        return '';
    }

    // 处理继续按钮逻辑
    function handleContinueAction() {
        const mainDomain = getMainDomain();
        const currentDomain = window.location.hostname;
        
        const registerButton = getTargetButton("注册");
        const registerButtonExists = !!registerButton && !isButtonDisabled(registerButton);
        
        if (registerButtonExists) {
            console.log("检测到注册按钮，准备跳转至注册页面");
            const registerUrl = `https://${mainDomain}/register?fromurl=https://${currentDomain}/login`;
            setTimeout(() => window.location.href = registerUrl, 0);
        } else {
            console.log("未检测到注册按钮，准备请求check_newapi接口");
            const apiUrl = `https://${mainDomain}/u/check_newapi`;
            
            // 从cookie获取xuserid和xtoken
            const xuserId = getCookie('xuserid');
            const xToken = getCookie('xtoken');
            
            console.log(`从cookie获取到xuserid: ${xuserId}, xtoken: ${xToken ? '已获取' : '未获取'}`);
            
            // 配置请求头，包含必要参数
            const headers = new Headers();
            headers.append('xuserid', xuserId);
            headers.append('xtoken', xToken);
            
            // 发送GET请求并设置请求头
            fetch(apiUrl, {
                method: 'GET',
                headers: headers,
                credentials: 'include' // 确保请求包含凭证信息（如cookie）
            })
            .then(res => {
                console.log("接口请求状态：", res.status);
                return res.text(); // 可以根据实际情况改为res.json()
            })
            .then(data => {
                console.log("接口返回数据：", data);
            })
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

    // 路由变化处理函数（延迟1秒检测）
    function handleRouteChange() {
        console.log("检测到前端路由变化，1秒后执行检查...");
        // 延迟1秒，确保动态内容加载完成
        setTimeout(checkAndHandleActions, 1000);
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

    // 初始检查（延迟1秒，确保页面完全加载）
    console.log("页面初始加载，1秒后执行首次检查...");
    setTimeout(checkAndHandleActions, 1000);

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('popstate', handleRouteChange);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
    });
})();
