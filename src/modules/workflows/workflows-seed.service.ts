
// ============================================
// FILE: src/workflows/workflows-seed.service.ts
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workflow, WorkflowDocument } from './workflow.schema';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class WorkflowsSeedService {
  private readonly logger = new Logger(WorkflowsSeedService.name);

  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async seedComprehensiveWorkflow(userEmail: string) {
    this.logger.log(`Starting workflow seed for user: ${userEmail}`);

    // Find user by email
    const user = await this.userModel.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    this.logger.log(`User found: ${user._id}`);

    // Check if workflow already exists for this user
    const existingWorkflow = await this.workflowModel.findOne({
      userId: user._id,
      name: "Complete Feature Test Workflow"
    });

    if (existingWorkflow) {
      this.logger.warn('Workflow already exists. Deleting old one...');
      await this.workflowModel.deleteOne({ _id: existingWorkflow._id });
    }

    // Create comprehensive workflow
    const workflowData = {
      name: "Complete Feature Test Workflow",
      isActive: true,
      userId: user._id,
      
      nodes: [
        // ========== TRIGGER NODE ==========
        {
          id: "node_trigger_1",
          type: "trigger",
          position: { x: 100, y: 100 },
          data: {
            label: "Start Workflow",
            config: {
              triggerType: "manual"
            }
          }
        },

        // ========== HTTP REQUEST NODE ==========
        {
          id: "node_http_1",
          type: "httpRequest",
          position: { x: 300, y: 100 },
          data: {
            label: "Fetch User Data",
            config: {
              url: "https://jsonplaceholder.typicode.com/users",
              method: "GET",
              headers: {
                "Content-Type": "application/json"
              },
              timeout: 30000,
              authentication: "none"
            }
          }
        },

        // ========== CODE NODE - Transform Data ==========
        {
          id: "node_code_1",
          type: "code",
          position: { x: 500, y: 100 },
          data: {
            label: "Transform User Data",
            config: {
              code: "// Transform the user data\nconst users = items[0];\nconst transformed = users.slice(0, 5).map(user => ({\n  id: user.id,\n  name: user.name,\n  email: user.email,\n  city: user.address.city,\n  company: user.company.name,\n  score: Math.floor(Math.random() * 100)\n}));\n\nreturn transformed;",
              mode: "runOnceForAllItems"
            }
          }
        },

        // ========== SET NODE - Add Metadata ==========
        {
          id: "node_set_1",
          type: "set",
          position: { x: 700, y: 100 },
          data: {
            label: "Add Metadata",
            config: {
              mode: "set",
              values: {
                processedAt: new Date().toISOString(),
                workflow: "test-workflow",
                version: "1.0"
              }
            }
          }
        },

        // ========== FILTER NODE ==========
        {
          id: "node_filter_1",
          type: "filter",
          position: { x: 900, y: 100 },
          data: {
            label: "Filter High Scores",
            config: {
              conditions: [
                {
                  field: "score",
                  operator: "greaterThan",
                  value: 50
                }
              ]
            }
          }
        },

        // ========== SORT NODE ==========
        {
          id: "node_sort_1",
          type: "sort",
          position: { x: 1100, y: 100 },
          data: {
            label: "Sort by Score",
            config: {
              sortBy: "score",
              order: "descending"
            }
          }
        },

        // ========== IF NODE - Branch Logic ==========
        {
          id: "node_if_1",
          type: "if",
          position: { x: 1300, y: 100 },
          data: {
            label: "Check Result Count",
            config: {
              conditions: [
                {
                  field: "length",
                  operator: "greaterThan",
                  value: 0
                }
              ],
              combineOperation: "AND"
            }
          }
        },

        // ========== CODE NODE - Format for Email (True Branch) ==========
        {
          id: "node_code_2",
          type: "code",
          position: { x: 1500, y: 50 },
          data: {
            label: "Format Email Content",
            config: {
              code: "// Format the data for email\nconst users = items;\nlet emailBody = 'Top Performers:\\n\\n';\n\nusers.forEach((user, index) => {\n  emailBody += `${index + 1}. ${user.name} - Score: ${user.score}\\n`;\n  emailBody += `   Email: ${user.email}\\n`;\n  emailBody += `   Company: ${user.company}\\n\\n`;\n});\n\nreturn {\n  users: users,\n  emailBody: emailBody,\n  count: users.length\n};",
              mode: "runOnceForAllItems"
            }
          }
        },

        // ========== EMAIL NODE (True Branch) ==========
        {
          id: "node_email_1",
          type: "email",
          position: { x: 1700, y: 50 },
          data: {
            label: "Send Success Email",
            config: {
              fromEmail: "workflow@example.com",
              toEmail: userEmail, // Use the actual user's email
              subject: "Workflow Results - High Performers Found",
              body: "Check the results of your workflow execution!",
              html: false,
              authentication: "login",
              smtpHost: "smtp.gmail.com",
              smtpPort: 587,
              smtpUser: "your-email@gmail.com",
              smtpPassword: "your-app-password"
            }
          }
        },

        // ========== SLACK NODE (True Branch) ==========
        {
          id: "node_slack_1",
          type: "slack",
          position: { x: 1900, y: 50 },
          data: {
            label: "Notify Slack",
            config: {
              channel: "#workflow-notifications",
              text: "✅ Workflow completed successfully! High performers identified.",
              authentication: "webhook",
              webhookUrl: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            }
          }
        },

        // ========== CODE NODE - No Results Message (False Branch) ==========
        {
          id: "node_code_3",
          type: "code",
          position: { x: 1500, y: 250 },
          data: {
            label: "Format No Results",
            config: {
              code: "// No results found\nreturn {\n  message: 'No users met the criteria (score > 50)',\n  timestamp: new Date().toISOString()\n};",
              mode: "runOnceForAllItems"
            }
          }
        },

        // ========== SLACK NODE (False Branch) ==========
        {
          id: "node_slack_2",
          type: "slack",
          position: { x: 1700, y: 250 },
          data: {
            label: "Notify No Results",
            config: {
              channel: "#workflow-notifications",
              text: "⚠️ Workflow completed but no high performers found (score > 50)",
              authentication: "webhook",
              webhookUrl: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            }
          }
        },

        // ========== DELAY NODE (Testing Flow Control) ==========
        {
          id: "node_delay_1",
          type: "delay",
          position: { x: 1900, y: 250 },
          data: {
            label: "Wait 2 Seconds",
            config: {
              amount: 2,
              unit: "seconds"
            }
          }
        },

        // ========== HTTP REQUEST - POST Example ==========
        {
          id: "node_http_2",
          type: "httpRequest",
          position: { x: 2100, y: 150 },
          data: {
            label: "Log to External API",
            config: {
              url: "https://jsonplaceholder.typicode.com/posts",
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: {
                title: "Workflow Execution Log",
                body: "Workflow completed",
                userId: 1
              },
              timeout: 30000,
              authentication: "none"
            }
          }
        },

        // ========== DATABASE NODE (Placeholder) ==========
        {
          id: "node_database_1",
          type: "database",
          position: { x: 2300, y: 150 },
          data: {
            label: "Store Results (DB)",
            config: {
              dbType: "mysql",
              operation: "insert",
              query: "INSERT INTO workflow_results (data, created_at) VALUES (?, NOW())",
              authentication: "credentials",
              host: "localhost",
              port: 3306,
              database: "workflow_db",
              username: "db_user",
              password: "db_password"
            }
          }
        }
      ],

      connections: [
        // Main Flow
        { source: "node_trigger_1", target: "node_http_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_http_1", target: "node_code_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_code_1", target: "node_set_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_set_1", target: "node_filter_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_filter_1", target: "node_sort_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_sort_1", target: "node_if_1", sourceHandle: "output-0", targetHandle: "input-0" },
        
        // True Branch (results found)
        { source: "node_if_1", target: "node_code_2", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_code_2", target: "node_email_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_email_1", target: "node_slack_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_slack_1", target: "node_http_2", sourceHandle: "output-0", targetHandle: "input-0" },
        
        // False Branch (no results)
        { source: "node_if_1", target: "node_code_3", sourceHandle: "output-1", targetHandle: "input-0" },
        { source: "node_code_3", target: "node_slack_2", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_slack_2", target: "node_delay_1", sourceHandle: "output-0", targetHandle: "input-0" },
        { source: "node_delay_1", target: "node_http_2", sourceHandle: "output-0", targetHandle: "input-0" },
        
        // Both branches merge to database
        { source: "node_http_2", target: "node_database_1", sourceHandle: "output-0", targetHandle: "input-0" }
      ],

      settings: {
        timezone: "UTC",
        errorWorkflow: null,
        saveExecutionProgress: true,
        saveDataSuccessExecution: "all",
        saveDataErrorExecution: "all",
        executionTimeout: 300000
      },

      metadata: {
        tags: ["test", "comprehensive", "demo"],
        description: "A comprehensive workflow that demonstrates and tests all major node types including HTTP requests, data transformation, conditional logic, loops, email/Slack notifications, and file operations.",
        version: "1.0.0",
        category: "testing",
        author: "system"
      }
    };

    // Save workflow
    const workflow = new this.workflowModel(workflowData);
    const savedWorkflow = await workflow.save();

    this.logger.log(`Workflow created successfully with ID: ${savedWorkflow._id}`);
    this.logger.log(`Total nodes: ${savedWorkflow.nodes.length}`);
    this.logger.log(`Total connections: ${savedWorkflow.connections.length}`);

    return savedWorkflow;
  }

  // Helper method to delete the test workflow
  async deleteTestWorkflow(userEmail: string) {
    const user = await this.userModel.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    const result = await this.workflowModel.deleteOne({
      userId: user._id,
      name: "Complete Feature Test Workflow"
    });

    this.logger.log(`Deleted ${result.deletedCount} workflow(s)`);
    return result;
  }
}
