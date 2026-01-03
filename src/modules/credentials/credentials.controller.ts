const { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } = require('@nestjs/common');
const { CredentialsService } = require('./credentials.service');
const { JwtAuthGuard } = require('../auth/guards/jwt-auth.guard');

@Controller('credentials')
@UseGuards(JwtAuthGuard)
class CredentialsController {
  constructor(credentialsService) {
    this.credentialsService = credentialsService;
  }

  @Post()
  async create(@Body() createCredentialDto, @Request() req) {
    return this.credentialsService.create(createCredentialDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.credentialsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id, @Request() req) {
    return this.credentialsService.findById(id, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id, @Body() updateCredentialDto, @Request() req) {
    return this.credentialsService.update(id, updateCredentialDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id, @Request() req) {
    return this.credentialsService.delete(id, req.user.userId);
  }
}

module.exports = { CredentialsController };