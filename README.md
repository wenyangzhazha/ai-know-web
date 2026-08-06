# AI 知识库

前后端分离的 AI 知识库管理系统。前端负责知识库管理、文档上传与 RAG 对话；后端负责文档解析、向量化、检索与生成回答。

## 目录结构

```text
.
├── backend/   # Spring Boot + LangChain4j 后端
└── frontend/  # Vite + React + TypeScript 前端
```

## 启动后端

需要 PostgreSQL 并启用 pgvector 扩展，连接配置在 `backend/src/main/resources/application.yml`。

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

后端默认监听 `http://localhost:8080`。

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认监听 `http://localhost:5173`，开发服务器会把 `/api` 代理到 `http://localhost:8080`。

## 构建

```bash
cd frontend
npm run build
```
