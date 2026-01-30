import { Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private getUserId(req: any): string {
    return req?.user?.userId ?? req?.user?.id;
  }

  @Get()
  list(@Request() req: any, @Query('unreadOnly') unreadOnly?: string, @Query('limit') limit?: string) {
    const userId = this.getUserId(req);
    return this.notificationsService.listForUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Request() req: any) {
    const userId = this.getUserId(req);
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.notificationsService.markAllRead(userId);
  }
}


