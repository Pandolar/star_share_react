# Star Share Web 项目文档

## 项目概述

Star Share Web 是一个整合了用户前台和管理后台的现代化 React 应用程序。项目基于 React 19 + TypeScript + Tailwind CSS + Ant Design 构建，提供了完整的 AI 模型服务平台展示和管理功能。

## 客服 AI 工作台（2026-10-22）

- 接管默认闲置4小时自动交还（“接管闲置多久自动交还”可改，0=不自动）：双方都没新消息才计时，敏感话题会话除外；交还后用户再来消息按当时开关分流。
- “处理策略”页按步骤分区并附白话说明：总开关（AI代答/自动学习/SLA）、回复策略与灰度分类、评分门槛、两类必转人工关键词（用户要人工的词与敏感话题词均可在此配置，包含即命中、不区分大小写）、通知与高级参数（静默合并、模型超时、每日调用上限等）。
- 交接原因与建议状态全部显示中文说明（如“模型服务暂时不可用，已转人工”）；关键词/分类输入支持中英文逗号与换行分隔，输入分隔符不再被吞掉。后台所有日期时间选择器统一按本地时间回显（修复保存后显示偏移8小时的问题），定时跟进会预填已设置的跟进时间。
- 用户界面只增加限时事故公告，不展示内部AI标签、置信度、知识引用或建议。支付卡片、附件、历史消息分页保持原接口。
- 本次简化版不新增数据库结构，已经安装AI中台的线上环境只需同步更新前后端及Dify知识提炼Workflow；首次安装仍按后端README执行增量SQL。AI代答、自动学习默认关闭，模型密钥仅保存在后端运行环境。
- 已完成历史QA导入、真实Dify检索与引用验证；浏览器验证接管、AI关闭时取消接管、来源证据。正式构建保存在 `build/`，发布使用现有GitHub与原子发布脚本。

## 可选支付方式配置（2026-10-18）

- 后台“系统配置 → 支付与开票 → PAYMENT_METHODS_CONFIG”提供带 Logo 的微信、支付宝开关；默认双开，可仅开任一方式或全部关闭。修改沿用现有配置确认、保存和权限控制，不需改支付密钥。
- 用户界面只展示已启用方式：微信可用时默认微信，仅支付宝时首次订单直接使用支付宝；全部关闭后不发起新支付，保留 CDK 和团队管理。配置在刷新或返回页面时更新，后端同时拒绝已停用方式的新请求。
- 支付弹窗去掉重复付款提醒和扫码方式提示行，保留按钮 Logo、二维码、剩余时间和跳转链接。已关闭方式的旧二维码/链接隐藏，但订单轮询及“我已完成支付”仍能核对在途到账。
- `.github/workflows/frontend-build.yml` 在 master 推送后检查类型并重建 build，验证提交产物一致并保存构建 artifact。生产仍执行 `sh deploy-star-share.sh` 从 GitHub 快进拉取并原子切换，不更改网关配置。

## 微信与支付宝选择（2026-10-14）

- 个人套餐、团队订阅及付费重置配额的支付区提供微信、支付宝小 Logo 和选择按钮，默认微信。二维码及跳转链接提示随所选方式更新。
- 两种方式在同一次结账内按需生成并复用，来回切换不会作废另一张二维码或重新开始计时。普通与开票候选分别复用；优惠码和返现抵扣产生新价格时继续沿用所选方式。切换期间隐藏旧二维码并禁用冲突操作，失败保留原可支付选项。
- 轮询及“我已完成支付”覆盖整个结账会话，可识别先前二维码付款；团队刷新后可恢复当前候选。任一候选支付成功只发放一次权益，实际重复付款沿用后端人工核退款流程。
- 前后端须同步升级，先执行后端 `sql/20261014_checkout_payment_methods_manual.sql`；易支付协议继续使用 V1，商户后台需启用支付宝。类型检查和生产构建通过，已实际操作桌面个人/团队支付与手机重置配额；网关边界使用本地模拟，未执行真实付款。

## 返利账户与客服工作台（2026-10-11）

- 用户中心“邀请好友”显示累计返利、可用/冻结/已使用金额；结束活动在“历史活动”折叠分页展示，当前没有活动也能查看已有返利。
- 邀请管理与系统配置均可设置个人套餐的返利抵扣开关和最低实付金额：默认10元，允许设为1元或0元全额抵扣。支付弹窗显示当前最低实付及本单抵扣额，最终金额以服务端报价为准。
- `/star-admin/customer-service` 使用屏幕剩余高度；提供用户备注、置顶、普通跟进/主管待处理分组、本站账号解封及当前限速清除。列表和会话内直接展示有效权益，客服消息下显示客户已读/未读；内部备注不发给用户。客户资料弹窗展示只读备注、当前个人/团队套餐及按页加载的已支付购买记录，并区分现金实付与返利抵扣。
- 前后端需同步升级，部署前先执行后端 `sql/20261011_customer_service_workspace_manual.sql`。客服专员及主管默认可解封和清除当前限速；这两个快捷操作不修改外部系统白名单。
- 2026-10-12：移除独立客服顶栏，通知和刷新并入列表筛选行；置顶、转交主管、解封、解除限速收进“更多会话操作”。备注点击图标编辑，不常驻占据聊天区；普通跟进不展示标签，主管待处理使用小旗标。点击“用户信息”查看套餐及历史订单，默认每页10笔。桌面1440×1000下消息区由约362px增加至651px，移动390×844下由约146px增加至495px。

## 项目特性

- 🚀 现代化技术栈：React 19 + TypeScript + Tailwind CSS
- 🎨 优雅的 UI 设计：采用 Ant Design 组件库
- 📱 完全响应式：支持桌面和移动设备
- 🔐 完整的权限管理：管理员登录和路由保护
- 🌐 参数化配置：支持环境变量配置
- 🎯 类型安全：完整的 TypeScript 类型定义
- 📊 丰富的管理功能：用户、套餐、CDK、系统配置管理

## 技术栈

### 前端技术
- **React 19** - 现代化 React 框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Ant Design** - 企业级 UI 组件库
- **Framer Motion** - 动画库
- **React Router** - 路由管理
- **Dayjs** - 轻量级日期处理库

### 工具链
- **React Scripts** - Create React App 工具链
- **PostCSS** - CSS 后处理器
- **ESLint** - 代码检查工具
- **Autoprefixer** - CSS 前缀自动添加

## 项目结构

```
star-share-web/
├── public/                 # 静态资源
│   ├── index.html         # HTML 模板
│   ├── favicon.ico        # 网站图标
│   └── manifest.json      # PWA 配置
├── src/
│   ├── components/        # 公共组件
│   │   ├── Header.tsx     # 页面头部
│   │   ├── Hero.tsx       # 轮播组件
│   │   ├── Footer.tsx     # 页面底部
│   │   ├── LatestModels.tsx # 最新模型展示
│   │   ├── HandleCallback.tsx # 回调处理
│   │   └── ProtectedRoute.tsx # 路由保护
│   ├── pages/             # 页面组件
│   │   ├── HomePage.tsx   # 首页
│   │   └── admin/         # 管理员页面
│   │       ├── AdminLogin.tsx       # 管理员登录
│   │       ├── AdminDashboard.tsx   # 管理员仪表盘
│   │       ├── AdminPackages.tsx    # 套餐管理
│   │       ├── AdminUsers.tsx       # 用户管理
│   │       ├── AdminUserPackages.tsx # 用户套餐
│   │       ├── AdminCDK.tsx         # CDK管理
│   │       └── AdminConfig.tsx      # 系统配置
│   ├── layouts/           # 布局组件
│   │   └── AdminLayout.tsx # 管理员布局
│   ├── services/          # API 服务
│   │   └── api.ts         # API 接口定义
│   ├── config/            # 配置文件
│   │   └── index.ts       # 应用配置
│   ├── App.tsx            # 应用入口
│   ├── App.css            # 应用样式
│   ├── index.tsx          # 根组件
│   └── index.css          # 全局样式
├── .env                   # 环境变量
├── .env.example          # 环境变量示例
├── package.json          # 项目依赖
├── tsconfig.json         # TypeScript 配置
├── tailwind.config.js    # Tailwind CSS 配置
├── postcss.config.js     # PostCSS 配置
└── README.md             # 项目文档
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装和启动

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd star-share-web
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm start
   ```
   应用将在 http://localhost:3000 启动

4. **构建生产版本**
   ```bash
   npm run build
   ```

### 应用配置

项目配置统一管理在 `src/config/index.ts` 文件中：

```typescript
const config = {
  // API 配置
  api: {
    baseURL: 'http://localhost:18188',    // 后端API地址
    adminPath: '/admin_api',              // 管理员API路径
    timeout: 10000,                       // API请求超时时间
  },
  
  // 业务配置
  business: {
    carouselInterval: 3000,               // 轮播间隔时间
    pageSize: 10,                         // 默认分页大小
    maxFileSize: 10,                      // 最大文件上传大小(MB)
  },
  
  // 外部链接配置
  links: {
    openPlatform: 'https://api.niceaigc.com/',      # 开放平台链接
    chatService: 'https://share.niceaigc.com/',     # 聊天服务链接
    plusService: 'https://goplus.niceaigc.com/',    # Plus服务链接
  },
};
```

所有配置都已参数化，可以根据需要在此文件中修改。

## 功能模块

### 1. 用户前台

- **首页展示**：产品介绍、轮播图、最新模型展示
- **响应式设计**：完美适配桌面和移动设备
- **动画效果**：使用 Framer Motion 提供流畅的动画体验

### 2. 管理后台

#### 登录认证
- 安全的管理员登录系统
- JWT Token 认证机制
- 自动登录状态检查

#### 仪表盘
- 系统概览数据统计
- 用户、套餐、CDK 数据展示
- 收入统计图表
- 系统状态监控

#### 套餐管理
- 套餐的增删改查
- 套餐分类管理
- 价格和时长设置
- 优先级和状态管理

#### 用户管理
- 用户信息管理
- 用户等级设置
- 用户状态控制
- 批量操作支持

#### 用户套餐
- 用户套餐购买记录
- 套餐使用状态追踪
- 过期提醒功能
- 高级搜索和筛选

#### CDK管理
- CDK码生成和管理
- 套餐关联设置
- 使用状态追踪
- 过期时间管理

#### 系统配置
- 网站基础设置
- 系统参数配置
- 邮件服务配置
- 支付功能设置

## API 接口

### 认证相关
- `POST /admin_api/star/login` - 管理员登录
- `GET /admin_api/star/validate` - 验证Token
- `POST /admin_api/star/logout` - 退出登录

### 套餐管理
- `GET /admin_api/star/package` - 获取套餐列表
- `POST /admin_api/star/package` - 创建套餐
- `PUT /admin_api/star/package` - 更新套餐
- `DELETE /admin_api/star/package` - 删除套餐

### 用户管理
- `GET /admin_api/star/user` - 获取用户列表
- `POST /admin_api/star/user` - 创建用户
- `PUT /admin_api/star/user` - 更新用户
- `DELETE /admin_api/star/user` - 删除用户

### 用户套餐
- `GET /admin_api/star/user_packages` - 获取用户套餐列表

### CDK管理
- `GET /admin_api/star/cdk` - 获取CDK列表
- `POST /admin_api/star/cdk` - 创建CDK
- `PUT /admin_api/star/cdk` - 更新CDK
- `DELETE /admin_api/star/cdk` - 删除CDK

### 系统配置
- `GET /admin_api/star/config` - 获取配置列表
- `PUT /admin_api/star/config` - 更新配置

## 开发指南

### 代码规范

1. **TypeScript 类型定义**
   ```typescript
   // 定义接口类型
   interface User {
     id: number;
     username: string;
     email?: string;
     status: number;
   }
   
   // 使用泛型
   interface ApiResponse<T = any> {
     code: number;
     msg: string;
     data: T;
     total?: number;
   }
   ```

2. **组件开发规范**
   ```typescript
   // 使用 React.FC 类型
   interface Props {
     title: string;
     children: React.ReactNode;
   }
   
   const MyComponent: React.FC<Props> = ({ title, children }) => {
     return (
       <div>
         <h1>{title}</h1>
         {children}
       </div>
     );
   };
   ```

3. **样式规范**
   ```typescript
   // 优先使用 Tailwind CSS 类
   <div className="flex items-center justify-between mb-6">
     <h1 className="text-2xl font-bold">标题</h1>
   </div>
   
   // 对于复杂样式，使用 CSS 模块或 styled-components
   ```

### 状态管理

项目使用 React 内置的状态管理：
- `useState` - 组件内部状态
- `useEffect` - 副作用处理
- `useReducer` - 复杂状态管理
- `useContext` - 全局状态共享

### 路由配置

```typescript
// 主路由配置
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="packages" element={<AdminPackages />} />
                {/* 其他管理页面路由 */}
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};
```

## 部署指南

### 开发环境部署

1. **启动开发服务器**
   ```bash
   npm start
   ```

2. **访问应用**
   - 前台首页：http://localhost:3000
   - 管理后台：http://localhost:3000/admin

### 生产环境部署

1. **构建生产版本**
   ```bash
   npm run build
   ```

2. **使用 Nginx 部署**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/build;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /admin_api {
           proxy_pass http://localhost:18188;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **使用 PM2 管理 Node.js 进程**
   ```bash
   npm install -g pm2
   pm2 serve build 3000 --spa
   ```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:16-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 常见问题

### 1. 如何修改 API 地址？

编辑 `src/config/index.ts` 文件中的 API 配置：
```typescript
api: {
  baseURL: 'http://your-api-server.com',
  adminPath: '/admin_api',
  timeout: 10000,
},
```

### 2. 如何添加新的管理页面？

1. 在 `src/pages/admin/` 目录创建新页面组件
2. 在 `src/layouts/AdminLayout.tsx` 中添加菜单项
3. 在 `src/App.tsx` 中添加路由配置

### 3. 如何自定义主题样式？

1. 修改 `tailwind.config.js` 文件中的主题配置
2. 在 `src/index.css` 中覆盖 Ant Design 的默认样式

### 4. 如何自定义外部链接？

编辑 `src/config/index.ts` 文件中的 links 配置：
```typescript
links: {
  openPlatform: 'https://your-api-platform.com/',
  chatService: 'https://your-chat-service.com/',
  plusService: 'https://your-plus-service.com/',
},
```

## 代理站点经营

站点配置由后端 `/u/get_site_mode` 返回，品牌、销售方式和功能许可分别处理。白牌在线站可以正常显示价格、购买和订单；纯 CDK 站只显示套餐介绍和兑换，不显示零元售价。

管理员入口：`/star-admin/sites`，按“创建站点 → 绑定代理及已配置域名 → 选择预设 → 授权套餐 → 设置价格边界和编辑权限 → 发布”操作。站点详情提供公告 Markdown 预览、功能许可/本站选择、批量上下架、继承或自定义价格、变更摘要和审计记录。版本冲突时重新加载后再保存，不静默覆盖。

代理入口：`/distributor/sites`。代理只可修改管理员授予的配置；销售方式、域名、归属、佣金比例和价格边界只读。“月度对账与全部销售”包含本人历史归属订单，即使站点后来转移也不改账。

财务入口：`/star-admin/commissions`。按北京时间月份或自定义日期查看期初/期末累计净佣金、本期计提、退款冲减、本期净佣金、销售额和订单数；可复制群聊对账摘要、导出完整筛选明细。系统不创建结算批次，不登记打款或提现，线下付款不清零累计值。退款登记不会调用支付渠道退款。

代理站不加载测速页面，也不请求全局节点列表；旧测速链接降级到本站会员中心。登录默认返回本站会员中心，外部 `fromurl` 不再带凭据跳转。聊天使用入口仍保留，同一用户可以跨站使用。

报价变化时，支付弹窗显示旧报价与新订单金额，在用户再次确认前不显示二维码。有效结账金额和代理归属由服务端快照维护。

用户 API 始终使用本站相对 `/u/*` 地址；本地开发代理保留 Host。不要使用跨域 API 地址承载代理站计价。部署仍使用现有静态发布方式，本功能不修改网关、DNS、共享资源域或父域 Cookie 策略，不承诺阻止主动查找关联站点。

经营配置收进现有 `star_config`，审计复用通用日志，仅新增一张佣金流水表。从GitHub上一版更新时：备份并停旧服务，手动执行完整 `../star/sql/20261009_distributor_sites_manual.sql`，再更新并启动配套后端和前端。后端启动检查结构标记并自动一次性转换旧代理域名/公告；重复启动跳过。无需另跑Python迁移命令，详见 `../star/README.md`。

聊天注入源为 `../nsjs/src/nsjs-claude.js`。构建二等混淆产物后同步到 `public/js/ns_nextc.js`，代理站会按功能配置隐藏邀请、客服及跨产品入口，公告不回退主站内容。

## 更新日志

### 2026-10-13 管理员登录72小时

- 后台登录和MFA登录按服务端返回的 `expires_at` 写入持久Cookie，替代固定7天；服务端默认会话窗口为72小时，浏览器期限与实际会话一致。
- 浏览器验证真实登录与清除localStorage后的Cookie恢复。旧会话不会自动延长，升级后重新登录使用新期限；配套后端同时修复个人套餐最高剩余等级优先和缓存一致性。


### 2026-10-09 精简配置与月度电表对账

- 站点、域名、公告、权限和套餐经营配置统一存入 Config，每站一条JSON，域名独立唯一索引记录。
- 删除结算批次及打款流程；累计净佣金按实际入账流水计算，本期净额等于期末减期初。
- 增加北京时间月份筛选、负数月份支持、完整明细导出和群聊摘要；跨月退款不改写旧月。
- 上线采用“手动SQL准备结构＋本版本启动自动一次性迁移数据”，无未发布中间版本的升级分支；下版确认全部完成后移除临时迁移模块。


### 2026-10-09 代理站点经营体系

- 增加管理员站点、套餐价格及佣金结算工作台，代理经营页与既有 CDK 采购页分离。
- 白牌、在线/CDK 渠道、公告和功能权限解耦；价格及上架权限服务端控制。
- 订单冻结站点、代理、报价、佣金及奖励规则；结算与退款有独立不可变流水。
- 代理站测速降级、本站登录回跳和变价二次确认；保留共享账号权益。


### v1.0.1 (2024-01-18)
- 🎨 优化轮播图设计：简约白色背景，美化导航按钮和指示器
- 🚀 重构导航栏：更简约优雅的按钮样式
- 📱 简化特点卡片：移除操作按钮，更清洁的设计
- 🔧 移除环境变量依赖：所有配置集中管理在 config 文件中
- 🗑️ 清理无用代码：移除 HandleCallback 回调逻辑
- ✅ 代码质量优化：完整的 TypeScript 类型检查和构建验证

### v1.0.0 (2024-01-18)
- 完成项目整合，将 home 和 admin 两个独立项目合并
- 实现完整的管理后台功能
- 添加用户认证和权限控制
- 优化移动端适配
- 添加参数化配置支持

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 技术支持

如果你在使用过程中遇到问题，请通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件至：support@example.com
- 加入技术交流群：123456789

---

**注意**: 这是一个整合项目，保持了原 home 项目的前台样式和用户体验，同时将 admin 项目的管理功能完整集成到统一的应用中。所有的 API 接口都已配置为使用 18188 端口的后端服务。