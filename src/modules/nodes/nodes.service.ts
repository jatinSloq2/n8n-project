import { Injectable } from "@nestjs/common";

@Injectable()
export class NodesService {
  private readonly nodeTemplates: any[];

  constructor() {
    this.nodeTemplates = this.initializeNodeTemplates();
  }

  private initializeNodeTemplates() {
    return [
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
            description: "Toggle to enable/disable the schedule",
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
            placeholder: "5",
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
            description: "Use cron syntax for advanced scheduling",
          },
          {
            name: "timezone",
            label: "Timezone",
            type: "string",
            default: "UTC",
            placeholder: "America/New_York",
          },
        ],
      },
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
            options: [
              "GET",
              "POST",
              "PUT",
              "DELETE",
              "PATCH",
              "HEAD",
              "OPTIONS",
            ],
            default: "GET",
          },
          {
            name: "headers",
            label: "Headers",
            type: "json",
            default: {},
            placeholder: '{\n  "Content-Type": "application/json"\n}',
          },
          {
            name: "body",
            label: "Body",
            type: "json",
            default: {},
            placeholder: '{\n  "key": "value"\n}',
          },
          {
            name: "timeout",
            label: "Timeout (ms)",
            type: "number",
            default: 30000,
          },
          {
            name: "authentication",
            label: "Authentication",
            type: "select",
            options: ["none", "basicAuth", "apiKey"],
            default: "none",
          },
          {
            name: "username",
            label: "Username",
            type: "string",
            placeholder: "Enter username for Basic Auth",
          },
          {
            name: "password",
            label: "Password",
            type: "string",
            placeholder: "Enter password for Basic Auth",
          },
          {
            name: "apiKey",
            label: "API Key",
            type: "string",
            placeholder: "Enter your API key",
          },
          {
            name: "apiKeyHeader",
            label: "API Key Header Name",
            type: "string",
            default: "X-API-Key",
            placeholder: "X-API-Key",
          },
        ],
      },
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
            placeholder: "sender@example.com",
          },
          {
            name: "toEmail",
            label: "To Email",
            type: "string",
            required: true,
            placeholder: "recipient@example.com",
          },
          {
            name: "subject",
            label: "Subject",
            type: "string",
            required: true,
            placeholder: "Email subject",
          },
          {
            name: "body",
            label: "Email Body",
            type: "text",
            required: true,
            placeholder: "Enter your email message here...",
          },
          {
            name: "html",
            label: "Send as HTML",
            type: "boolean",
            default: false,
            description: "Enable to send email with HTML formatting",
          },
          {
            name: "authentication",
            label: "SMTP Authentication",
            type: "select",
            options: ["none", "login"],
            default: "login",
          },
          {
            name: "smtpHost",
            label: "SMTP Host",
            type: "string",
            required: true,
            default: "smtp.gmail.com",
            placeholder: "smtp.gmail.com",
          },
          {
            name: "smtpPort",
            label: "SMTP Port",
            type: "number",
            required: true,
            default: 587,
            placeholder: "587",
          },
          {
            name: "smtpUser",
            label: "SMTP Username",
            type: "string",
            required: true,
            placeholder: "your-email@gmail.com",
          },
          {
            name: "smtpPassword",
            label: "SMTP Password",
            type: "string",
            required: true,
            placeholder: "Your app password or SMTP password",
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
            placeholder: "Enter your message",
          },
          {
            name: "authentication",
            label: "Authentication Method",
            type: "select",
            options: ["webhook", "token"],
            default: "webhook",
          },
          {
            name: "webhookUrl",
            label: "Webhook URL",
            type: "string",
            placeholder: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
          },
          {
            name: "botToken",
            label: "Bot Token",
            type: "string",
            placeholder: "xoxb-your-bot-token",
          },
        ],
      },
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
            default:
              "// Access input data via 'items'\nconst output = items.map(item => ({\n  ...item,\n  processed: true\n}));\n\nreturn output;",
            required: true,
            placeholder: "Enter your JavaScript code",
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
        id: "set",
        type: "set",
        name: "Set",
        category: "transform",
        description: "Set values on items",
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
            label: "Conditions",
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
            label: "Sort By",
            type: "string",
            required: true,
            placeholder: "fieldName",
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
        description: "Wait for a specified time",
        icon: "⏱️",
        color: "#795548",
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
            options: ["seconds", "minutes", "hours", "days"],
            default: "seconds",
          },
        ],
      },
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
            options: ["mysql", "postgresql", "mongodb"],
            default: "mysql",
          },
          {
            name: "operation",
            label: "Operation",
            type: "select",
            options: ["select", "insert", "update", "delete"],
            default: "select",
          },
          {
            name: "query",
            label: "Query",
            type: "text",
            required: true,
            placeholder: "SELECT * FROM table",
          },
          {
            name: "authentication",
            label: "Authentication",
            type: "select",
            options: ["credentials"],
            default: "credentials",
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
            required: true,
            default: 3306,
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
