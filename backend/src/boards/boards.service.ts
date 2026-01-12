import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CreateBoardCycleTimeDto } from './dto/create-board-cycle-time.dto';
import { UpdateBoardCycleTimeDto } from './dto/update-board-cycle-time.dto';
import { CreateBoardAlertDto } from './dto/create-board-alert.dto';
import { UpdateBoardAlertDto } from './dto/update-board-alert.dto';

@Injectable()
export class BoardsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createBoardDto: CreateBoardDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('boards')
      .insert([createBoardDto])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(search?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('boards')
      .select(`
        *,
        work_orders(count)
      `)
      .order('asm_number', { ascending: true });

    if (search) {
      query = query.or(
        `asm_number.ilike.%${search}%,internal_g_number.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_alerts(*),
        board_cycle_times(*),
        work_orders(id, work_order_number, status, created_at, quantity)
      `)
      .order('created_at', { ascending: true, foreignTable: 'board_alerts' })
      .order('created_at', { ascending: true, foreignTable: 'board_cycle_times' })
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Board not found');
    return data;
  }

  async update(id: string, updateBoardDto: UpdateBoardDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('boards')
      .update(updateBoardDto)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();

    // Prevent deleting boards that are already linked to work orders
    const { count, error: countError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', id);

    if (countError) throw countError;
    if ((count || 0) > 0) {
      throw new BadRequestException('Cannot delete a board that is linked to existing work orders');
    }

    const { error } = await supabase.from('boards').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Board deleted successfully' };
  }

  async addCycleTime(boardId: string, dto: CreateBoardCycleTimeDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('board_cycle_times')
      .insert([{ board_id: boardId, ...dto }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateCycleTime(cycleTimeId: string, dto: UpdateBoardCycleTimeDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('board_cycle_times')
      .update(dto)
      .eq('id', cycleTimeId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async removeCycleTime(cycleTimeId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.from('board_cycle_times').delete().eq('id', cycleTimeId);
    if (error) throw error;
    return { message: 'Cycle time deleted successfully' };
  }

  async addAlert(boardId: string, dto: CreateBoardAlertDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('board_alerts')
      .insert([{ board_id: boardId, content: dto.content }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateAlert(alertId: string, dto: UpdateBoardAlertDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('board_alerts')
      .update(dto)
      .eq('id', alertId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async removeAlert(alertId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.from('board_alerts').delete().eq('id', alertId);
    if (error) throw error;
    return { message: 'Alert deleted successfully' };
  }

  async uploadReferenceImage(file: Express.Multer.File, userId: string) {
    const supabase = this.supabaseService.getClient();

    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/board-references/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await Promise.race([
      supabase.storage.from('ticket-images').upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      }),
      new Promise<{ data: null; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout')), 60000),
      ),
    ]);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('ticket-images').getPublicUrl(fileName);
    return { url: publicUrl };
  }
}




