import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(
    private readonly credentialsService: CredentialsService,
  ) {}

  @Post()
  async create(@Body() createCredentialDto: any, @Request() req: any) {
    return this.credentialsService.create(
      createCredentialDto,
      req.user.userId,
    );
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.credentialsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.credentialsService.findById(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCredentialDto: any,
    @Request() req: any,
  ) {
    return this.credentialsService.update(
      id,
      updateCredentialDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.credentialsService.delete(id, req.user.userId);
  }
}