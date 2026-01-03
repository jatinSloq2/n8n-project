const { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } = require('@nestjs/common');
const { UsersService } = require('./users.service');
const { JwtAuthGuard } = require('../auth/guards/jwt-auth.guard');

@Controller('users')
@UseGuards(JwtAuthGuard)
class UsersController {
  constructor(usersService) {
    this.usersService = usersService;
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id, @Body() updateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async delete(@Param('id') id) {
    return this.usersService.delete(id);
  }
}

module.exports = { UsersController };