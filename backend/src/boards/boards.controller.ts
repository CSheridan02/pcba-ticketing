import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CreateBoardCycleTimeDto } from './dto/create-board-cycle-time.dto';
import { UpdateBoardCycleTimeDto } from './dto/update-board-cycle-time.dto';
import { CreateBoardAlertDto } from './dto/create-board-alert.dto';
import { UpdateBoardAlertDto } from './dto/update-board-alert.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.boardsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createBoardDto: CreateBoardDto) {
    return this.boardsService.create(createBoardDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto) {
    return this.boardsService.update(id, updateBoardDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.boardsService.remove(id);
  }

  @Post(':id/cycle-times')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addCycleTime(@Param('id') id: string, @Body() dto: CreateBoardCycleTimeDto) {
    return this.boardsService.addCycleTime(id, dto);
  }

  @Patch('cycle-times/:cycleTimeId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateCycleTime(@Param('cycleTimeId') cycleTimeId: string, @Body() dto: UpdateBoardCycleTimeDto) {
    return this.boardsService.updateCycleTime(cycleTimeId, dto);
  }

  @Delete('cycle-times/:cycleTimeId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeCycleTime(@Param('cycleTimeId') cycleTimeId: string) {
    return this.boardsService.removeCycleTime(cycleTimeId);
  }

  @Post(':id/alerts')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addAlert(@Param('id') id: string, @Body() dto: CreateBoardAlertDto) {
    return this.boardsService.addAlert(id, dto);
  }

  @Patch('alerts/:alertId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateAlert(@Param('alertId') alertId: string, @Body() dto: UpdateBoardAlertDto) {
    return this.boardsService.updateAlert(alertId, dto);
  }

  @Delete('alerts/:alertId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeAlert(@Param('alertId') alertId: string) {
    return this.boardsService.removeAlert(alertId);
  }

  @Post('upload-reference')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image'))
  async uploadReferenceImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
    }
    if (file.size > maxSize) {
      throw new BadRequestException(`File too large: ${file.originalname}`);
    }

    return this.boardsService.uploadReferenceImage(file, req.user.id);
  }
}




