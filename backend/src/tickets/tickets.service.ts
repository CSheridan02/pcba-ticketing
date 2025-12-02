import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: string, updateTicketDto: UpdateTicketDto) {
    const supabase = this.supabaseService.getClient();
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

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Ticket deleted successfully' };
  }
}

