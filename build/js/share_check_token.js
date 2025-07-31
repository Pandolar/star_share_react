// 获取cookie值
function getCookie(name) {
    const cookieArr = document.cookie.split("; ");
    for (let cookie of cookieArr) {
        if (cookie.startsWith(name + "=")) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}

// 设置cookie值
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

// 获取所有cookies并格式化为cookie请求头
function getAllCookies() {
    return document.cookie.split("; ").map(cookie => cookie.trim()).join("; ");
}

// 清除指定cookie
function clearCookies() {
    ["xuserid", "xtoken", "xy_uuid_token"].forEach(cookie => {
        document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
    });
}

// 跳转到登录页面
function redirectToLogin() {
    const fromUrl = "https://183ai.com/handle_callback";
    const domain = "share";
    
    fetch(`https://183ai.com/u/login?from_url=${encodeURIComponent(fromUrl)}&domain=${encodeURIComponent(domain)}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 20000) {
                window.location.href = data.data;
            } else {
                console.error("获取登录url失败", data.msg);
            }
        })
        .catch(error => console.error("请求失败", error));
}

// 检查登录状态并跳转
function checkCookiesAndRedirect() {
    const xUserId = getCookie("xuserid");
    const xToken = getCookie("xtoken");
    const xyUuidToken = getCookie("xy_uuid_token");

    // 如果缺少任意一个cookie，则直接跳转到登录页面
    if (!xUserId || !xToken || !xyUuidToken) {
        redirectToLogin();
        return;
    }

    // 如果xuserid和xtoken都存在且过去30分钟内没有检查过
    const lastCheckTime = getCookie("lastCheckTime");
    const currentTime = new Date().getTime();
    const timeElapsed = lastCheckTime ? currentTime - lastCheckTime : Infinity;

    // 如果已经过了30分钟，则进行请求验证
    if (!lastCheckTime || timeElapsed > 30 * 60 * 1000) {
        setCookie("lastCheckTime", currentTime, 1);

        // 请求获取用户信息
        fetch("http://183ai.com/u/get_user_info", {
            method: "GET",
            headers: {
                "xuserid": xUserId,
                "xtoken": xToken
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code !== 20000) {
                clearCookies();
                redirectToLogin();
            }
        })
        .catch(error => {
            console.error("请求失败", error);
            redirectToLogin();
        });
    }

    // 如果xyUuidToken存在且当前页面路径在指定的路径列表中，带着所有cookie请求 /client-api/info
    const validPaths = ['/login', '/home', '/servers'];

    if (xyUuidToken && validPaths.some(path => window.location.pathname.startsWith(path))) {
        const allCookies = getAllCookies();

        // 发起带所有cookie的请求
        fetch("https://share.183ai.com/client-api/info", {
            method: "GET",
            headers: {
                "cache-control": "max-age=0",
                "cookie": allCookies,
                "priority": "u=0, i"
            }
        })
        .then(response => response.json())
        .then(data => {
            if (!data.user || !data.user.username) {
                // 修改这里的跳转逻辑
                window.location.href = `https://share.183ai.com/client-api/login?code=${xyUuidToken}&redirect=true`;
            }
        })
        .catch(error => {
            console.error("请求失败", error);
            redirectToLogin();
        });
    }
}

// 执行检测
checkCookiesAndRedirect(); 