import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export const api = {
  // Auth
  async getMe() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/auth/me`, { headers });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  // Work Orders
  async getWorkOrders(search?: string, status?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const url = `${API_URL}/work-orders${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch work orders');
    return response.json();
  },

  async getWorkOrder(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch work order');
    return response.json();
  },

  async getActiveWorkOrders() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/active`, { headers });
    if (!response.ok) throw new Error('Failed to fetch active work orders');
    return response.json();
  },

  async createWorkOrder(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create work order');
    return response.json();
  },

  async updateWorkOrder(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update work order');
    return response.json();
  },

  async deleteWorkOrder(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete work order');
    return response.json();
  },

  // Tickets
  async getTickets(workOrderId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (workOrderId) params.append('workOrderId', workOrderId);
    const url = `${API_URL}/tickets${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  },

  async createTicket(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    return response.json();
  },

  async updateTicket(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update ticket');
    return response.json();
  },

  async deleteTicket(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete ticket');
    return response.json();
  },

  // Areas
  async getAreas() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas`, { headers });
    if (!response.ok) throw new Error('Failed to fetch areas');
    return response.json();
  },

  async createArea(data: { name: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create area');
    return response.json();
  },

  async deleteArea(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete area');
    return response.json();
  },

  // Users
  async getUsers() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users`, { headers });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },
};

