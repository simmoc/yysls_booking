# 燕云百业侠境预约系统

一个专为《燕云十六声》游戏设计的百业侠境预约管理系统，采用前后端分离架构，前端纯静态页面，后端使用 Vercel Serverless Functions + Neon PostgreSQL 数据库。

## 架构说明

```
raid-order/
├── admin/                  # 管理后台
│   ├── index.html          # 管理页面
│   ├── styles.css          # 管理页面独有样式
│   └── app.js              # 管理页面逻辑
├── user/                   # 用户端（预约页面）
│   ├── index.html          # 用户页面
│   ├── styles.css          # 用户页面独有样式
│   └── app.js              # 用户页面逻辑
├── shared/                 # 前端共享模块
│   ├── styles.css          # 共享样式
│   ├── api-client.js       # API 通信客户端
│   ├── fingerprint.js      # 浏览器指纹识别
│   └── utils.js            # 通用工具函数
├── api/                    # Vercel Serverless Functions（后端）
│   ├── register.js         # 用户注册/识别
│   ├── baiye.js            # 百业 CRUD
│   ├── time-slots.js       # 时间段 CRUD
│   ├── members.js          # 成员 CRUD
│   ├── bookings.js         # 预约 CRUD
│   └── init-db.js          # 数据库初始化
├── vercel.json             # Vercel 部署配置
├── .env.example            # 环境变量示例
└── README.md               # 项目文档
```

## 功能特性

### 用户端
- 角色管理：创建角色，记录木桩秒伤
- 预约功能：选择百业和时间段进行预约
- 预约列表：查看所有预约，支持按百业和时间筛选
- 分享链接：生成携带百业和时间参数的分享链接

### 管理后台
- 百业管理：创建和删除百业
- 时间段管理：设置可预约的时间段
- 成员管理：管理百业成员，支持按百业筛选
- 预约管理：查看和清空所有预约，支持筛选
- 数据库管理：一键初始化数据库表结构

## 环境变量配置

本项目需要一个 Neon PostgreSQL 数据库。请按以下步骤配置：

### 1. 创建 Neon 数据库

1. 访问 [Neon](https://neon.tech) 并注册账号
2. 创建一个新的项目（Project）
3. 在项目详情页找到连接字符串（Connection String）

### 2. 配置环境变量

在 Vercel 控制台中配置环境变量：

1. 进入项目 > Settings > Environment Variables
2. 添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | Neon PostgreSQL 连接字符串 | `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require` |

也可以在本地创建 `.env` 文件（参考 `.env.example`）。

## Vercel 部署步骤

### 方法一：通过 Git 部署（推荐）

1. **创建 Git 仓库**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **推送到 GitHub/GitLab**
```bash
# 在 GitHub 创建新仓库后
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

3. **在 Vercel 导入项目**
- 访问 [Vercel](https://vercel.com)
- 点击 "Add New Project"
- 导入你的 Git 仓库
- 框架预设选择 "Other"
- 在 Environment Variables 中添加 `DATABASE_URL`
- 点击 Deploy

### 方法二：通过 Vercel CLI 部署

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **登录并部署**
```bash
vercel login
vercel
```

3. **设置环境变量并部署到生产环境**
```bash
vercel env add DATABASE_URL
vercel --prod
```

## 首次使用

### 1. 初始化数据库

首次部署后，需要初始化数据库表结构：

1. 访问 `https://你的域名/admin`
2. 点击「数据库管理」卡片中的「初始化数据库」按钮
3. 等待初始化完成，状态显示「数据库已就绪」即表示成功

### 2. 设置管理员

默认所有用户注册后角色为 `user`（普通用户）。要将某个用户设为管理员，需要在 Neon 数据库控制台中手动修改：

1. 登录 [Neon 控制台](https://console.neon.tech)
2. 进入你的项目，点击 "SQL Editor"
3. 执行以下 SQL 命令：

```sql
-- 查看所有用户
SELECT * FROM users;

-- 将指定用户设为管理员（将 YOUR_FINGERPRINT_ID 替换为实际指纹 ID）
UPDATE users SET role = 'admin' WHERE fingerprint = 'YOUR_FINGERPRINT_ID';
```

> 提示：指纹 ID 可以在管理后台的用户信息栏中查看，格式类似 `abc123def456...`。

### 3. 开始使用

1. 管理员访问 `/admin` 创建百业和时间段
2. 添加成员并关联到对应百业
3. 普通用户访问 `/`（或 `/user`）进行预约
4. 管理员可在后台查看和管理所有预约

## 技术栈

- **前端**：纯 HTML/CSS/JavaScript（ES Modules），无框架依赖
- **后端**：Vercel Serverless Functions（Node.js）
- **数据库**：Neon PostgreSQL（Serverless Postgres）
- **用户识别**：FingerprintJS（浏览器指纹）
- **部署**：Vercel

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

MIT License
