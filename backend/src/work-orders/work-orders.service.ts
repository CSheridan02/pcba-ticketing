import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

type SerialRange = { start?: string; end?: string };

@Injectable()
export class WorkOrdersService {
  constructor(private supabaseService: SupabaseService) {}

  private extractMaxSerialEnd(serialRanges: unknown): string | null {
    if (!Array.isArray(serialRanges) || serialRanges.length === 0) return null;

    let best: { serial: string; num: number } | null = null;

    for (const r of serialRanges as SerialRange[]) {
      const end = (r?.end || '').toString().trim().toUpperCase();
      // Expected format: digits + single alpha suffix (commonly W)
      const m = end.match(/^(\d+)([A-Z])$/);
      if (!m) continue;
      const num = parseInt(m[1], 10);
      if (!Number.isFinite(num)) continue;

      if (!best || num > best.num) {
        best = { serial: end, num };
      }
    }

    return best?.serial ?? null;
  }

  async create(createWorkOrderDto: CreateWorkOrderDto, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, asm_number, description')
      .eq('id', createWorkOrderDto.board_id)
      .single();

    if (boardError || !board) {
      throw new NotFoundException('Board not found');
    }

    const { data, error } = await supabase
      .from('work_orders')
      .insert([{
        ...createWorkOrderDto,
        asm_number: board.asm_number,
        description: board.description,
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
        board:boards(id, asm_number, internal_g_number, description),
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
        board:boards(id, asm_number, internal_g_number, description),
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
        board:boards(id, asm_number, internal_g_number, description),
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

  /**
   * Returns the latest (most recently created) work order's highest serial range end
   * for a given board. Used for UI suggestions.
   */
  async getLatestSerialRangeEnd(boardId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('work_orders')
      .select('id, created_at, serial_ranges')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    for (const wo of data || []) {
      const latestEnd = this.extractMaxSerialEnd(wo.serial_ranges);
      if (latestEnd) {
        return {
          latest_end: latestEnd,
          work_order_id: wo.id,
          created_at: wo.created_at,
        };
      }
    }

    return { latest_end: null };
  }

  /**
   * Same as getLatestSerialRangeEnd(boardId) but supports fallback to global latest end
   * when a specific board has no serial history.
   */
  async getSerialSuggestion(boardId?: string) {
    if (boardId) {
      const boardScoped = await this.getLatestSerialRangeEnd(boardId);
      if (boardScoped.latest_end) {
        return { ...boardScoped, scope: 'board' as const };
      }
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, created_at, serial_ranges')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    for (const wo of data || []) {
      const latestEnd = this.extractMaxSerialEnd(wo.serial_ranges);
      if (latestEnd) {
        return {
          latest_end: latestEnd,
          work_order_id: wo.id,
          created_at: wo.created_at,
          scope: 'global' as const,
        };
      }
    }

    return { latest_end: null, scope: 'none' as const };
  }
}

