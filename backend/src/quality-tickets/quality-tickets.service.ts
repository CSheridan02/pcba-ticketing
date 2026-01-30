import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateQualityTicketDto } from './dto/create-quality-ticket.dto';
import { UpdateQualityTicketDto } from './dto/update-quality-ticket.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QualityTicketsService {
  constructor(
    private supabaseService: SupabaseService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateQualityTicketDto, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: numberData, error: numberErr } = await supabase.rpc('generate_quality_ticket_number');
    if (numberErr) throw numberErr;
    const qualityTicketNumber = numberData;

    const status = (createDto as any)?.status || 'Rework Needed';

    const { data, error } = await supabase
      .from('quality_tickets')
      .insert([{
        ...createDto,
        status,
        quality_ticket_number: qualityTicketNumber,
        submitted_by: userId,
      }])
      .select(`
        *,
        submitted_by_user:users!quality_tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .single();

    if (error) throw error;

    await this.notificationsService.emit({
      eventType: 'quality_ticket.created',
      entityType: 'quality_ticket',
      entityId: data.id,
      actorId: userId,
      payload: {
        quality_ticket_id: data.id,
        work_order_id: data.work_order_id ?? null,
        quality_ticket_number: data.quality_ticket_number ?? null,
        status: data.status ?? null,
      },
    });

    return data;
  }

  async findAll(workOrderId?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('quality_tickets')
      .select(`
        *,
        submitted_by_user:users!quality_tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .order('created_at', { ascending: false });

    if (workOrderId) {
      query = query.eq('work_order_id', workOrderId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('quality_tickets')
      .select(`
        *,
        submitted_by_user:users!quality_tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Quality ticket not found');
    return data;
  }

  async update(id: string, updateDto: UpdateQualityTicketDto, userId: string, userRole: string) {
    const supabase = this.supabaseService.getClient();

    // Admins can edit any, quality can only edit own
    if (userRole !== 'admin') {
      const { data: ticket, error: fetchError } = await supabase
        .from('quality_tickets')
        .select('submitted_by')
        .eq('id', id)
        .single();

      if (fetchError) throw new NotFoundException('Quality ticket not found');
      if (ticket.submitted_by !== userId) {
        throw new ForbiddenException('You can only edit your own quality tickets');
      }
    }

    const { data: before } = await supabase
      .from('quality_tickets')
      .select('id, status, work_order_id, quality_ticket_number')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('quality_tickets')
      .update(updateDto)
      .eq('id', id)
      .select(`
        *,
        submitted_by_user:users!quality_tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .single();

    if (error) throw error;

    if ((updateDto as any)?.status && before?.status !== (data as any)?.status) {
      await this.notificationsService.emit({
        eventType: 'quality_ticket.status_changed',
        entityType: 'quality_ticket',
        entityId: data.id,
        actorId: userId,
        payload: {
          quality_ticket_id: data.id,
          work_order_id: data.work_order_id ?? null,
          quality_ticket_number: (data as any)?.quality_ticket_number ?? null,
          from: before?.status ?? null,
          to: (data as any)?.status ?? null,
        },
      });
    }

    return data;
  }

  async remove(id: string, userId: string, userRole: string) {
    const supabase = this.supabaseService.getClient();

    // Admins can delete any, quality can only delete own
    if (userRole !== 'admin') {
      const { data: ticket, error: fetchError } = await supabase
        .from('quality_tickets')
        .select('submitted_by')
        .eq('id', id)
        .single();

      if (fetchError) throw new NotFoundException('Quality ticket not found');
      if (ticket.submitted_by !== userId) {
        throw new ForbiddenException('You can only delete your own quality tickets');
      }
    }

    const { error } = await supabase
      .from('quality_tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Quality ticket deleted successfully' };
  }

  async listComments(qualityTicketId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: ticket, error: ticketErr } = await supabase
      .from('quality_tickets')
      .select('id')
      .eq('id', qualityTicketId)
      .single();

    if (ticketErr || !ticket) throw new NotFoundException('Quality ticket not found');

    const { data, error } = await supabase
      .from('quality_ticket_comments')
      .select(`
        *,
        user:users!quality_ticket_comments_user_id_fkey(id, full_name)
      `)
      .eq('quality_ticket_id', qualityTicketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async addComment(qualityTicketId: string, comment: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: ticket, error: ticketErr } = await supabase
      .from('quality_tickets')
      .select('id')
      .eq('id', qualityTicketId)
      .single();

    if (ticketErr || !ticket) throw new NotFoundException('Quality ticket not found');

    const { data, error } = await supabase
      .from('quality_ticket_comments')
      .insert([{
        quality_ticket_id: qualityTicketId,
        user_id: userId,
        comment,
      }])
      .select(`
        *,
        user:users!quality_ticket_comments_user_id_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;

    const { data: parent } = await supabase
      .from('quality_tickets')
      .select('id, work_order_id, quality_ticket_number')
      .eq('id', qualityTicketId)
      .single();

    await this.notificationsService.emit({
      eventType: 'quality_ticket.comment_added',
      entityType: 'quality_ticket',
      entityId: qualityTicketId,
      actorId: userId,
      payload: {
        quality_ticket_id: qualityTicketId,
        work_order_id: parent?.work_order_id ?? null,
        quality_ticket_number: parent?.quality_ticket_number ?? null,
        comment_id: data.id,
      },
    });

    return data;
  }

  async listReviewRequests(qualityTicketId: string, status?: 'Pending' | 'Reviewed') {
    const supabase = this.supabaseService.getClient();

    // Validate ticket exists (keeps error shape consistent)
    const { data: ticket, error: ticketErr } = await supabase
      .from('quality_tickets')
      .select('id')
      .eq('id', qualityTicketId)
      .single();
    if (ticketErr || !ticket) throw new NotFoundException('Quality ticket not found');

    let q = supabase
      .from('quality_ticket_review_requests')
      .select(`
        *,
        requested_by_user:users!quality_ticket_review_requests_requested_by_fkey(id, full_name),
        reviewed_by_user:users!quality_ticket_review_requests_reviewed_by_fkey(id, full_name)
      `)
      .eq('quality_ticket_id', qualityTicketId)
      .order('requested_at', { ascending: false });

    if (status) {
      q = q.eq('status', status);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async requestQualityReview(qualityTicketId: string, serialNumberRaw: string, requestedBy: string, reworkNotesRaw?: string) {
    const supabase = this.supabaseService.getClient();
    const serial_number = (serialNumberRaw || '').toString().trim().toUpperCase();
    if (!serial_number) throw new BadRequestException('serial_number is required');
    if (!requestedBy) throw new BadRequestException('requested_by is required');
    const rework_notes = (reworkNotesRaw || '').toString().trim() || null;

    const { data: ticket, error: ticketErr } = await supabase
      .from('quality_tickets')
      .select('id, serial_numbers, work_order_id')
      .eq('id', qualityTicketId)
      .single();
    if (ticketErr || !ticket) throw new NotFoundException('Quality ticket not found');

    // Only allow rework workflow when the work order actually failed Quality.
    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id, quality_result')
      .eq('id', ticket.work_order_id)
      .single();
    if (woErr || !wo) throw new NotFoundException('Work order not found');
    if (wo.quality_result !== 'Fail') {
      throw new BadRequestException('Cannot request review unless the work order Quality Result is Fail');
    }

    const serials = Array.isArray(ticket.serial_numbers) ? ticket.serial_numbers.map((s: any) => String(s).trim().toUpperCase()) : [];
    if (!serials.includes(serial_number)) {
      throw new BadRequestException('Serial number is not part of this quality ticket');
    }

    const payload = {
      quality_ticket_id: qualityTicketId,
      serial_number,
      requested_by: requestedBy,
      rework_notes,
      rework_completed_at: new Date().toISOString(),
      status: 'Pending',
      requested_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('quality_ticket_review_requests')
      .insert([payload])
      .select(`
        *,
        requested_by_user:users!quality_ticket_review_requests_requested_by_fkey(id, full_name),
        reviewed_by_user:users!quality_ticket_review_requests_reviewed_by_fkey(id, full_name)
      `)
      .single();

    // If there's already a pending request for this serial, refresh it (idempotent UX).
    if (insertErr && (insertErr as any).code === '23505') {
      const { data: updated, error: updateErr } = await supabase
        .from('quality_ticket_review_requests')
        .update({
          requested_by: requestedBy,
          requested_at: new Date().toISOString(),
          rework_notes,
          rework_completed_at: new Date().toISOString(),
        })
        .eq('quality_ticket_id', qualityTicketId)
        .eq('serial_number', serial_number)
        .eq('status', 'Pending')
        .select(`
          *,
          requested_by_user:users!quality_ticket_review_requests_requested_by_fkey(id, full_name),
          reviewed_by_user:users!quality_ticket_review_requests_reviewed_by_fkey(id, full_name)
        `)
        .single();

      if (updateErr) throw updateErr;
      return updated;
    }

    if (insertErr) throw insertErr;

    await this.notificationsService.emit({
      eventType: 'rework.review_requested',
      entityType: 'quality_ticket',
      entityId: qualityTicketId,
      actorId: requestedBy,
      payload: {
        quality_ticket_id: qualityTicketId,
        work_order_id: ticket.work_order_id ?? null,
        serial_number,
        rework_notes,
        request_id: inserted?.id ?? null,
      },
    });

    return inserted;
  }

  async markReviewRequestReviewed(requestId: string, reviewedBy: string, outcome: 'Pass' | 'Fail', reviewNotesRaw?: string) {
    const supabase = this.supabaseService.getClient();
    const review_notes = (reviewNotesRaw || '').toString().trim() || null;

    const { data, error } = await supabase
      .from('quality_ticket_review_requests')
      .update({
        status: 'Reviewed',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_outcome: outcome,
        review_notes,
      })
      .eq('id', requestId)
      .select(`
        *,
        requested_by_user:users!quality_ticket_review_requests_requested_by_fkey(id, full_name),
        reviewed_by_user:users!quality_ticket_review_requests_reviewed_by_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;

    await this.notificationsService.emit({
      eventType: 'quality.reviewed',
      entityType: 'review_request',
      entityId: requestId,
      actorId: reviewedBy,
      payload: {
        request_id: requestId,
        quality_ticket_id: (data as any)?.quality_ticket_id ?? null,
        serial_number: (data as any)?.serial_number ?? null,
        review_outcome: (data as any)?.review_outcome ?? null,
        review_notes: (data as any)?.review_notes ?? null,
      },
    });

    return data;
  }

  async uploadImages(files: Array<Express.Multer.File>, userId: string) {
    const supabase = this.supabaseService.getClient();
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await Promise.race([
          supabase.storage
            .from('ticket-images')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false,
            }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout')), 60000),
          ),
        ]);

        if (error) {
          // Supabase storage error
          errors.push(`${file.originalname}: ${error.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (err: any) {
        errors.push(`${file.originalname}: ${err?.message || 'Unknown error'}`);
      }
    }

    if (uploadedUrls.length > 0) {
      return {
        urls: uploadedUrls,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 ? `${uploadedUrls.length} of ${files.length} files uploaded successfully` : undefined,
      };
    }

    if (errors.length > 0) {
      throw new Error(`Failed to upload images: ${errors.join('; ')}`);
    }

    throw new Error('Failed to upload images');
  }
}




