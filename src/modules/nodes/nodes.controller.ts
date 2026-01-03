import { Controller, Get, Param } from '@nestjs/common';
import { NodesService } from './nodes.service';

@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  getAllNodes() {
    return this.nodesService.getAllNodes();
  }

  @Get('categories')
  getCategories() {
    return this.nodesService.getCategories();
  }

  @Get('category/:category')
  getNodesByCategory(@Param('category') category: string) {
    return this.nodesService.getNodesByCategory(category);
  }

  @Get(':id')
  getNodeById(@Param('id') id: string) {
    return this.nodesService.getNodeById(id);
  }
}
