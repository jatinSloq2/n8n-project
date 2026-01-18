// sample-response.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface SampleResponse {
  nodeId: string;
  nodeType: string;
  workflowId: string;
  response: any;
  capturedAt: Date;
}

@Injectable()
export class SampleResponseService {
  private readonly logger = new Logger(SampleResponseService.name);

  // In-memory cache for sample responses (can be moved to Redis for production)
  private sampleResponses: Map<string, SampleResponse> = new Map();

  // Generate sample response based on node type
  generateSampleResponse(nodeType: string): any {
    const samples: Record<string, any> = {
      httpRequest: {
        data: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'active',
          metadata: {
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        },
        metadata: {
          statusCode: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req_123456',
          },
        },
      },

      aiChat: {
        data: {
          response: 'This is a sample AI-generated response. The model has processed your request successfully.',
          model: 'gpt-4',
          usage: {
            prompt_tokens: 25,
            completion_tokens: 50,
            total_tokens: 75,
          },
        },
      },

      aiTextGeneration: {
        data: {
          response: 'Sample generated content based on your prompt.',
          model: 'gpt-4',
          contentType: 'article',
          tone: 'professional',
        },
      },

      uploadFile: {
        data: [
          { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 },
          { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
        ],
        metadata: {
          type: 'csv',
          rowCount: 3,
          columns: ['id', 'name', 'email', 'age'],
          fileId: 'file_123',
        },
      },

      database: {
        data: [
          { id: 1, user_id: 101, order_total: 150.50, status: 'completed' },
          { id: 2, user_id: 102, order_total: 75.25, status: 'pending' },
        ],
      },

      code: {
        data: [
          { original: 'test', processed: true, timestamp: '2024-01-01T00:00:00Z' },
        ],
      },

      filter: {
        data: [
          { id: 1, status: 'active', score: 85 },
          { id: 2, status: 'active', score: 92 },
        ],
      },

      aggregate: {
        data: {
          sum: 1250,
          average: 83.33,
          count: 15,
          min: 45,
          max: 98,
        },
      },

      webhook: {
        data: {
          event: 'user.created',
          timestamp: '2024-01-01T00:00:00Z',
          payload: {
            user_id: 123,
            email: 'user@example.com',
          },
        },
      },
    };

    return samples[nodeType] || {
      data: { result: 'Sample output', status: 'success' },
    };
  }

  // Capture actual response from execution
  captureResponse(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    response: any
  ) {
    const key = `${workflowId}:${nodeId}`;
    this.sampleResponses.set(key, {
      nodeId,
      nodeType,
      workflowId,
      response,
      capturedAt: new Date(),
    });

    this.logger.log(`Captured sample response for node ${nodeId}`);
  }

  // Get captured or generated sample response
  getSampleResponse(workflowId: string, nodeId: string, nodeType: string): any {
    const key = `${workflowId}:${nodeId}`;
    const captured = this.sampleResponses.get(key);

    if (captured) {
      this.logger.log(`Returning captured response for node ${nodeId}`);
      return captured.response;
    }

    this.logger.log(`Generating sample response for node type ${nodeType}`);
    return this.generateSampleResponse(nodeType);
  }

  // Clear old samples (cleanup)
  clearOldSamples(hoursOld: number = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursOld);

    for (const [key, sample] of this.sampleResponses.entries()) {
      if (sample.capturedAt < cutoff) {
        this.sampleResponses.delete(key);
      }
    }
  }

  // Extract variable paths from response
  extractVariablePaths(obj: any, prefix = '', maxDepth = 3): string[] {
    const paths: string[] = [];

    if (maxDepth <= 0) return paths;

    if (Array.isArray(obj)) {
      paths.push(`${prefix}[0]`);
      if (obj.length > 0) {
        const nestedPaths = this.extractVariablePaths(
          obj[0],
          `${prefix}[0]`,
          maxDepth - 1
        );
        paths.push(...nestedPaths);
      }
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);

        const nestedPaths = this.extractVariablePaths(
          obj[key],
          path,
          maxDepth - 1
        );
        paths.push(...nestedPaths);
      });
    }

    return paths;
  }

  // Get variable suggestions based on sample response
  getVariableSuggestions(
    workflowId: string,
    nodeId: string,
    nodeType: string
  ): Array<{ path: string; type: string; sample: any }> {
    const response = this.getSampleResponse(workflowId, nodeId, nodeType);
    const paths = this.extractVariablePaths(response);

    return paths.map((path) => {
      const value = this.getValueByPath(response, path);
      return {
        path: `{{$node.${nodeId}.${path}}}`,
        type: typeof value,
        sample: value,
      };
    });
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }
}
