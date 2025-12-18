import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createWorkOrderDto: CreateWorkOrderDto, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('work_orders')
      .insert([{
        ...createWorkOrderDto,
        created_by: userId,
      }])
      .select(`
        *,
        created_by_user:users!work_orders_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(search?: string, status?: string, sortBy?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        created_by_user:users!work_orders_created_by_fkey(id, full_name),
        tickets(count)
      `);

    // Apply search filter
    if (search) {
      query = query.or(`work_order_number.ilike.%${search}%,asm_number.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    if (sortBy === 'serial_number') {
      // Sort by first serial range start (nulls last), then by created_at
      // Note: JSONB sorting is more complex, we'll sort by created_at for now
      // Can be enhanced later if needed
      query = query.order('created_at', { ascending: false });
    } else {
      // Default: sort by created_at descending
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        created_by_user:users!work_orders_created_by_fkey(id, full_name),
        tickets(
          *,
          area:areas(id, name),
          submitted_by_user:users!tickets_submitted_by_fkey(id, full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Work order not found');
    return data;
  }

  async update(id: string, updateWorkOrderDto: UpdateWorkOrderDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .update(updateWorkOrderDto)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!work_orders_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Work order deleted successfully' };
  }

  async getActiveWorkOrders() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Sort by latest serial number in ranges (client-side for JSONB complexity)
    if (data) {
      data.sort((a, b) => {
        const aRanges = a.serial_ranges || [];
        const bRanges = b.serial_ranges || [];
        
        if (aRanges.length === 0 && bRanges.length === 0) return 0;
        if (aRanges.length === 0) return 1;  // a goes after b
        if (bRanges.length === 0) return -1; // a goes before b
        
        // Get the last (highest) end serial from each
        const aLastEnd = aRanges[aRanges.length - 1]?.end || '';
        const bLastEnd = bRanges[bRanges.length - 1]?.end || '';
        
        const aNum = parseInt(aLastEnd.replace('W', '')) || 0;
        const bNum = parseInt(bLastEnd.replace('W', '')) || 0;
        
        return bNum - aNum; // Descending order (highest first)
      });
    }
    
    return data;
  }
}

