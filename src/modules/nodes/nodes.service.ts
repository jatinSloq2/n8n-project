import { Injectable } from "@nestjs/common";

@Injectable()
export class NodesService {
  private readonly nodeTemplates: any[];

  constructor() {
    this.nodeTemplates = this.initializeNodeTemplates();
  }

  private initializeNodeTemplates() {
    return [
      // ============= TRIGGER NODES =============
      {
        id: "trigger",
        type: "trigger",
        name: "Manual Trigger",
        category: "trigger",
        description: "Manually start the workflow",
        icon: "▶️",
        color: "#4CAF50",
        inputs: 0,
        outputs: 1,
        properties: [
          {
            name: "triggerType",
            label: "Trigger Type",
            type: "select",
            options: ["manual", "scheduled"],
            default: "manual",
          },
        ],
      },
      {
        id: "webhook",
        type: "webhook",
        name: "Webhook",
        category: "trigger",
        description: "Listen for incoming webhook requests",
        icon: "🪝",
        color: "#FF6B6B",
        inputs: 0,
        outputs: 1,
        properties: [
          {
            name: "path",
            label: "Webhook Path",
            type: "string",
            required: true,
            placeholder: "/webhook/my-endpoint",
            description: "URL path for this webhook",
          },
          {
            name: "method",
            label: "HTTP Method",
            type: "select",
            options: ["GET", "POST", "PUT", "DELETE"],
            default: "POST",
          },
          {
            name: "authentication",
            label: "Authentication",
            type: "select",
            options: ["none", "headerAuth", "queryAuth"],
            default: "none",
          },
        ],
      },
      {
        id: "schedule",
        type: "schedule",
        name: "Schedule Trigger",
        category: "trigger",
        description: "Trigger workflow on a schedule",
        icon: "⏰",
        color: "#FF9800",
        inputs: 0,
        outputs: 1,
        properties: [
          {
            name: "enabled",
            label: "Enable Schedule",
            type: "boolean",
            default: false,
          },
          {
            name: "scheduleType",
            label: "Schedule Type",
            type: "select",
            options: ["interval", "cron"],
            default: "interval",
          },
          {
            name: "interval",
            label: "Interval",
            type: "number",
            default: 5,
          },
          {
            name: "unit",
            label: "Time Unit",
            type: "select",
            options: ["seconds", "minutes", "hours", "days"],
            default: "minutes",
          },
          {
            name: "cronExpression",
            label: "Cron Expression",
            type: "string",
            placeholder: "0 */5 * * * *",
          },
          {
            name: "timezone",
            label: "Timezone",
            type: "string",
            default: "UTC",
          },
        ],
      },

      // ============= AI NODES =============
      {
        id: "aiChat",
        type: "aiChat",
        name: "AI Chat",
        category: "ai",
        description: "Interact with AI language models",
        icon: "🤖",
        color: "#8B5CF6",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "provider",
            label: "AI Provider",
            type: "select",
            options: ["ollama", "groq", "openai", "anthropic"], // ✅ Added ollama and groq
            default: "ollama",
            required: true,
          },
          {
            name: "model",
            label: "Model",
            type: "string",
            default: "llama3.2",
            placeholder: "llama3.2, mistral, phi3, llama-3.3-70b-versatile",
            required: true,
          },
          {
            name: "apiKey",
            label: "API Key",
            type: "string",
            required: false, // ✅ Not required for Ollama
            placeholder: "Required for OpenAI, Anthropic, Groq",
          },
          {
            name: "ollamaUrl",
            label: "Ollama URL",
            type: "string",
            default: "http://localhost:11434",
            placeholder: "http://localhost:11434",
          },
          {
            name: "systemPrompt",
            label: "System Prompt",
            type: "text",
            placeholder: "You are a helpful assistant...",
            default: "You are a helpful assistant.",
          },
          {
            name: "prompt",
            label: "User Prompt",
            type: "text",
            required: true,
            placeholder: "Enter your prompt or use {{expressions}}",
          },
          {
            name: "temperature",
            label: "Temperature",
            type: "number",
            default: 0.7,
            min: 0,
            max: 2,
            step: 0.1,
          },
          {
            name: "maxTokens",
            label: "Max Tokens",
            type: "number",
            default: 1000,
          },
        ],
      },
      {
        id: "aiTextGeneration",
        type: "aiTextGeneration",
        name: "AI Text Generation",
        category: "ai",
        description: "Generate text content with AI",
        icon: "✍️",
        color: "#A855F7",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "provider",
            label: "Provider",
            type: "select",
            options: ["openai", "anthropic"],
            default: "openai",
          },
          {
            name: "apiKey",
            label: "API Key",
            type: "string",
            required: true,
          },
          {
            name: "contentType",
            label: "Content Type",
            type: "select",
            options: ["article", "email", "summary", "custom"],
            default: "custom",
          },
          {
            name: "prompt",
            label: "Generation Prompt",
            type: "text",
            required: true,
            placeholder: "Write a professional email about...",
          },
          {
            name: "tone",
            label: "Tone",
            type: "select",
            options: ["professional", "casual", "friendly", "formal"],
            default: "professional",
          },
        ],
      },
      {
        id: "aiImageAnalysis",
        type: "aiImageAnalysis",
        name: "AI Image Analysis",
        category: "ai",
        description: "Analyze images with AI vision models",
        icon: "👁️",
        color: "#EC4899",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "provider",
            label: "Provider",
            type: "select",
            options: ["openai", "google", "anthropic"],
            default: "openai",
          },
          {
            name: "apiKey",
            label: "API Key",
            type: "string",
            required: true,
          },
          {
            name: "imageUrl",
            label: "Image URL",
            type: "string",
            placeholder:
              "https://example.com/image.jpg or {{$node.xxx.data.url}}",
          },
          {
            name: "analysisType",
            label: "Analysis Type",
            type: "select",
            options: ["describe", "ocr", "objects", "custom"],
            default: "describe",
          },
          {
            name: "customPrompt",
            label: "Custom Prompt",
            type: "text",
            placeholder: "What do you see in this image?",
          },
        ],
      },
      {
        id: "aiSentiment",
        type: "aiSentiment",
        name: "Sentiment Analysis",
        category: "ai",
        description: "Analyze sentiment of text",
        icon: "😊",
        color: "#F59E0B",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "text",
            label: "Text to Analyze",
            type: "text",
            required: true,
            placeholder: "Enter text or use {{expressions}}",
          },
          {
            name: "detailedAnalysis",
            label: "Detailed Analysis",
            type: "boolean",
            default: false,
            description: "Include emotion detection and confidence scores",
          },
        ],
      },

      // ============= DATA TRANSFORMATION NODES =============
      {
        id: "httpRequest",
        type: "httpRequest",
        name: "HTTP Request",
        category: "data",
        description: "Make HTTP API requests",
        icon: "🌐",
        color: "#FF9800",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "url",
            label: "URL",
            type: "string",
            required: true,
            placeholder: "https://api.example.com/data",
          },
          {
            name: "method",
            label: "Method",
            type: "select",
            options: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
            default: "GET",
          },
          {
            name: "headers",
            label: "Headers",
            type: "json",
            default: {},
          },
          {
            name: "queryParameters",
            label: "Query Parameters",
            type: "keyValue",
            default: {},
          },
          {
            name: "body",
            label: "Body",
            type: "json",
            default: {},
          },
          {
            name: "authentication",
            label: "Authentication",
            type: "select",
            options: ["none", "basicAuth", "bearerToken", "apiKey", "oauth2"],
            default: "none",
          },
          {
            name: "timeout",
            label: "Timeout (ms)",
            type: "number",
            default: 30000,
          },
          {
            name: "retryOnFail",
            label: "Retry on Fail",
            type: "boolean",
            default: false,
          },
          {
            name: "retryCount",
            label: "Max Retries",
            type: "number",
            default: 3,
          },
        ],
      },
      {
        id: "jsonParse",
        type: "jsonParse",
        name: "JSON Parse",
        category: "data",
        description: "Parse and manipulate JSON data",
        icon: "📋",
        color: "#10B981",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "operation",
            label: "Operation",
            type: "select",
            options: ["parse", "stringify", "extract", "transform"],
            default: "parse",
          },
          {
            name: "jsonPath",
            label: "JSON Path",
            type: "string",
            placeholder: "$.data.items[0].name",
            description: "Extract specific data using JSON path",
          },
        ],
      },
      {
        id: "dataMapper",
        type: "dataMapper",
        name: "Data Mapper",
        category: "transform",
        description: "Map and transform data structures",
        icon: "🗺️",
        color: "#3B82F6",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "mappings",
            label: "Field Mappings",
            type: "keyValue",
            default: {},
            description: "Map input fields to output fields",
          },
          {
            name: "keepUnmapped",
            label: "Keep Unmapped Fields",
            type: "boolean",
            default: false,
          },
        ],
      },
      {
        id: "aggregate",
        type: "aggregate",
        name: "Aggregate",
        category: "transform",
        description: "Aggregate and summarize data",
        icon: "📊",
        color: "#8B5CF6",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "operation",
            label: "Operation",
            type: "select",
            options: ["sum", "average", "count", "min", "max", "groupBy"],
            default: "sum",
          },
          {
            name: "field",
            label: "Field to Aggregate",
            type: "string",
            placeholder: "amount",
          },
          {
            name: "groupByField",
            label: "Group By Field",
            type: "string",
            placeholder: "category",
          },
        ],
      },

      // ============= LOGIC & FLOW CONTROL =============
      {
        id: "if",
        type: "if",
        name: "IF",
        category: "logic",
        description: "Conditional routing based on rules",
        icon: "🔀",
        color: "#E91E63",
        inputs: 1,
        outputs: 2,
        outputLabels: ["true", "false"],
        properties: [
          {
            name: "conditions",
            label: "Conditions",
            type: "conditions",
            default: [],
          },
          {
            name: "combineOperation",
            label: "Combine",
            type: "select",
            options: ["AND", "OR"],
            default: "AND",
          },
        ],
      },
      {
        id: "switch",
        type: "switch",
        name: "Switch",
        category: "logic",
        description: "Route to multiple branches",
        icon: "🔄",
        color: "#FF5722",
        inputs: 1,
        outputs: 4,
        properties: [
          {
            name: "mode",
            label: "Mode",
            type: "select",
            options: ["rules", "expression"],
            default: "rules",
          },
          {
            name: "rules",
            label: "Rules",
            type: "array",
            default: [],
          },
        ],
      },
      {
        id: "loop",
        type: "loop",
        name: "Loop Over Items",
        category: "flow",
        description: "Iterate over array items",
        icon: "🔁",
        color: "#9C27B0",
        inputs: 1,
        outputs: 2,
        outputLabels: ["loop", "done"],
        properties: [
          {
            name: "batchSize",
            label: "Batch Size",
            type: "number",
            default: 1,
            description: "Process items in batches",
          },
          {
            name: "pauseBetweenBatches",
            label: "Pause Between Batches (ms)",
            type: "number",
            default: 0,
          },
        ],
      },

      // ============= DATABASE NODES =============
      {
        id: "database",
        type: "database",
        name: "Database",
        category: "data",
        description: "Query databases",
        icon: "🗄️",
        color: "#3F51B5",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "dbType",
            label: "Database Type",
            type: "select",
            options: ["mysql", "postgresql", "mongodb", "sqlite"],
            default: "postgresql",
          },
          {
            name: "operation",
            label: "Operation",
            type: "select",
            options: ["select", "insert", "update", "delete", "raw"],
            default: "select",
          },
          {
            name: "query",
            label: "Query",
            type: "text",
            required: true,
            placeholder:
              "SELECT * FROM users WHERE id = {{$node.xxx.data.userId}}",
          },
          {
            name: "host",
            label: "Host",
            type: "string",
            required: true,
            default: "localhost",
          },
          {
            name: "port",
            label: "Port",
            type: "number",
            default: 5432,
          },
          {
            name: "database",
            label: "Database Name",
            type: "string",
            required: true,
          },
          {
            name: "username",
            label: "Username",
            type: "string",
            required: true,
          },
          {
            name: "password",
            label: "Password",
            type: "string",
            required: true,
          },
        ],
      },

      // ============= COMMUNICATION NODES =============
      {
        id: "email",
        type: "email",
        name: "Send Email",
        category: "communication",
        description: "Send emails via SMTP",
        icon: "📧",
        color: "#607D8B",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "fromEmail",
            label: "From Email",
            type: "string",
            required: true,
          },
          {
            name: "toEmail",
            label: "To Email",
            type: "string",
            required: true,
          },
          {
            name: "subject",
            label: "Subject",
            type: "string",
            required: true,
          },
          {
            name: "body",
            label: "Email Body",
            type: "text",
            required: true,
          },
          {
            name: "html",
            label: "Send as HTML",
            type: "boolean",
            default: false,
          },
          {
            name: "smtpHost",
            label: "SMTP Host",
            type: "string",
            required: true,
            default: "smtp.gmail.com",
          },
          {
            name: "smtpPort",
            label: "SMTP Port",
            type: "number",
            default: 587,
          },
          {
            name: "smtpUser",
            label: "SMTP Username",
            type: "string",
            required: true,
          },
          {
            name: "smtpPassword",
            label: "SMTP Password",
            type: "string",
            required: true,
          },
        ],
      },
      {
        id: "slack",
        type: "slack",
        name: "Slack",
        category: "communication",
        description: "Send messages to Slack",
        icon: "💬",
        color: "#4A154B",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "channel",
            label: "Channel",
            type: "string",
            required: true,
            placeholder: "#general",
          },
          {
            name: "text",
            label: "Message",
            type: "text",
            required: true,
          },
          {
            name: "authentication",
            label: "Authentication",
            type: "select",
            options: ["webhook", "token"],
            default: "webhook",
          },
          {
            name: "webhookUrl",
            label: "Webhook URL",
            type: "string",
          },
          {
            name: "botToken",
            label: "Bot Token",
            type: "string",
          },
        ],
      },

      // ============= CODE & CUSTOM NODES =============
      {
        id: "code",
        type: "code",
        name: "Code",
        category: "transform",
        description: "Run custom JavaScript code",
        icon: "💻",
        color: "#9C27B0",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "code",
            label: "JavaScript Code",
            type: "code",
            default: `// Access input data via 'items'
const output = items.map(item => ({
  ...item,
  processed: true,
  timestamp: new Date().toISOString()
}));

return output;`,
            required: true,
          },
          {
            name: "mode",
            label: "Mode",
            type: "select",
            options: ["runOnceForAllItems", "runOnceForEachItem"],
            default: "runOnceForAllItems",
          },
        ],
      },
      {
        id: "function",
        type: "function",
        name: "Function",
        category: "transform",
        description: "Execute a JavaScript function",
        icon: "ƒ",
        color: "#673AB7",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "functionCode",
            label: "Function Code",
            type: "code",
            default: `return items.map(item => ({
  ...item,
  transformed: true
}));`,
            required: true,
          },
        ],
      },

      // ============= FILE & STORAGE NODES =============
      {
        id: "readFile",
        type: "readFile",
        name: "Read/Write File",
        category: "files",
        description: "Read or write files from disk",
        icon: "📁",
        color: "#795548",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "operation",
            label: "Operation",
            type: "select",
            options: ["read", "write", "append"],
            default: "read",
          },
          {
            name: "filePath",
            label: "File Path",
            type: "string",
            required: true,
            placeholder: "/path/to/file.txt or {{$prev.data.filePath}}",
          },
          {
            name: "encoding",
            label: "Encoding",
            type: "select",
            options: ["utf-8", "base64", "binary"],
            default: "utf-8",
          },
          {
            name: "content",
            label: "Content (for write/append)",
            type: "text",
            placeholder: "{{$prev.data}} or custom content",
          },
        ],
      },

      {
        id: "uploadFile",
        type: "uploadFile",
        name: "Upload File",
        category: "files",
        description: "Upload and process files (CSV, Excel, JSON, images, PDF)",
        icon: "📤",
        color: "#F59E0B",
        inputs: 0,
        outputs: 1,
        properties: [
          {
            name: "fileId",
            label: "Upload File",
            type: "file",
            required: true,
            description: "Upload CSV, Excel, JSON, text, image, or PDF file",
          },
          {
            name: "parseOptions",
            label: "Parse Options",
            type: "json",
            default: {},
            description: "Additional parsing options for CSV/Excel",
          },
        ],
      },

      // ============= UTILITY NODES =============
      {
        id: "set",
        type: "set",
        name: "Set",
        category: "transform",
        description: "Set or modify field values",
        icon: "✏️",
        color: "#00BCD4",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "mode",
            label: "Mode",
            type: "select",
            options: ["set", "delete"],
            default: "set",
          },
          {
            name: "values",
            label: "Values",
            type: "keyValue",
            default: {},
          },
        ],
      },
      {
        id: "filter",
        type: "filter",
        name: "Filter",
        category: "transform",
        description: "Filter items based on conditions",
        icon: "🔍",
        color: "#FF5722",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "conditions",
            label: "Filter Conditions",
            type: "conditions",
            default: [],
          },
        ],
      },
      {
        id: "sort",
        type: "sort",
        name: "Sort",
        category: "transform",
        description: "Sort items",
        icon: "🔃",
        color: "#795548",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "sortBy",
            label: "Sort By Field",
            type: "string",
            required: true,
          },
          {
            name: "order",
            label: "Order",
            type: "select",
            options: ["ascending", "descending"],
            default: "ascending",
          },
        ],
      },
      {
        id: "delay",
        type: "delay",
        name: "Wait",
        category: "flow",
        description: "Wait for specified time",
        icon: "⏱️",
        color: "#607D8B",
        inputs: 1,
        outputs: 1,
        properties: [
          {
            name: "amount",
            label: "Wait Amount",
            type: "number",
            default: 1,
            required: true,
          },
          {
            name: "unit",
            label: "Unit",
            type: "select",
            options: ["seconds", "minutes", "hours"],
            default: "seconds",
          },
        ],
      },
      {
        id: "merge",
        type: "merge",
        name: "Merge",
        category: "transform",
        description: "Merge data from multiple branches",
        icon: "🔗",
        color: "#009688",
        inputs: 2,
        outputs: 1,
        properties: [
          {
            name: "mode",
            label: "Merge Mode",
            type: "select",
            options: ["append", "merge", "keepKeyMatches"],
            default: "append",
          },
        ],
      },
    ];
  }

  getAllNodes() {
    return this.nodeTemplates;
  }

  getNodesByCategory(category: string) {
    return this.nodeTemplates.filter((node) => node.category === category);
  }

  getNodeById(id: string) {
    return this.nodeTemplates.find((node) => node.id === id);
  }

  getCategories() {
    const categories = [
      ...new Set(this.nodeTemplates.map((node) => node.category)),
    ];

    return categories.map((category) => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      nodes: this.getNodesByCategory(category),
    }));
  }
}
