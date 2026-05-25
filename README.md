# 燕云百业侠境预约系统

一个专为《燕云十六声》游戏设计的百业侠境预约管理系统，支持角色管理、百业预约、时间段管理和成员管理等功能。

## 功能特性

### 用户界面
- 🎭 **角色管理**：创建角色，记录木桩秒伤，本地存储无需登录
- 📅 **预约功能**：选择百业和时间段进行预约
- 📋 **预约列表**：查看所有预约，支持按百业和时间筛选
- 🔗 **分享链接**：生成携带百业和时间参数的分享链接，成员一键参与

### 管理后台
- 🏢 **百业管理**：创建和管理百业
- ⏰ **时间段管理**：设置可预约的时间段
- 👥 **成员管理**：管理百业成员
- 📊 **预约管理**：查看和清空所有预约

## 技术栈

- 纯前端实现，无需后端服务器
- 使用 LocalStorage 本地存储数据
- 响应式设计，支持移动端和桌面端
- 支持通过 URL 参数分享预约信息

## 部署到 Vercel

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

3. **生产环境部署**
```bash
vercel --prod
```

## 使用说明

### 首次使用
1. 打开应用后，先在左侧创建角色
2. 填写角色名称和木桩秒伤（可选）
3. 选择角色后即可进行预约

### 分享预约
1. 在管理后台点击预约项的分享按钮
2. 复制生成的链接
3. 成员打开链接后创建角色即可自动填充百业和时间

### 数据说明
- 所有数据存储在浏览器本地
- 清除浏览器数据会导致数据丢失
- 不同浏览器/设备之间数据不互通

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

MIT License
