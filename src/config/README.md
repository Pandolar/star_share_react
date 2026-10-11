# 前端配置说明

## 站点经营配置

代理域名、品牌、在线/CDK 渠道、公告、功能和套餐价格通过管理后台 `/star-admin/sites` 维护。客户端读取同源 `/u/get_site_mode` 和 `/u/package`；不能通过编辑前端常量决定真实售价或代理权限。

用户请求使用本站相对 `/u/*` 路径，登录和回调使用本站路径。后端从请求 Host 识别站点，不信任 X-Site-Domain、Origin 或 Referer 作为记账归属。本地开发代理保留 Host。

## domains.ts

仅保留 `mainDomain` 和 `cookieDomain`，供现有自营外链和父域 Cookie 策略使用。本次不改变共享账号机制；父域 Cookie 不是代理权限边界。

旧 `redirectTargets`、跨域登录 API、Casdoor 回调辅助地址已删除，不再有前端根域跳转认证流程。

## index.ts

维护管理员 API、应用信息、存储键、业务界面参数和自营外链：

- `api`：管理员请求基址、路径和超时。
- `storage`：管理员 token 与用户信息的存储键。
- `app`：应用信息。
- `business`：轮播、分页等界面参数。
- `links`：自营产品外链，不用于代理站经营入口。

管理员请求可使用 `REACT_APP_API_BASE_URL`；代理用户 API 不受该跨域基址影响。

代理站点上线前，先执行配套后端迁移；配置优先级、计价和佣金说明见 `../../README.md` 与 `../../../star/README.md`。
