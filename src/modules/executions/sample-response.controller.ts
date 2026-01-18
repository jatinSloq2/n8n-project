import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SampleResponseService } from './sample-response.service';

@Controller('sample-responses')
@UseGuards(JwtAuthGuard)
export class SampleResponseController {
  constructor(private readonly sampleResponseService: SampleResponseService) {}

  @Get('generate/:nodeType')
  generateSample(@Param('nodeType') nodeType: string) {
    return this.sampleResponseService.generateSampleResponse(nodeType);
  }

  @Get(':workflowId/:nodeId')
  getSample(
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Param('nodeType') nodeType: string
  ) {
    return this.sampleResponseService.getSampleResponse(
      workflowId,
      nodeId,
      nodeType
    );
  }

  @Get('suggestions/:workflowId/:nodeId/:nodeType')
  getSuggestions(
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Param('nodeType') nodeType: string
  ) {
    return this.sampleResponseService.getVariableSuggestions(
      workflowId,
      nodeId,
      nodeType
    );
  }

  @Post('capture')
  captureResponse(
    @Body()
    data: {
      workflowId: string;
      nodeId: string;
      nodeType: string;
      response: any;
    }
  ) {
    this.sampleResponseService.captureResponse(
      data.workflowId,
      data.nodeId,
      data.nodeType,
      data.response
    );
    return { message: 'Sample response captured' };
  }
}