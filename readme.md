# 🚀 N8N-Like Workflow Automation Platform - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [API Documentation](#api-documentation)
6. [Architecture Overview](#architecture-overview)
7. [Workflow Execution Flow](#workflow-execution-flow)

---

## ✅ Prerequisites

Install the following on your system:

- **Node.js** (v18+ recommended)
- **MongoDB** (v6+ recommended)
- **Redis** (v6+ for job queues)
- **npm** or **yarn**

---

## 🔧 Backend Setup

### 1. Clone/Create Project Structure

```bash
mkdir workflow-automation-platform
cd workflow-automation-platform
mkdir -p backend/src/{config,modules/{auth,users,workflows,nodes,executions,credentials},common,database}
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

Copy all the files I provided above, then create your `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/workflow_automation
JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGIN=http://localhost:5173
ENCRYPTION_KEY=your-encryption-key-for-credentials
```

---

## 🗄️ Database Setup

### 1. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install locally and start
mongod
```

### 2. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Or install locally and start
redis-server
```

### 3. Verify Connections

```bash
# Test MongoDB
mongosh mongodb://localhost:27017

# Test Redis
redis-cli ping
```

---

## 🏃 Running the Application

### 1. Development Mode

```bash
cd backend
npm run dev
```

### 2. Production Mode

```bash
npm start
```

### 3. Expected Output

```
🚀 Backend server running on http://localhost:3000
📚 API available at http://localhost:3000/api
🔧 Environment: development
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer YOUR_TOKEN
```

---

### Workflow Endpoints

#### Create Workflow
```http
POST /api/workflows
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "My First Workflow",
  "description": "A simple workflow",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "position": { "x": 100, "y": 100 },
      "data": {}
    },
    {
      "id": "node-2",
      "type": "httpRequest",
      "position": { "x": 300, "y": 100 },
      "data": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    }
  ],
  "connections": [
    {
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

#### Get All Workflows
```http
GET /api/workflows
Authorization: Bearer YOUR_TOKEN
```

#### Get Single Workflow
```http
GET /api/workflows/:id
Authorization: Bearer YOUR_TOKEN
```

#### Update Workflow
```http
PUT /api/workflows/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Workflow Name",
  "nodes": [...],
  "connections": [...]
}
```

#### Execute Workflow
```http
POST /api/workflows/:id/execute
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "mode": "manual"
}
```

#### Activate/Deactivate Workflow
```http
PATCH /api/workflows/:id/activate
Authorization: Bearer YOUR_TOKEN

PATCH /api/workflows/:id/deactivate
Authorization: Bearer YOUR_TOKEN
```

#### Duplicate Workflow
```http
POST /api/workflows/:id/duplicate
Authorization: Bearer YOUR_TOKEN
```

#### Delete Workflow
```http
DELETE /api/workflows/:id
Authorization: Bearer YOUR_TOKEN
```

---

### Execution Endpoints

#### Get All Executions
```http
GET /api/executions
Authorization: Bearer YOUR_TOKEN
```

#### Get Executions for Workflow
```http
GET /api/executions/workflow/:workflowId
Authorization: Bearer YOUR_TOKEN
```

#### Get Single Execution
```http
GET /api/executions/:id
Authorization: Bearer YOUR_TOKEN
```

#### Get Execution Stats
```http
GET /api/executions/stats
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": 45,
  "error": 3,
  "running": 2,
  "canceled": 1
}
```

#### Stop Execution
```http
POST /api/executions/:id/stop
Authorization: Bearer YOUR_TOKEN
```

---

### Node Template Endpoints

#### Get All Node Templates
```http
GET /api/nodes
```

**Response:**
```json
[
  {
    "id": "trigger",
    "name": "Manual Trigger",
    "type": "trigger",
    "category": "trigger",
    "description": "Manually trigger the workflow",
    "icon": "▶️",
    "color": "#4CAF50",
    "inputs": 0,
    "outputs": 1,
    "properties": []
  },
  ...
]
```

#### Get Nodes by Category
```http
GET /api/nodes/categories
```

#### Get Node by ID
```http
GET /api/nodes/:id
```

---

### Credentials Endpoints

#### Create Credential
```http
POST /api/credentials
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "My API Key",
  "type": "apiKey",
  "data": {
    "apiKey": "sk-1234567890abcdef",
    "apiSecret": "secret123"
  }
}
```

#### Get All Credentials
```http
GET /api/credentials
Authorization: Bearer YOUR_TOKEN
```

#### Get Single Credential
```http
GET /api/credentials/:id
Authorization: Bearer YOUR_TOKEN
```

#### Update Credential
```http
PUT /api/credentials/:id
Authorization: Bearer YOUR_TOKEN
```

#### Delete Credential
```http
DELETE /api/credentials/:id
Authorization: Bearer YOUR_TOKEN
```

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
│              (React.js + Shadcn UI)                      │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST API
                   │
┌──────────────────▼──────────────────────────────────────┐
│                   API GATEWAY                            │
│              (NestJS Controllers)                        │
├──────────────────────────────────────────────────────────┤
│                  AUTH MIDDLEWARE                         │
│                   (JWT Strategy)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┬──────────┐
        │                     │              │          │
┌───────▼────────┐  ┌─────────▼────┐  ┌─────▼─────┐  ┌─▼────────┐
│   Workflows    │  │ Executions   │  │   Nodes   │  │  Creds   │
│    Module      │  │   Module     │  │  Module   │  │  Module  │
└───────┬────────┘  └──────┬───────┘  └───────────┘  └──────────┘
        │                  │
        │         ┌────────▼────────┐
        │         │ Workflow        │
        │         │ Executor        │
        │         │ Engine          │
        │         └────────┬────────┘
        │                  │
┌───────▼──────────────────▼────────────────────────────┐
│              BULL QUEUE (Redis)                       │
│           Job Processing & Scheduling                 │
└───────┬───────────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────────────────────┐
│                   MongoDB                              │
│      (Users, Workflows, Executions, Credentials)       │
└────────────────────────────────────────────────────────┘
```

### Module Breakdown

#### 1. **Auth Module**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Protected routes with guards

#### 2. **Users Module**
- User CRUD operations
- Profile management
- Role-based access

#### 3. **Workflows Module**
- Workflow CRUD operations
- Workflow activation/deactivation
- Workflow duplication
- Canvas data storage (nodes + connections)

#### 4. **Nodes Module**
- Pre-defined node templates
- Node categories (trigger, action, transform, logic, etc.)
- Node property definitions
- 11 built-in node types

#### 5. **Executions Module**
- Workflow execution tracking
- Execution history
- Real-time status updates
- Error handling and logging

#### 6. **Workflow Executor**
- Graph traversal engine
- Node-by-node execution
- Data passing between nodes
- Error recovery

#### 7. **Credentials Module**
- Secure credential storage
- Encryption/decryption
- Credential types (API keys, OAuth, DB connections)

---

## 🔄 Workflow Execution Flow

### Step-by-Step Execution

```
1. User triggers workflow
   └─> POST /api/workflows/:id/execute

2. Create execution record
   └─> Status: "running"
   └─> Store in MongoDB

3. Add job to Bull queue
   └─> Job data: { executionId, workflowId, userId }

4. Workflow Executor picks up job
   └─> Load workflow from MongoDB
   └─> Initialize execution context

5. Find start node
   └─> Node with no incoming connections
   └─> Usually a "trigger" node

6. Execute nodes in order
   ├─> Execute current node
   ├─> Store node output
   ├─> Find connected nodes
   └─> Recursively execute next nodes

7. Handle node types
   ├─> trigger: Start execution
   ├─> httpRequest: Make HTTP call
   ├─> code: Execute JavaScript
   ├─> set: Transform data
   ├─> if: Conditional branching
   ├─> merge: Combine data
   └─> filter: Filter data

8. Complete execution
   ├─> Update status: "success" or "error"
   ├─> Store execution results
   └─> Record execution time

9. Return results to user
   └─> Execution summary + node outputs
```

### Example Execution

**Workflow:**
```
[Trigger] → [HTTP Request] → [Code] → [Set]
```

**Execution Steps:**
1. **Trigger Node**: Starts with `{ triggered: true }`
2. **HTTP Request Node**: Fetches data from API
3. **Code Node**: Transforms API response
4. **Set Node**: Adds additional fields

**Result:**
```json
{
  "executionId": "exe_123",
  "status": "success",
  "data": {
    "node-1": { "triggered": true },
    "node-2": { "data": {...}, "statusCode": 200 },
    "node-3": { "transformed": true },
    "node-4": { "finalData": {...} }
  }
}
```

---

## 🎯 Key Features Implemented

### ✅ Backend Complete Features

1. **User Authentication**
   - JWT-based authentication
   - Secure password hashing
   - Protected API routes

2. **Workflow Management**
   - Create, read, update, delete workflows
   - Visual workflow builder data storage
   - Workflow activation/deactivation
   - Workflow duplication

3. **Node System**
   - 11 pre-built node types
   - Extensible node architecture
   - Node categories and properties
   - Custom JavaScript code execution

4. **Execution Engine**
   - Asynchronous workflow execution
   - Queue-based job processing
   - Real-time execution tracking
   - Error handling and recovery

5. **Credentials Management**
   - Encrypted credential storage
   - Multiple credential types
   - Secure access control

6. **Data Flow**
   - Node-to-node data passing
   - Conditional branching
   - Data transformation
   - Parallel execution support

---

## 🐛 Testing the Backend

### 1. Test Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 2. Test Workflow Creation

```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "nodes": [
      {"id":"n1","type":"trigger","position":{"x":0,"y":0},"data":{}},
      {"id":"n2","type":"httpRequest","position":{"x":200,"y":0},"data":{"url":"https://jsonplaceholder.typicode.com/posts/1","method":"GET"}}
    ],
    "connections": [{"source":"n1","target":"n2"}]
  }'
```

### 3. Test Workflow Execution

```bash
WORKFLOW_ID="your-workflow-id"

curl -X POST http://localhost:3000/api/workflows/$WORKFLOW_ID/execute \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📦 Next Steps

### ✅ Backend is COMPLETE! Now we can move to:

1. **Frontend Development**
   - React.js setup
   - Workflow canvas (drag & drop)
   - Node palette
   - Connection drawing
   - Execution monitoring

2. **Additional Features**
   - Webhook support
   - Scheduled workflows (cron)
   - Workflow templates
   - Advanced node types
   - Real-time execution updates (WebSockets)

---

## 💡 Pro Tips

1. **Use Postman/Insomnia** - Import API endpoints for easier testing
2. **MongoDB Compass** - Visual database management
3. **Redis Commander** - Monitor job queue
4. **Enable Logging** - Add winston logger for debugging
5. **Error Tracking** - Integrate Sentry for production

---

## 🎉 Congratulations!

You now have a **fully functional N8N-like workflow automation backend**! 

The backend includes:
- ✅ Complete authentication system
- ✅ Workflow CRUD operations
- ✅ Node template system
- ✅ Workflow execution engine
- ✅ Credentials management
- ✅ Job queue processing
- ✅ Error handling
- ✅ Database integration

**Ready to build the frontend?** Let me know and I'll create the complete React.js frontend with the visual workflow builder! 🚀