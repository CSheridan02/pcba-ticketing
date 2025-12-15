import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createTicketDto: CreateTicketDto, userId: string) {
    const supabase = this.supabaseService.getClient();
    
    // Generate ticket number
    const { data: numberData } = await supabase.rpc('generate_ticket_number');
    const ticketNumber = numberData;

    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        ...createTicketDto,
        ticket_number: ticketNumber,
        submitted_by: userId,
      }])
      .select(`
        *,
        area:areas(id, name),
        submitted_by_user:users!tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(workOrderId?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('tickets')
      .select(`
        *,
        area:areas(id, name),
        submitted_by_user:users!tickets_submitted_by_fkey(id, full_name),
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
      .from('tickets')
      .select(`
        *,
        area:areas(id, name),
        submitted_by_user:users!tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Ticket not found');
    return data;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, userId: string, userRole: string) {
    const supabase = this.supabaseService.getClient();
    
    // Admins can edit any ticket, operators can only edit their own
    if (userRole !== 'admin') {
      // First, check if the ticket exists and get the owner
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('submitted_by')
        .eq('id', id)
        .single();

      if (fetchError) throw new NotFoundException('Ticket not found');
      
      // Check if the user is the owner of the ticket
      if (ticket.submitted_by !== userId) {
        throw new ForbiddenException('You can only edit your own tickets');
      }
    }

    // Proceed with update (admins skip ownership check)
    const { data, error } = await supabase
      .from('tickets')
      .update(updateTicketDto)
      .eq('id', id)
      .select(`
        *,
        area:areas(id, name),
        submitted_by_user:users!tickets_submitted_by_fkey(id, full_name),
        work_order:work_orders(id, work_order_number)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string, userId: string, userRole: string) {
    const supabase = this.supabaseService.getClient();
    
    // Admins can delete any ticket, operators can only delete their own
    if (userRole !== 'admin') {
      // First, check if the ticket exists and get the owner
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('submitted_by')
        .eq('id', id)
        .single();

      if (fetchError) throw new NotFoundException('Ticket not found');
      
      // Check if the user is the owner of the ticket
      if (ticket.submitted_by !== userId) {
        throw new ForbiddenException('You can only delete your own tickets');
      }
    }

    // Proceed with delete (admins skip ownership check)
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Ticket deleted successfully' };
  }

  async uploadImages(files: Array<Express.Multer.File>, userId: string) {
    const supabase = this.supabaseService.getClient();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Create unique filename with user ID and timestamp
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ticket-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return { urls: uploadedUrls };
  }
}

