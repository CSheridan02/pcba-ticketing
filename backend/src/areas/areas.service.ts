import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAreaDto } from './dto/create-area.dto';

@Injectable()
export class AreasService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createAreaDto: CreateAreaDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('areas')
      .insert([createAreaDto])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Area not found');
    return data;
  }

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Area deleted successfully' };
  }
}

