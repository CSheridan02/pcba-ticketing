import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QualityTicketsService } from './quality-tickets.service';
import { CreateQualityTicketDto } from './dto/create-quality-ticket.dto';
import { UpdateQualityTicketDto } from './dto/update-quality-ticket.dto';
import { CreateQualityTicketCommentDto } from './dto/create-quality-ticket-comment.dto';

@Controller('quality-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QualityTicketsController {
  private static readonly MAX_IMAGES_PER_UPLOAD = 50; // practical cap per request

  constructor(private qualityTicketsService: QualityTicketsService) {}

  @Post()
  @Roles('admin', 'quality')
  create(@Body() createDto: CreateQualityTicketDto, @Request() req) {
    return this.qualityTicketsService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(@Query('workOrderId') workOrderId?: string) {
    return this.qualityTicketsService.findAll(workOrderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.qualityTicketsService.findOne(id);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.qualityTicketsService.listComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: CreateQualityTicketCommentDto, @Request() req) {
    return this.qualityTicketsService.addComment(id, body.comment, req.user.userId);
  }

  @Patch(':id')
  @Roles('admin', 'quality')
  update(@Param('id') id: string, @Body() updateDto: UpdateQualityTicketDto, @Request() req) {
    return this.qualityTicketsService.update(id, updateDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @Roles('admin', 'quality')
  remove(@Param('id') id: string, @Request() req) {
    return this.qualityTicketsService.remove(id, req.user.userId, req.user.role);
  }

  @Post('upload')
  @Roles('admin', 'quality')
  @UseInterceptors(FilesInterceptor('images', QualityTicketsController.MAX_IMAGES_PER_UPLOAD))
  async uploadImages(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
      }
      if (file.size > maxSize) {
        throw new BadRequestException(`File too large: ${file.originalname}`);
      }
    }

    return this.qualityTicketsService.uploadImages(files, req.user.userId);
  }
}


