# Complete Workflow Automation Platform Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Node Reference Guide](#node-reference-guide)
4. [Data Flow & Expressions](#data-flow--expressions)
5. [Webhook & Scheduling](#webhook--scheduling)
6. [Best Practices](#best-practices)

---

## Overview

This is a visual workflow automation platform that allows you to build complex automation workflows by connecting different nodes together. Each node performs a specific action, and data flows from one node to the next through connections.

### Key Concepts

- **Nodes**: Individual units that perform specific tasks (API calls, data transformation, AI processing, etc.)
- **Connections**: Links between nodes that define how data flows
- **Expressions**: Dynamic references to data from previous nodes using `{{$node.xxx.data}}` syntax
- **Execution**: Running your workflow processes nodes in sequence based on connections

---

## Getting Started

### Creating Your First Workflow

1. **Add Trigger Node**: Start with a trigger node (Manual Trigger, Webhook, or Schedule)
2. **Add Processing Nodes**: Add nodes to process data (HTTP Request, AI Chat, Transform, etc.)
3. **Connect Nodes**: Click and drag from the green output handle to the blue input handle
4. **Configure Each Node**: Double-click nodes or use the properties panel to configure
5. **Test Your Workflow**: Click "Run" to execute and see results

### Understanding Node Configuration

Each node has:
- **Required Fields** (marked with *): Must be filled before execution
- **Optional Fields**: Enhance functionality but not required
- **Expression Support**: Most text fields support `{{expressions}}` to reference previous data

---

## Node Reference Guide

### 🎯 TRIGGER NODES

Trigger nodes start your workflow execution. Every workflow needs at least one trigger node.

#### ▶️ Manual Trigger
**Purpose**: Start workflow manually by clicking "Run"

**Configuration**:
- `triggerType`: Select "manual" or "scheduled"

**Use Case**: Testing workflows or running on-demand automations

**Output Example**:
```json
{
  "triggered": true,
  "timestamp": "2025-01-06T10:30:00Z",
  "triggerType": "manual"
}
```

---

#### 🪝 Webhook Trigger
**Purpose**: Start workflow when an external HTTP request is received

**Configuration**:
- `path`* (required): URL path like `/webhook/new-order`
- `method`: GET, POST, PUT, DELETE (default: POST)
- `authentication`: none, headerAuth, queryAuth

**How It Works**:
⚠️ **IMPORTANT**: Currently, webhook nodes are **configured but not actively listening**. To implement:

**Backend Implementation Needed**:
```typescript
// In your NestJS controller, add:
@Post('webhook/:workflowId/:path(*)')
async handleWebhook(
  @Param('workflowId') workflowId: string,
  @Param('path') path: string,
  @Body() body: any,
  @Headers() headers: any
) {
  // Find workflow with matching webhook path
  const workflow = await this.workflowService.findByWebhookPath(path);
  
  if (!workflow) {
    throw new NotFoundException('Webhook not found');
  }
  
  // Create execution with webhook data
  const execution = await this.executionService.create({
    workflowId: workflow._id,
    mode: 'webhook',
    data: { body, headers, path }
  });
  
  // Execute workflow in background
  await this.workflowExecutor.execute(
    workflow._id,
    execution._id,
    { body, headers, path }
  );
  
  return { success: true, executionId: execution._id };
}
```

**Usage Example**:
```bash
# Send data to trigger workflow
curl -X POST https://your-domain.com/api/webhook/workflow-id/new-order \
  -H "Content-Type: application/json" \
  -d '{"orderId": "12345", "customer": "John Doe"}'
```

**Output Example**:
```json
{
  "path": "/webhook/new-order",
  "method": "POST",
  "body": {
    "orderId": "12345",
    "customer": "John Doe"
  },
  "timestamp": "2025-01-06T10:30:00Z"
}
```

---

#### ⏰ Schedule Trigger
**Purpose**: Run workflow automatically on a schedule

**Configuration**:
- `enabled`*: Turn schedule on/off
- `scheduleType`: "interval" or "cron"
- `interval`: Number (e.g., 5)
- `unit`: seconds, minutes, hours, days
- `cronExpression`: For advanced scheduling (e.g., `0 */5 * * * *`)
- `timezone`: Timezone for scheduling (default: UTC)

**How It Works**:
⚠️ **IMPORTANT**: Currently, schedule nodes are **configured but not actively running**. To implement:

**Backend Implementation Needed**:

1. **Install node-cron**:
```bash
npm install node-cron @types/node-cron
```

2. **Create Scheduler Service**:
```typescript
// scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as cron from 'node-cron';
import { Workflow, WorkflowDocument } from './workflow.schema';
import { ExecutionService } from '../execution/execution.service';
import { WorkflowExecutor } from '../execution/workflow-executor.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private scheduledTasks = new Map<string, cron.ScheduledTask>();

  constructor(
    @InjectModel(Workflow.name)
    private workflowModel: Model<WorkflowDocument>,
    private executionService: ExecutionService,
    private workflowExecutor: WorkflowExecutor,
  ) {}

  async onModuleInit() {
    // Load all workflows with schedule triggers on startup
    await this.loadScheduledWorkflows();
  }

  async loadScheduledWorkflows() {
    const workflows = await this.workflowModel.find({}).exec();
    
    for (const workflow of workflows) {
      const scheduleNode = workflow.nodes.find(
        (node) => node.type === 'schedule' && node.data.config?.enabled
      );
      
      if (scheduleNode) {
        await this.scheduleWorkflow(workflow._id.toString(), scheduleNode.data.config);
      }
    }
  }

  async scheduleWorkflow(workflowId: string, config: any) {
    // Remove existing schedule if any
    this.unscheduleWorkflow(workflowId);
    
    const { scheduleType, interval, unit, cronExpression, timezone } = config;
    
    let cronPattern: string;
    
    if (scheduleType === 'interval') {
      // Convert interval to cron pattern
      cronPattern = this.intervalToCron(interval, unit);
    } else {
      cronPattern = cronExpression;
    }
    
    this.logger.log(`Scheduling workflow ${workflowId} with pattern: ${cronPattern}`);
    
    const task = cron.schedule(
      cronPattern,
      async () => {
        this.logger.log(`Executing scheduled workflow: ${workflowId}`);
        try {
          const execution = await this.executionService.create({
            workflowId,
            mode: 'schedule',
            data: {}
          });
          
          await this.workflowExecutor.execute(
            workflowId,
            execution._id.toString(),
            { scheduledAt: new Date() }
          );
        } catch (error) {
          this.logger.error(`Failed to execute scheduled workflow: ${error.message}`);
        }
      },
      {
        timezone: timezone || 'UTC',
      }
    );
    
    task.start();
    this.scheduledTasks.set(workflowId, task);
  }

  unscheduleWorkflow(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(workflowId);
      this.logger.log(`Unscheduled workflow: ${workflowId}`);
    }
  }

  private intervalToCron(interval: number, unit: string): string {
    switch (unit) {
      case 'seconds':
        return `*/${interval} * * * * *`;
      case 'minutes':
        return `0 */${interval} * * * *`;
      case 'hours':
        return `0 0 */${interval} * * *`;
      case 'days':
        return `0 0 0 */${interval} * *`;
      default:
        return `0 */${interval} * * * *`;
    }
  }
}
```

3. **Update workflows when saved**:
```typescript
// In workflow.service.ts
async update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
  const workflow = await this.workflowModel.findByIdAndUpdate(
    id,
    updateWorkflowDto,
    { new: true }
  );
  
  // Reload schedule if it exists
  const scheduleNode = workflow.nodes.find(
    (node) => node.type === 'schedule'
  );
  
  if (scheduleNode) {
    if (scheduleNode.data.config?.enabled) {
      await this.schedulerService.scheduleWorkflow(
        id,
        scheduleNode.data.config
      );
    } else {
      this.schedulerService.unscheduleWorkflow(id);
    }
  }
  
  return workflow;
}
```

**Usage Example**:
- Every 5 minutes: interval=5, unit=minutes
- Daily at 9 AM: cronExpression=`0 0 9 * * *`
- Every weekday at 2 PM: cronExpression=`0 0 14 * * 1-5`

---

### 🤖 AI NODES

AI nodes integrate with various AI providers to process natural language, analyze data, and generate content.

#### 🤖 AI Chat
**Purpose**: Interact with AI language models (OpenAI, Anthropic, Ollama, Groq)

**Configuration**:
- `provider`*: ollama, groq, openai, anthropic
- `model`*: Model name (e.g., llama3.2, gpt-4, claude-3-opus)
- `apiKey`: Required for OpenAI, Anthropic, Groq (not for Ollama)
- `systemPrompt`: System instructions for the AI
- `prompt`*: Your question or instruction (supports expressions)
- `temperature`: Creativity (0-2, default: 0.7)
- `maxTokens`: Maximum response length (default: 1000)

**Expression Support**: ✅ Full support in `prompt` and `systemPrompt`

**Array Processing**: If input is an array, AI Chat processes **each item individually** and returns an array of results with the AI response added to each item.

**Usage Examples**:

**Example 1: Analyze Single Text**
```
Input: { "feedback": "The product is amazing but delivery was slow" }

Prompt: "Analyze this feedback and classify sentiment: {{$prev.data.feedback}}"

Output: {
  "feedback": "The product is amazing but delivery was slow",
  "response": "Sentiment: Mixed. Positive about product quality, negative about delivery speed.",
  "model": "gpt-4"
}
```

**Example 2: Process Array of Resumes**
```
Input: [
  { "name": "John", "resume": "5 years Python..." },
  { "name": "Jane", "resume": "3 years React..." }
]

Prompt: "Screen this resume for software engineer role: {{$item.resume}}"

Output: [
  {
    "name": "John",
    "resume": "5 years Python...",
    "response": "Strong backend candidate. Recommended for interview."
  },
  {
    "name": "Jane",
    "resume": "3 years React...",
    "response": "Good frontend skills. Recommended for interview."
  }
]
```

---

#### ✍️ AI Text Generation
**Purpose**: Generate specific types of content (articles, emails, summaries)

**Configuration**:
- `provider`*: openai, anthropic
- `apiKey`*: Your API key
- `contentType`: article, email, summary, custom
- `prompt`*: Generation instructions
- `tone`: professional, casual, friendly, formal

**Usage Example**:
```
Prompt: "Write a professional email thanking customer for their purchase"
Tone: "professional"

Output: {
  "response": "Dear valued customer,\n\nThank you for choosing our product..."
}
```

---

#### 👁️ AI Image Analysis
**Purpose**: Analyze images using vision models

**Configuration**:
- `provider`*: openai, google, anthropic
- `apiKey`*: Your API key
- `imageUrl`: URL of image or expression like `{{$prev.data.imageUrl}}`
- `analysisType`: describe, ocr, objects, custom
- `customPrompt`: For custom analysis type

**Usage Example**:
```
Input: { "imageUrl": "https://example.com/receipt.jpg" }
Analysis Type: "ocr"

Output: {
  "imageUrl": "https://example.com/receipt.jpg",
  "analysis": "Total: $45.99\nItems: Coffee $3.50, Sandwich $12.49..."
}
```

---

#### 😊 Sentiment Analysis
**Purpose**: Analyze sentiment of text (positive, negative, neutral)

**Configuration**:
- `text`*: Text to analyze (supports expressions)
- `detailedAnalysis`: Include emotion detection and confidence scores

**Usage Example**:
```
Text: "I love this product! It's exactly what I needed."

Output: {
  "text": "I love this product! It's exactly what I needed.",
  "sentiment": "positive",
  "score": 25.5,
  "confidence": "high"
}
```

---

### 🌐 DATA NODES

Data nodes fetch, parse, and manipulate data from various sources.

#### 🌐 HTTP Request
**Purpose**: Make API calls to external services

**Configuration**:
- `url`*: API endpoint (supports expressions)
- `method`: GET, POST, PUT, DELETE, PATCH
- `headers`: Request headers (JSON object)
- `queryParameters`: URL query params (key-value pairs)
- `body`: Request body (JSON)
- `authentication`: none, basicAuth, bearerToken, apiKey
- `timeout`: Request timeout in milliseconds (default: 30000)
- `retryOnFail`: Retry failed requests
- `retryCount`: Max retry attempts (default: 3)

**Expression Support**: ✅ Supported in url, headers, body

**Usage Examples**:

**Example 1: GET Request**
```
URL: "https://api.github.com/users/{{$prev.data.username}}"
Method: GET

Output: {
  "login": "username",
  "name": "Full Name",
  "public_repos": 42
}
```

**Example 2: POST with Authentication**
```
URL: "https://api.stripe.com/v1/charges"
Method: POST
Authentication: bearerToken
Token: "sk_live_xxxxx"
Body: {
  "amount": "{{$prev.data.amount}}",
  "currency": "usd"
}
```

---

#### 📋 JSON Parse
**Purpose**: Parse, stringify, or extract data from JSON

**Configuration**:
- `operation`: parse, stringify, extract
- `jsonPath`: JSON path for extraction (e.g., `$.data.items[0].name`)

**Usage Example**:
```
Input: '{"users": [{"name": "John", "age": 30}]}'
Operation: "extract"
JSON Path: "$.users[0].name"

Output: "John"
```

---

#### 📤 Upload File
**Purpose**: Upload and process files (CSV, Excel, JSON, images, PDF)

**Configuration**:
- `fileId`*: Upload file using file picker

**Supported Formats**:
- CSV: Auto-parsed into array of objects
- Excel (.xlsx, .xls): First sheet parsed into array
- JSON: Parsed JSON data
- Text (.txt): Raw text content
- Images, PDF: Binary data or extracted content

**Usage Example**:
```
Upload: sales_data.csv (with columns: date, product, amount)

Output: {
  "data": [
    {"date": "2025-01-01", "product": "Widget", "amount": 100},
    {"date": "2025-01-02", "product": "Gadget", "amount": 150}
  ],
  "metadata": {
    "type": "csv",
    "rowCount": 2,
    "columns": ["date", "product", "amount"]
  }
}
```

---

### 🔄 TRANSFORM NODES

Transform nodes modify, filter, and restructure data.

#### 🗺️ Data Mapper
**Purpose**: Transform data structure by mapping fields

**Configuration**:
- `mappings`*: Key-value pairs (outputField: inputField)
- `keepUnmapped`: Keep original fields not in mapping

**Usage Example**:
```
Input: { "first_name": "John", "last_name": "Doe", "email_address": "john@example.com" }

Mappings: {
  "name": "first_name",
  "surname": "last_name",
  "email": "email_address"
}

Output: { "name": "John", "surname": "Doe", "email": "john@example.com" }
```

---

#### 📊 Aggregate
**Purpose**: Perform calculations on data arrays

**Configuration**:
- `operation`*: sum, average, count, min, max, groupBy
- `field`: Field to aggregate
- `groupByField`: Field to group by (for groupBy operation)

**Usage Examples**:

**Sum**:
```
Input: [
  {"product": "A", "sales": 100},
  {"product": "B", "sales": 200}
]
Operation: "sum"
Field: "sales"

Output: { "sum": 300, "field": "sales" }
```

**Group By**:
```
Input: [
  {"category": "electronics", "price": 100},
  {"category": "books", "price": 20},
  {"category": "electronics", "price": 150}
]
Operation: "groupBy"
Group By Field: "category"

Output: {
  "electronics": [
    {"category": "electronics", "price": 100},
    {"category": "electronics", "price": 150}
  ],
  "books": [
    {"category": "books", "price": 20}
  ]
}
```

---

#### 💻 Code
**Purpose**: Run custom JavaScript code for complex transformations

**Configuration**:
- `code`*: JavaScript code to execute
- `mode`: runOnceForAllItems, runOnceForEachItem

**Available Variables**:
- `items`: Input data (always an array)
- `console.log()`: For debugging

**Usage Example**:
```javascript
// Input: [{"price": 100}, {"price": 200}]

// Code:
const output = items.map(item => ({
  ...item,
  priceWithTax: item.price * 1.2,
  discount: item.price > 150 ? item.price * 0.1 : 0
}));

return output;

// Output: [
//   {"price": 100, "priceWithTax": 120, "discount": 0},
//   {"price": 200, "priceWithTax": 240, "discount": 20}
// ]
```

---

#### ✏️ Set
**Purpose**: Add or modify fields in data

**Configuration**:
- `mode`: set (add/update), delete (remove fields)
- `values`: Key-value pairs to set

**Usage Example**:
```
Input: { "name": "John", "age": 30 }

Mode: "set"
Values: {
  "status": "active",
  "lastLogin": "2025-01-06"
}

Output: {
  "name": "John",
  "age": 30,
  "status": "active",
  "lastLogin": "2025-01-06"
}
```

---

#### 🔍 Filter
**Purpose**: Filter array items based on conditions

**Configuration**:
- `conditions`*: Array of filter conditions
  - `field`: Field name
  - `operator`: equals, notEquals, contains, greaterThan, lessThan
  - `value`: Comparison value

**Usage Example**:
```
Input: [
  {"name": "John", "age": 25, "city": "NYC"},
  {"name": "Jane", "age": 35, "city": "LA"},
  {"name": "Bob", "age": 30, "city": "NYC"}
]

Conditions: [
  { field: "age", operator: "greaterThan", value: 28 },
  { field: "city", operator: "equals", value: "NYC" }
]

Output: [
  {"name": "Bob", "age": 30, "city": "NYC"}
]
```

---

#### 🔃 Sort
**Purpose**: Sort array items

**Configuration**:
- `sortBy`*: Field to sort by
- `order`: ascending, descending

**Usage Example**:
```
Input: [
  {"name": "Charlie", "score": 85},
  {"name": "Alice", "score": 95},
  {"name": "Bob", "score": 90}
]

Sort By: "score"
Order: "descending"

Output: [
  {"name": "Alice", "score": 95},
  {"name": "Bob", "score": 90},
  {"name": "Charlie", "score": 85}
]
```

---

### 🔀 LOGIC NODES

Logic nodes control workflow execution flow.

#### 🔀 IF
**Purpose**: Branch workflow based on conditions

**Configuration**:
- `conditions`*: Array of conditions to evaluate
- `combineOperation`: AND (all must be true), OR (any must be true)

**Outputs**: 2 outputs (true, false)

**Usage Example**:
```
Input: { "orderTotal": 150, "customerType": "premium" }

Conditions: [
  { field: "orderTotal", operator: "greaterThan", value: 100 }
]

If true → connects to "Send Premium Discount Email" node
If false → connects to "Send Standard Email" node
```

---

#### 🔄 Switch
**Purpose**: Route to multiple branches based on rules

**Configuration**:
- `mode`: rules, expression
- `rules`: Array of routing rules

**Outputs**: 4 outputs (0, 1, 2, 3)

**Usage Example**:
```
Input: { "priority": "high" }

Route to output 0 if priority = "high"
Route to output 1 if priority = "medium"
Route to output 2 if priority = "low"
Route to output 3 for all others (default)
```

---

#### 🔁 Loop Over Items
**Purpose**: Process array items in batches

**Configuration**:
- `batchSize`: Number of items per batch (default: 1)
- `pauseBetweenBatches`: Delay in milliseconds

**Outputs**: 2 outputs (loop, done)

**Usage Example**:
```
Input: Array of 100 customer emails

Batch Size: 10
Pause Between Batches: 2000 (2 seconds)

Processes 10 emails at a time with 2 second delay between batches
```

---

### 📧 COMMUNICATION NODES

Communication nodes send messages and notifications.

#### 📧 Send Email
**Purpose**: Send emails via SMTP

**Configuration**:
- `fromEmail`*: Sender email address
- `toEmail`*: Recipient email (supports expressions like `{{$item.email}}`)
- `subject`*: Email subject (supports expressions)
- `body`*: Email body (supports expressions)
- `html`: Send as HTML (default: false)
- `smtpHost`*: SMTP server (default: smtp.gmail.com)
- `smtpPort`: SMTP port (default: 587)
- `smtpUser`*: SMTP username
- `smtpPassword`*: SMTP password

**Expression Support**: ✅ Full support in `toEmail`, `subject`, `body`

**Array Processing**: Automatically sends individual emails to each item in an array

**Usage Example**:

**Single Email**:
```
Input: { "customerName": "John", "orderNumber": "12345" }

To: "john@example.com"
Subject: "Order Confirmation #{{$prev.data.orderNumber}}"
Body: "Dear {{$prev.data.customerName}},\n\nYour order has been confirmed."

Sends 1 email to john@example.com
```

**Bulk Emails from Array**:
```
Input: [
  { "name": "John", "email": "john@example.com", "status": "approved" },
  { "name": "Jane", "email": "jane@example.com", "status": "rejected" }
]

To: "{{$item.email}}"
Subject: "Application Status Update"
Body: "Hi {{$item.name}}, your application was {{$item.status}}."

Sends 2 separate emails (one to John, one to Jane)
```

**Gmail Setup**:
1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use your Gmail as `smtpUser`
4. Use the App Password as `smtpPassword`

---

#### 💬 Slack
**Purpose**: Send messages to Slack channels

**Configuration**:
- `channel`*: Channel name (e.g., #general)
- `text`*: Message text
- `authentication`: webhook, token
- `webhookUrl`: Slack webhook URL
- `botToken`: Slack bot token

**Usage Example**:
```
Channel: "#alerts"
Text: "New order received: ${{$prev.data.amount}}"
Authentication: "webhook"
Webhook URL: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

### 📁 FILE NODES

File nodes read and write files.

#### 📁 Read/Write File
**Purpose**: Read or write files from disk or uploaded files

**Configuration**:
- `operation`: read, write, append
- `filePath`*: File path or file ID from Upload File node
- `encoding`: utf-8, base64, binary
- `content`: Content for write/append operations

**Usage Examples**:

**Read Uploaded File**:
```
File Path: "{{$prev.data.fileId}}" (from Upload File node)
Operation: "read"

Automatically detects file type and parses accordingly
```

**Write File**:
```
File Path: "/output/report.txt"
Operation: "write"
Content: "{{$prev.data.reportText}}"
```

---

### ⏱️ UTILITY NODES

#### ⏱️ Wait/Delay
**Purpose**: Pause workflow execution

**Configuration**:
- `amount`*: Wait duration
- `unit`: seconds, minutes, hours

**Usage Example**:
```
Amount: 5
Unit: "seconds"

Pauses workflow for 5 seconds before continuing
```

---

#### 🔗 Merge
**Purpose**: Combine data from multiple branches

**Configuration**:
- `mode`: append (combine arrays), merge (merge objects)

**Usage Example**:
```
Input from Branch 1: [{"name": "John"}]
Input from Branch 2: [{"name": "Jane"}]

Mode: "append"

Output: [{"name": "John"}, {"name": "Jane"}]
```

---

## Data Flow & Expressions

### Understanding Data Flow

Data flows through your workflow from node to node via connections. Each node receives input data, processes it, and produces output data for the next node.

### Expression Syntax

Expressions allow you to reference data from previous nodes dynamically.

#### Basic Syntax
```
{{$node.NODE_ID.data.FIELD_NAME}}
```

#### Expression Types

**1. Previous Node Reference (`$prev`)**
```
{{$prev.data.email}}          // Access field from immediately previous node
{{$prev.data.user.name}}      // Access nested field
{{$prev.data.items[0]}}       // Access array element
```

**2. Specific Node Reference (`$node`)**
```
{{$node.node-1234567890.data.userId}}     // Access by node ID
{{$node.httpRequest_1.data.response}}     // Access by node type_index
```

**3. Current Item Reference (`$item`)** - In loops or array processing
```
{{$item.email}}               // Access field in current loop item
{{$item.customer.name}}       // Access nested field in current item
```

**4. Workflow Input Reference (`$input`)**
```
{{$input.userId}}             // Access workflow input data
{{$input.config.apiKey}}      // Access nested input data
```

**5. Built-in Functions**
```
{{$now}}                      // Current ISO timestamp
{{$timestamp}}                // Current Unix timestamp
{{$uuid}}                     // Generate UUID
{{$random(1, 100)}}          // Random number between 1 and 100
```

### Expression Examples

**Example 1: Email Personalization**
```
Previous Node Output: {
  "firstName": "John",
  "email": "john@example.com",
  "orderNumber": "ORD-12345"
}

Email Subject: "Order {{$prev.data.orderNumber}} Confirmation"
Email Body: "Dear {{$prev.data.firstName}},\n\nThank you for your order!"
```

**Example 2: API Call Chain**
```
Node 1 (Get User): { "userId": "123", "email": "john@example.com" }
Node 2 (Get Orders): 
  URL: "https://api.example.com/users/{{$prev.data.userId}}/orders"

Node 3 (Send Email):
  To: "{{$node.node-111111.data.email}}"
  Subject: "You have {{$prev.data.length}} orders"
```

**Example 3: Loop Processing**
```
Input Array: [
  { "name": "John", "email": "john@example.com" },
  { "name": "Jane", "email": "jane@example.com" }
]

Email Node:
  To: "{{$item.email}}"
  Body: "Hi {{$item.name}}, welcome aboard!"
```

---

## Best Practices

### 1. Workflow Design

✅ **DO**:
- Start every workflow with a trigger node
- Use descriptive node labels
- Test workflows with sample data before production
- Handle errors with conditional branches
- Use delays to avoid rate limiting

❌ **DON'T**:
- Create circular connections (infinite loops)
- Skip required field configurations
- Process large datasets without batching
- Hardcode sensitive data (use expressions)

### 2. Expression Usage

✅ **DO**:
- Use `$prev` for simple sequential flows
- Use `$node.NODE_ID` for complex flows with multiple branches
- Use `$item` when processing arrays
- Test expressions with small datasets first

❌ **DON'T**:
- Reference nodes that haven't executed yet
- Use expressions in fields that don't support them
- Create deeply nested expressions (hard to debug)

### 3. Error Handling

✅ **DO**:
- Use IF nodes to check data validity
- Set appropriate timeouts for HTTP requests
- Enable retry for network requests
- Log important data at each step

### 4. Performance

✅ **DO**:
- Use batch processing for large arrays
- Add delays between API calls
- Filter data early in the workflow
- Limit AI token usage

❌ **DON'T**:
- Process entire large datasets at once
- Make unlimited API calls in loops
- Skip pagination for large result sets

### 5. Security

✅ **DO**:
- Store API keys securely
- Use authentication for webhooks
- Validate input data
- Sanitize user-provided content

❌ **DON'T**:- Expose API keys in workflow exports
- Allow unauthenticated webhook access
- Trust external data without validation

---

## Common Workflow Patterns

### Pattern 1: Resume Screening
```
Trigger (Webhook) 
  → Upload File (CSV of resumes)
  → AI Chat (Screen each resume)
  → Filter (Qualified candidates)
  → Send Email (Interview invitations)
```

### Pattern 2: Order Processing
```
Trigger (Webhook: New Order)
  → HTTP Request (Get customer data)
  → IF (Order > $100?)
    → TRUE: Send Email (Premium thank you)
    → FALSE: Send Email (Standard thank you)
```

### Pattern 3: Data Enrichment
```
Trigger (Manual)
  → Upload File (Customer list)
  → HTTP Request (Enrich with external API)
  → Data Mapper (Transform structure)
  → Send Email (Results)
```

### Pattern 4: Content Moderation
```
Trigger (Webhook: New Comment)
  → AI Sentiment (Analyze toxicity)
  → IF (Toxic?)
    → TRUE: Send Email (Alert moderator)
    → FALSE: HTTP Request (Approve comment)
```

---

## Troubleshooting

### Common Issues

**Issue**: "Field X is required" error
- **Solution**: Fill all required fields marked with *

**Issue**: Expression returns undefined
- **Solution**: Check node has executed before reference, verify field path

**Issue**: Emails not sending
- **Solution**: Check SMTP credentials, enable "Less secure app access" or use App Password

**Issue**: Webhook not triggering
- **Solution**: Implement webhook listener endpoint (see Webhook section)

**Issue**: Schedule not running
- **Solution**: Implement scheduler service (see Schedule section)

**Issue**: Array processing not working
- **Solution**: Ensure previous node outputs array format

---

## Quick Reference

### Expression Cheat Sheet
```
{{$prev.data.field}}              - Previous node field
{{$node.ID.data.field}}           - Specific node field
{{$item.field}}                   - Current loop item
{{$input.field}}                  - Workflow input
{{$now}}                          - Current timestamp
{{$uuid}}                         - Generate UUID
```

### Node Connection Rules
- Trigger nodes: 0 inputs, 1+ outputs
- Processing nodes: 1+ inputs, 1+ outputs
- IF node: 1 input, 2 outputs (true/false)
- Switch node: 1 input, 4 outputs (0-3)
- Merge node: 2+ inputs, 1 output

---