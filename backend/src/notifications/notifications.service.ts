import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type NotificationEntityType = 'work_order' | 'ticket' | 'quality_ticket' | 'review_request';
type NotificationEventType =
  | 'work_order.updated'
  | 'work_order.status_changed'
  | 'work_order.quality_result_changed'
  | 'ticket.created'
  | 'ticket.status_changed'
  | 'ticket.comment_added'
  | 'quality_ticket.created'
  | 'quality_ticket.status_changed'
  | 'quality_ticket.comment_added'
  | 'rework.review_requested'
  | 'quality.reviewed';

type Role = 'admin' | 'line_operator' | 'quality' | 'rework';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getUsersByRoles(roles: Role[]): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .in('role', roles);
    if (error) throw error;
    return (data || []).map((u: any) => u.id);
  }

  private async getTicketParticipants(ticketId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const participants = new Set<string>();

    const { data: t, error: tErr } = await supabase
      .from('tickets')
      .select('submitted_by')
      .eq('id', ticketId)
      .single();
    if (tErr) throw tErr;
    if (t?.submitted_by) participants.add(t.submitted_by);

    const { data: comments, error: cErr } = await supabase
      .from('ticket_comments')
      .select('user_id')
      .eq('ticket_id', ticketId);
    if (cErr) throw cErr;
    for (const c of comments || []) {
      if (c?.user_id) participants.add(c.user_id);
    }

    return Array.from(participants);
  }

  private async getQualityTicketParticipants(qualityTicketId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const participants = new Set<string>();

    const { data: t, error: tErr } = await supabase
      .from('quality_tickets')
      .select('submitted_by')
      .eq('id', qualityTicketId)
      .single();
    if (tErr) throw tErr;
    if (t?.submitted_by) participants.add(t.submitted_by);

    const { data: comments, error: cErr } = await supabase
      .from('quality_ticket_comments')
      .select('user_id')
      .eq('quality_ticket_id', qualityTicketId);
    if (cErr) throw cErr;
    for (const c of comments || []) {
      if (c?.user_id) participants.add(c.user_id);
    }

    return Array.from(participants);
  }

  private async getWorkOrderParticipants(workOrderId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const participants = new Set<string>();

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('created_by')
      .eq('id', workOrderId)
      .single();
    if (woErr) throw woErr;
    if (wo?.created_by) participants.add(wo.created_by);

    // Tickets on WO
    const { data: tickets, error: tErr } = await supabase
      .from('tickets')
      .select('id, submitted_by')
      .eq('work_order_id', workOrderId);
    if (tErr) throw tErr;
    for (const t of tickets || []) {
      if (t?.submitted_by) participants.add(t.submitted_by);
      const commentParticipants = await this.getTicketParticipants(t.id);
      commentParticipants.forEach((id) => participants.add(id));
    }

    // Quality tickets on WO
    const { data: qts, error: qErr } = await supabase
      .from('quality_tickets')
      .select('id, submitted_by')
      .eq('work_order_id', workOrderId);
    if (qErr) throw qErr;
    for (const qt of qts || []) {
      if (qt?.submitted_by) participants.add(qt.submitted_by);
      const commentParticipants = await this.getQualityTicketParticipants(qt.id);
      commentParticipants.forEach((id) => participants.add(id));
    }

    return Array.from(participants);
  }

  private async resolveRecipients(args: {
    eventType: NotificationEventType;
    entityType: NotificationEntityType;
    entityId: string;
    actorId?: string | null;
    payload?: any;
  }): Promise<string[]> {
    const { eventType, entityType, entityId, actorId } = args;
    const recipients = new Set<string>();

    // Participants
    if (entityType === 'ticket') (await this.getTicketParticipants(entityId)).forEach((id) => recipients.add(id));
    if (entityType === 'quality_ticket') (await this.getQualityTicketParticipants(entityId)).forEach((id) => recipients.add(id));
    if (entityType === 'work_order') (await this.getWorkOrderParticipants(entityId)).forEach((id) => recipients.add(id));

    // Role broadcasts (per plan’s initial mapping)
    if (eventType === 'work_order.quality_result_changed') {
      (await this.getUsersByRoles(['admin', 'quality', 'rework'])).forEach((id) => recipients.add(id));
    }

    if (eventType === 'work_order.status_changed') {
      (await this.getUsersByRoles(['admin', 'quality'])).forEach((id) => recipients.add(id));
      // Rework only when WO is Fail; we rely on payload to avoid extra query here
      if (args.payload?.quality_result === 'Fail') {
        (await this.getUsersByRoles(['rework'])).forEach((id) => recipients.add(id));
      }
    }

    if (eventType === 'quality_ticket.status_changed') {
      (await this.getUsersByRoles(['admin', 'quality', 'rework'])).forEach((id) => recipients.add(id));
    }

    if (eventType === 'rework.review_requested' || eventType === 'quality.reviewed') {
      (await this.getUsersByRoles(['admin', 'quality', 'rework'])).forEach((id) => recipients.add(id));
    }

    // Actor exclusion
    if (actorId) recipients.delete(actorId);
    return Array.from(recipients);
  }

  async emit(args: {
    eventType: NotificationEventType;
    entityType: NotificationEntityType;
    entityId: string;
    actorId?: string | null;
    payload?: any;
  }) {
    const supabase = this.supabaseService.getClient();
    const recipients = await this.resolveRecipients(args);
    if (recipients.length === 0) return { ok: true, delivered: 0 };

    const { data: event, error: eErr } = await supabase
      .from('notification_events')
      .insert([{
        type: args.eventType,
        actor_id: args.actorId ?? null,
        entity_type: args.entityType,
        entity_id: args.entityId,
        payload: args.payload ?? {},
      }])
      .select('*')
      .single();
    if (eErr) throw eErr;

    const rows = recipients.map((user_id) => ({
      user_id,
      event_id: event.id,
    }));

    const { error: nErr } = await supabase.from('notifications').insert(rows);
    if (nErr) throw nErr;

    return { ok: true, delivered: recipients.length, eventId: event.id };
  }

  async listForUser(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    const supabase = this.supabaseService.getClient();
    const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 100);

    let q = supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        read_at,
        created_at,
        event:notification_events(
          id,
          type,
          actor_id,
          entity_type,
          entity_id,
          payload,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts?.unreadOnly) q = q.is('read_at', null);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async markRead(userId: string, notificationId: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async markAllRead(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) throw error;
    return { ok: true };
  }
}


