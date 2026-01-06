import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ExecutionsService } from '../executions/executions.service';
import { WorkflowExecutor } from '../executions/workflow-executor.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionService: ExecutionsService,
    private readonly workflowExecutor: WorkflowExecutor,
  ) {}

  // Generic webhook handler that matches any path
  @Post(':workflowId/*')
  @Get(':workflowId/*')
  @Put(':workflowId/*')
  @Delete(':workflowId/*')
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Param('0') path: string, // Captures the rest of the path
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any,
    @Req() request: Request,
  ) {
    try {
      // Find workflow with matching webhook path
      const workflow = await this.workflowsService.findByIdWebhook(workflowId);
      
      if (!workflow) {
        throw new HttpException('Workflow not found', HttpStatus.NOT_FOUND);
      }

      // Find webhook node in the workflow
      const webhookNode = workflow.nodes.find(
        (node) => node.type === 'webhook' && node.data.config?.path === `/${path}`
      );

      if (!webhookNode) {
        throw new HttpException(
          `Webhook path /${path} not found in workflow`,
          HttpStatus.NOT_FOUND
        );
      }

      // Check authentication if configured
      const authConfig = webhookNode.data.config;
      if (authConfig.authentication === 'headerAuth') {
        const authHeader = headers['authorization'];
        if (!authHeader || authHeader !== authConfig.authHeaderValue) {
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
      } else if (authConfig.authentication === 'queryAuth') {
        const authQuery = query['auth'];
        if (!authQuery || authQuery !== authConfig.authQueryValue) {
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
      }

      // FIXED: Changed to pass separate arguments instead of object
      const execution = await this.executionService.create(
        workflowId,
        workflow.userId.toString(), // FIXED: Changed from workflow.user to workflow.userId
        {
          mode: 'webhook',
        }
      );

      // Prepare webhook input data
      const webhookData = {
        path: `/${path}`,
        method: request.method,
        body: body,
        headers: headers,
        query: query,
        timestamp: new Date().toISOString(),
      };

      // Execute workflow in background (don't await)
      this.workflowExecutor
        .execute(
          workflowId,
          execution._id.toString(),
          webhookData,
          workflow.userId.toString(), // FIXED: Changed from workflow.user to workflow.userId
        )
        .catch((error) => {
          console.error(`Webhook execution failed: ${error.message}`);
        });

      // Return success immediately (async execution)
      return {
        success: true,
        executionId: execution._id,
        message: 'Webhook received and workflow execution started',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Webhook processing failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}