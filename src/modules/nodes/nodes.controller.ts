const { Controller, Get, Param } = require('@nestjs/common');
const { NodesService } = require('./nodes.service');

@Controller('nodes')
class NodesController {
  constructor(nodesService) {
    this.nodesService = nodesService;
  }

  @Get()
  getAllNodes() {
    return this.nodesService.getAllNodes();
  }

  @Get('categories')
  getCategories() {
    return this.nodesService.getCategories();
  }

  @Get('category/:category')
  getNodesByCategory(@Param('category') category) {
    return this.nodesService.getNodesByCategory(category);
  }

  @Get(':id')
  getNodeById(@Param('id') id) {
    return this.nodesService.getNodeById(id);
  }
}

module.exports = { NodesController };