import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

type SerialRange = { start?: string; end?: string };

@Injectable()
export class WorkOrdersService {
  constructor(private supabaseService: SupabaseService) {}

  private readonly QUALITY_VISIBLE_STATUSES = [
    'Production Done',
    'Quality Received',
    'Quality Done',
    'Completed',
  ] as const;

  private parseSerial(serial: unknown): { serial: string; num: number; suffix: string } | null {
    const s = (serial || '').toString().trim().toUpperCase();
    // Expected format: digits + single alpha suffix (commonly W)
    const m = s.match(/^(\d+)([A-Z])$/);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (!Number.isFinite(num)) return null;
    return { serial: s, num, suffix: m[2] };
  }

  private extractMaxSerialEndFromRanges(serialRanges: unknown): { serial: string; num: number } | null {
    if (!Array.isArray(serialRanges) || serialRanges.length === 0) return null;

    let best: { serial: string; num: number } | null = null;
    for (const r of serialRanges as SerialRange[]) {
      const parsed = this.parseSerial((r as any)?.end);
      if (!parsed) continue;
      if (!best || parsed.num > best.num) {
        best = { serial: parsed.serial, num: parsed.num };
      }
    }
    return best;
  }

  private extractMaxSerialEndFromWorkOrder(wo: any): string | null {
    const bestFromRanges = this.extractMaxSerialEndFromRanges(wo?.serial_ranges);
    const bestFromExtras = wo?.extra_label_range?.end ? this.parseSerial(wo.extra_label_range.end) : null;

    const candidates: Array<{ serial: string; num: number }> = [];
    if (bestFromRanges) candidates.push(bestFromRanges);
    if (bestFromExtras) candidates.push({ serial: bestFromExtras.serial, num: bestFromExtras.num });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.num - a.num);
    return candidates[0].serial;
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

    const { data: boardAlerts, error: boardAlertsError } = await supabase
      .from('board_alerts')
      .select('id, content, created_at')
      .eq('board_id', createWorkOrderDto.board_id)
      .order('created_at', { ascending: true });

    if (boardAlertsError) throw boardAlertsError;

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

    // Copy board alerts to the new work order as a snapshot
    if ((boardAlerts?.length || 0) > 0) {
      const payload = (boardAlerts || []).map((a: any) => ({
        work_order_id: data.id,
        board_alert_id: a.id,
        content: a.content,
      }));

      const { error: insertAlertsError } = await supabase.from('work_order_alerts').insert(payload);
      if (insertAlertsError) {
        // Try to keep data consistent: remove the work order if we couldn't copy alerts.
        await supabase.from('work_orders').delete().eq('id', data.id);
        throw insertAlertsError;
      }
    }

    // Return a consistent shape including alerts
    return this.findOne(data.id);
  }

  /**
   * Sync board alerts onto an existing work order.
   * This is useful for older work orders created before board alerts existed.
   * Current behavior: replace any existing work_order_alerts with the board's current alerts.
   */
  async syncAlertsFromBoard(workOrderId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id, board_id')
      .eq('id', workOrderId)
      .single();

    if (woErr || !wo) throw new NotFoundException('Work order not found');

    const { data: boardAlerts, error: boardAlertsError } = await supabase
      .from('board_alerts')
      .select('id, content, created_at')
      .eq('board_id', wo.board_id)
      .order('created_at', { ascending: true });

    if (boardAlertsError) throw boardAlertsError;

    // Clear existing alerts for idempotency
    const { error: deleteErr } = await supabase
      .from('work_order_alerts')
      .delete()
      .eq('work_order_id', workOrderId);
    if (deleteErr) throw deleteErr;

    const payload = (boardAlerts || []).map((a: any) => ({
      work_order_id: workOrderId,
      board_alert_id: a.id,
      content: a.content,
    }));

    if (payload.length > 0) {
      const { error: insertErr } = await supabase.from('work_order_alerts').insert(payload);
      if (insertErr) throw insertErr;
    }

    return { inserted: payload.length };
  }

  async listAlerts(workOrderId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .single();
    if (woErr || !wo) throw new NotFoundException('Work order not found');

    const { data, error } = await supabase
      .from('work_order_alerts')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deleteAlerts(workOrderId: string, ids?: string[]) {
    const supabase = this.supabaseService.getClient();

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .single();
    if (woErr || !wo) throw new NotFoundException('Work order not found');

    let q = supabase.from('work_order_alerts').delete().eq('work_order_id', workOrderId);
    if (ids && ids.length > 0) {
      q = q.in('id', ids);
    }

    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  }

  /**
   * Copy selected board alerts onto a work order (append-style, idempotent per board_alert_id).
   * - Only board alerts belonging to the work order's board_id are allowed.
   * - If an alert from that board was already copied, we replace that copied row (delete+insert) to keep content in sync.
   */
  async copySelectedBoardAlerts(workOrderId: string, boardAlertIds: string[]) {
    const supabase = this.supabaseService.getClient();

    const ids = (boardAlertIds || []).map((x) => String(x)).filter(Boolean);
    if (ids.length === 0) return { inserted: 0 };

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id, board_id')
      .eq('id', workOrderId)
      .single();
    if (woErr || !wo) throw new NotFoundException('Work order not found');

    const { data: boardAlerts, error: boardAlertsError } = await supabase
      .from('board_alerts')
      .select('id, content, created_at, board_id')
      .eq('board_id', wo.board_id)
      .in('id', ids)
      .order('created_at', { ascending: true });
    if (boardAlertsError) throw boardAlertsError;

    const selected = boardAlerts || [];
    if (selected.length === 0) return { inserted: 0 };

    // Remove existing copies for these board_alert_ids to avoid duplicates and to refresh content.
    const { error: deleteErr } = await supabase
      .from('work_order_alerts')
      .delete()
      .eq('work_order_id', workOrderId)
      .in('board_alert_id', selected.map((a: any) => a.id));
    if (deleteErr) throw deleteErr;

    const payload = selected.map((a: any) => ({
      work_order_id: workOrderId,
      board_alert_id: a.id,
      content: a.content,
    }));

    const { error: insertErr } = await supabase.from('work_order_alerts').insert(payload);
    if (insertErr) throw insertErr;

    return { inserted: payload.length };
  }

  async findAll(search?: string, status?: string, sortBy?: string, userRole?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        board:boards(id, asm_number, internal_g_number, description),
        created_by_user:users!work_orders_created_by_fkey(id, full_name),
        tickets(count),
        quality_tickets(count)
      `);

    // Apply search filter
    if (search) {
      query = query.or(`work_order_number.ilike.%${search}%,asm_number.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Gate Quality visibility to post-production statuses
    if (userRole === 'quality') {
      query = query.in('status', [...this.QUALITY_VISIBLE_STATUSES]);
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

  async findOne(id: string, userRole?: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        board:boards(id, asm_number, internal_g_number, description, reference_image_url),
        created_by_user:users!work_orders_created_by_fkey(id, full_name),
        alerts:work_order_alerts(*),
        tickets(
          *,
          area:areas(id, name),
          submitted_by_user:users!tickets_submitted_by_fkey(id, full_name)
        ),
        quality_tickets(
          *,
          submitted_by_user:users!quality_tickets_submitted_by_fkey(id, full_name)
        )
      `)
      .order('created_at', { ascending: true, foreignTable: 'work_order_alerts' })
      .order('created_at', { ascending: false, foreignTable: 'tickets' })
      .order('created_at', { ascending: false, foreignTable: 'quality_tickets' })
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Work order not found');

    // Gate Quality visibility to post-production statuses
    if (userRole === 'quality' && !this.QUALITY_VISIBLE_STATUSES.includes(data.status)) {
      throw new NotFoundException('Work order not found');
    }

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

  async updateStatus(id: string, status: string, userRole?: string) {
    // Restrict Quality to post-production statuses only
    if (userRole === 'quality' && !this.QUALITY_VISIBLE_STATUSES.includes(status as any)) {
      throw new ForbiddenException('Quality can only set post-production statuses');
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .update({ status })
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

  async updateQualityResult(id: string, quality_result: string, _userRole?: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .update({ quality_result })
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

  async getActiveWorkOrders(userRole?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Existing behavior: active list is for in-production. For Quality, show only post-production.
    if (userRole === 'quality') {
      query = query.in('status', [...this.QUALITY_VISIBLE_STATUSES]);
    } else {
      query = query.eq('status', 'Active');
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Sort by latest serial number in ranges (client-side for JSONB complexity)
    if (data) {
      data.sort((a, b) => {
        const aEnd = this.extractMaxSerialEndFromWorkOrder(a) || '';
        const bEnd = this.extractMaxSerialEndFromWorkOrder(b) || '';

        const aParsed = this.parseSerial(aEnd);
        const bParsed = this.parseSerial(bEnd);

        if (!aParsed && !bParsed) return 0;
        if (!aParsed) return 1;
        if (!bParsed) return -1;

        return bParsed.num - aParsed.num; // Descending order (highest first)
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
      .select('id, created_at, serial_ranges, has_extra_labels, extra_label_range')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    for (const wo of data || []) {
      const latestEnd = this.extractMaxSerialEndFromWorkOrder(wo);
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
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, created_at, serial_ranges, has_extra_labels, extra_label_range')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    for (const wo of data || []) {
      const latestEnd = this.extractMaxSerialEndFromWorkOrder(wo);
      if (latestEnd) {
        return {
          latest_end: latestEnd,
          work_order_id: wo.id,
          created_at: wo.created_at,
          scope: 'global' as const,
        };
      }
    }

    // If we couldn't find any serial history, return null.
    // Note: boardId is ignored intentionally because serials are global.
    return { latest_end: null, scope: 'none' as const };
  }
}

