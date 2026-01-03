import { Injectable, NotFoundException } from '@nestjs/common';

export interface WorkflowNode {
  id: string;
  name: string;
  category: string;
  description: string;
  version: number;
}

@Injectable()
export class NodesService {
  /**
   * Node registry (static for now, extensible later)
   */
  private readonly nodes: WorkflowNode[] = [
    {
      id: 'http-request',
      name: 'HTTP Request',
      category: 'core',
      description: 'Make HTTP requests to external APIs',
      version: 1,
    },
    {
      id: 'delay',
      name: 'Delay',
      category: 'core',
      description: 'Delay workflow execution',
      version: 1,
    },
    {
      id: 'webhook',
      name: 'Webhook',
      category: 'trigger',
      description: 'Trigger workflow via webhook',
      version: 1,
    },
  ];

  /**
   * Get all nodes
   */
  getAllNodes(): WorkflowNode[] {
    return this.nodes;
  }

  /**
   * Get unique node categories
   */
  getCategories(): string[] {
    return [...new Set(this.nodes.map((node) => node.category))];
  }

  /**
   * Get nodes by category
   */
  getNodesByCategory(category: string): WorkflowNode[] {
    return this.nodes.filter(
      (node) => node.category === category,
    );
  }

  /**
   * Get node by ID
   */
  getNodeById(id: string): WorkflowNode {
    const node = this.nodes.find((node) => node.id === id);

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }
}
