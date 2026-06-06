# 慈善基金会内部管理后台系统

## 项目简介

一个完整的慈善基金会内部管理系统，实现善款从募集到使用的全链路管理，确保每一分钱的来龙去脉都清晰可追溯。

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design 5 + Vite
- **后端**: Node.js + Express + MySQL
- **部署**: Docker + Docker Compose

## 核心功能

### 1. 用户角色与权限
- **基金管理员 (admin)**: 全局权限，可管理所有模块
- **项目负责人 (project_manager)**: 只能查看和管理自己负责的项目
- **财务专员 (finance)**: 管理资金流水、财务复核，不能修改项目设置

### 2. 善款募集管理
- 记录每笔捐赠：捐赠人（个人/企业）、金额、日期、指定用途
- 定向捐赠：只能用于指定项目，专款专用
- 非定向捐赠：进入基金会总池统一调配
- 到账状态管理：待到账 / 已到账 / 已退款

### 3. 项目管理
- 多项目运营：助学、大病救助、养老、灾后重建等
- 项目预算：总预算、已拨付、已使用、余额实时统计
- 拨付申请：项目负责人发起，财务复核 → 管理员批准
- 支出登记：每笔支出记录受助人、金额、凭证、用途

### 4. 资金池管理
- **总池**: 接收非定向捐赠
- **项目专项池**: 接收该项目的定向捐赠
- 余额实时更新，事务安全，杜绝超支

### 5. 资金追溯与审计
- **正向追溯**: 给定一笔捐赠，查看流向（捐赠→拨付→支出→受助人）
- **反向追溯**: 给定一个受助人，反查资助资金来源
- 完整的资金流水日志，不可篡改
- 项目财务报告导出（Excel）

## 快速启动

### Docker 一键启动

```bash
# 在项目根目录执行
docker-compose up -d

# 查看日志
docker-compose logs -f
```

启动后访问：
- 前端: http://localhost:8080
- 后端API: http://localhost:3001

### 本地开发

#### 启动 MySQL
```bash
docker run -d --name charity-mysql \
  -e MYSQL_ROOT_PASSWORD=root123456 \
  -e MYSQL_DATABASE=charity_foundation \
  -p 3306:3306 \
  mysql:8.0 --default-authentication-plugin=mysql_native_password
```

#### 启动后端
```bash
cd backend
npm install
npm run init-db    # 初始化数据库表
npm run seed       # 填充种子数据
npm run dev        # 启动开发服务器
```

#### 启动前端
```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:3000

## 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | 123456 | 全局权限 |
| 财务专员 | zhangcw | 123456 | 资金管理、财务复核 |
| 项目负责人 | lixue | 123456 | 负责"山区助学计划"和"社区养老服务" |
| 项目负责人 | wangdb | 123456 | 负责"大病儿童救助" |

## 系统特性

### 数据安全
- 所有资金变动在数据库事务中执行
- 余额检查使用 `SELECT ... FOR UPDATE` 行锁
- 定向捐赠资金硬约束，不能跨项目挪用
- 完整的操作日志和资金流水记录

### 权限控制
- JWT Token 认证
- 基于角色的访问控制 (RBAC)
- 项目负责人只能访问自己的项目数据

### 可审计性
- 每笔资金变动都有完整流水记录
- 支持双向追溯（捐赠→受助人 / 受助人→捐赠）
- 项目财务报告一键导出 Excel

## 目录结构

```
t10/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── app.js          # 入口文件
│   │   ├── database/       # 数据库连接和初始化
│   │   ├── routes/         # API 路由
│   │   ├── middlewares/    # 中间件
│   │   ├── utils/          # 工具函数
│   │   └── seeders/        # 种子数据
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 公共组件
│   │   ├── layouts/        # 布局组件
│   │   ├── services/       # API 服务
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml      # Docker 编排
└── README.md
```
