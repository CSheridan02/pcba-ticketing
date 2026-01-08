import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Post()
  @Roles('admin')
  create(@Body() createWorkOrderDto: CreateWorkOrderDto, @Request() req) {
    return this.workOrdersService.create(createWorkOrderDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.workOrdersService.findAll(search, status, sortBy);
  }

  @Get('active')
  getActiveWorkOrders() {
    return this.workOrdersService.getActiveWorkOrders();
  }

  @Get('serial-suggestion')
  getSerialSuggestion(@Query('board_id') boardId?: string) {
    if (!boardId) {
      return { latest_end: null };
    }
    return this.workOrdersService.getLatestSerialRangeEnd(boardId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateWorkOrderDto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(id, updateWorkOrderDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.workOrdersService.remove(id);
  }
}

