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

    // 异步检查是否存在目标"继续"按钮
    async function hasContinueButton() {
        return new Promise(resolve => {
            requestIdleCallback(() => {
                const continueButtons = document.querySelectorAll(
                    'button.semi-button.semi-button-primary.semi-button-size-large.w-full.!rounded-full[type="submit"]'
                );
                
                let found = false;
                for (let btn of continueButtons) {
                    const isDisabled = btn.getAttribute('aria-disabled') === 'true' || btn.disabled;
                    const hasContinueText = btn.textContent.trim() === "继续";
                    
                    if (hasContinueText && !isDisabled) {
                        found = true;
                        break;
                    }
                }
                resolve(found);
            });
        });
    }

    // 异步提取主域名
    async function getMainDomain() {
        return new Promise(resolve => {
            requestIdleCallback(() => {
                const currentDomain = window.location.hostname;
                const domainParts = currentDomain.split('.');
                const mainDomain = domainParts.length >= 2 
                    ? domainParts.slice(-2).join('.') 
                    : currentDomain;
                resolve(mainDomain);
            });
        });
    }

    // 异步检查是否存在注册按钮
    async function hasRegisterButton() {
        return new Promise(resolve => {
            requestIdleCallback(() => {
                const buttons = document.querySelectorAll(
                    'button.semi-button.semi-button-primary.semi-button-size-large.w-full.!rounded-full[type="submit"]'
                );
                
                let found = false;
                for (let btn of buttons) {
                    if (btn.textContent.trim() === "注册" && !btn.disabled) {
                        found = true;
                        break;
                    }
                }
                resolve(found);
            });
        });
    }

    // 主逻辑执行函数（异步）
    async function handlePageActions() {
        try {
            // 先检查是否存在继续按钮和注册按钮
            const [continueButtonExists, registerButtonExists] = await Promise.all([
                hasContinueButton(),
                hasRegisterButton()
            ]);
            
            // 如果两个按钮都不存在，不执行任何操作
            if (!continueButtonExists && !registerButtonExists) {
                console.log("未检测到继续按钮和注册按钮，不执行任何操作");
                return;
            }
            
            // 只有存在继续按钮时才执行后续操作
            if (continueButtonExists) {
                console.log("检测到目标'继续'按钮");
                
                const mainDomain = await getMainDomain();
                const currentDomain = window.location.hostname;
                console.log("主域名为：", mainDomain);

                if (registerButtonExists) {
                    console.log("检测到注册按钮，准备跳转至注册页面");
                    const registerUrl = `https://${mainDomain}/register?fromurl=https://${currentDomain}/login`;
                    // 延迟跳转，避免阻塞
                    setTimeout(() => {
                        window.location.href = registerUrl;
                    }, 0);
                } else {
                    console.log("未检测到注册按钮，准备请求check_newapi接口");
                    const apiUrl = `https://${mainDomain}/u/check_newapi`;
                    // 异步请求API
                    fetch(apiUrl)
                        .then(response => {
                            console.log("API请求响应状态：", response.status);
                        })
                        .catch(error => {
                            console.error("API请求失败：", error);
                        });
                }
            } else {
                // 存在注册按钮但不存在继续按钮的情况，也不执行操作
                console.log("仅检测到注册按钮，未检测到继续按钮，不执行操作");
            }
        } catch (error) {
            console.error("处理过程中发生错误：", error);
        }
    }

    // 使用requestIdleCallback在浏览器空闲时执行主逻辑
    requestIdleCallback(() => {
        handlePageActions();
    }, { timeout: 2000 }); // 最多延迟2秒执行，避免长时间不触发
})();
    