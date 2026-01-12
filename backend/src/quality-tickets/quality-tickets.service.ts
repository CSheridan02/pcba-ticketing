import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateQualityTicketDto } from './dto/create-quality-ticket.dto';
import { UpdateQualityTicketDto } from './dto/update-quality-ticket.dto';

@Injectable()
export class QualityTicketsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createDto: CreateQualityTicketDto, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: numberData, error: numberErr } = await supabase.rpc('generate_quality_ticket_number');
    if (numberErr) throw numberErr;
    const qualityTicketNumber = numberData;

    const { data, error } = await supabase
      .from('quality_tickets')
      .insert([{
        ...createDto,
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


