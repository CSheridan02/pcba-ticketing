import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { DeleteWorkOrderAlertsDto } from './dto/delete-work-order-alerts.dto';
import { CopyWorkOrderAlertsDto } from './dto/copy-work-order-alerts.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { UpdateWorkOrderQualityResultDto } from './dto/update-work-order-quality-result.dto';
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
    return this.workOrdersService.create(createWorkOrderDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Request() req?: any,
  ) {
    return this.workOrdersService.findAll(search, status, sortBy, req?.user?.role);
  }

  @Get('active')
  getActiveWorkOrders(@Request() req) {
    return this.workOrdersService.getActiveWorkOrders(req?.user?.role);
  }

  @Get('serial-suggestion')
  getSerialSuggestion(@Query('board_id') boardId?: string) {
    return this.workOrdersService.getSerialSuggestion(boardId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.workOrdersService.findOne(id, req?.user?.role);
  }

  @Post(':id/alerts/sync')
  @Roles('admin')
  syncAlertsFromBoard(@Param('id') id: string) {
    return this.workOrdersService.syncAlertsFromBoard(id);
  }

  @Post(':id/alerts/copy')
  @Roles('admin')
  copySelectedAlertsFromBoard(@Param('id') id: string, @Body() body: CopyWorkOrderAlertsDto) {
    return this.workOrdersService.copySelectedBoardAlerts(id, body?.board_alert_ids || []);
  }

  @Get(':id/alerts')
  listAlerts(@Param('id') id: string) {
    return this.workOrdersService.listAlerts(id);
  }

  @Post(':id/alerts/delete')
  @Roles('admin')
  deleteAlerts(@Param('id') id: string, @Body() body: DeleteWorkOrderAlertsDto) {
    return this.workOrdersService.deleteAlerts(id, body?.ids);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateWorkOrderDto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(id, updateWorkOrderDto);
  }

  @Patch(':id/status')
  @Roles('admin', 'quality')
  updateStatus(@Param('id') id: string, @Body() body: UpdateWorkOrderStatusDto, @Request() req) {
    return this.workOrdersService.updateStatus(
      id,
      body.status,
      req?.user?.role,
      req?.user?.userId ?? req?.user?.id ?? null,
    );
  }

  @Patch(':id/quality-result')
  @Roles('admin', 'quality')
  updateQualityResult(@Param('id') id: string, @Body() body: UpdateWorkOrderQualityResultDto, @Request() req) {
    return this.workOrdersService.updateQualityResult(
      id,
      body.quality_result,
      req?.user?.role,
      req?.user?.userId ?? req?.user?.id ?? null,
    );
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.workOrdersService.remove(id);
  }
}

