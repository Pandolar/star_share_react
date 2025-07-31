window.onload = function() {
    function clickOIDCButton() {
        // 更通用的按钮选择器
        const buttons = document.getElementsByTagName("button");
        let oidcButton = null;
        
        for (let btn of buttons) {
            if (btn.textContent.includes("使用 OIDC 继续")) {
                oidcButton = btn;
                break;
            }
        }
        
        if (oidcButton && !oidcButton.disabled) {
            console.log("OIDC button found and clicked");
            oidcButton.click();
        } else {
            console.log("OIDC button not found or disabled");
            // 如果没找到，0.5秒后重试
            setTimeout(clickOIDCButton, 500);
        }
    }

    // 创建 MutationObserver 来监听 DOM 的变化
    const observer = new MutationObserver(function(mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                clickOIDCButton();  // 每当 DOM 更新时尝试点击按钮
            }
        }
    });

    // 配置观察器
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 页面加载后延迟
    setTimeout(clickOIDCButton, 800);
};
