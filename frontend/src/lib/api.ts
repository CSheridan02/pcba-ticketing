import { supabase } from './supabase';

// Remove trailing slash from API URL if present
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

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
    const response = await fetch(`${API_URL}/auth/me`, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  // Work Orders
  async getWorkOrders(search?: string, status?: string, sortBy?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);
    const url = `${API_URL}/work-orders${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch work orders');
    return response.json();
  },

  async getWorkOrder(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}`, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch work order');
    return response.json();
  },

  async getActiveWorkOrders() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/active`, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch active work orders');
    return response.json();
  },

  async createWorkOrder(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
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
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to update work order');
    return response.json();
  },

  async deleteWorkOrder(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete work order');
    return response.json();
  },

  async syncWorkOrderAlerts(workOrderId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}/alerts/sync`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to sync work order alerts');
    return response.json() as Promise<{ inserted: number }>;
  },

  async copyWorkOrderAlerts(workOrderId: string, boardAlertIds: string[]) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}/alerts/copy`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ board_alert_ids: boardAlertIds }),
    });
    if (!response.ok) throw new Error('Failed to copy selected work order alerts');
    return response.json() as Promise<{ inserted: number }>;
  },

  async getWorkOrderAlerts(workOrderId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}/alerts`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch work order alerts');
    return response.json() as Promise<any[]>;
  },

  async deleteWorkOrderAlerts(workOrderId: string, ids?: string[]) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}/alerts/delete`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to delete work order alerts');
    return response.json() as Promise<{ ok: boolean }>;
  },

  async getSerialSuggestion(boardId: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.append('board_id', boardId);
    const response = await fetch(`${API_URL}/work-orders/serial-suggestion?${params.toString()}`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch serial suggestion');
    return response.json() as Promise<{ latest_end: string | null }>;
  },

  // Tickets
  async getTickets(workOrderId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (workOrderId) params.append('workOrderId', workOrderId);
    const url = `${API_URL}/tickets${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  },

  async createTicket(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
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
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to update ticket');
    return response.json();
  },

  async deleteTicket(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete ticket');
    return response.json();
  },

  async getTicketComments(ticketId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets/${ticketId}/comments`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ticket comments');
    return response.json();
  },

  async addTicketComment(ticketId: string, comment: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to add ticket comment');
    return response.json();
  },

  async uploadTicketImages(files: File[], onProgress?: (progress: number) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Failed to upload images: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', `${API_URL}/tickets/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.timeout = 120000; // 2 minute timeout
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },

  // Quality Tickets
  async getQualityTickets(workOrderId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (workOrderId) params.append('workOrderId', workOrderId);
    const url = `${API_URL}/quality-tickets${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch quality tickets');
    return response.json();
  },

  async createQualityTicket(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to create quality ticket');
    return response.json();
  },

  async updateQualityTicket(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to update quality ticket');
    return response.json();
  },

  async deleteQualityTicket(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete quality ticket');
    return response.json();
  },

  async getQualityTicketComments(qualityTicketId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/${qualityTicketId}/comments`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch quality ticket comments');
    return response.json();
  },

  async addQualityTicketComment(qualityTicketId: string, comment: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/${qualityTicketId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to add quality ticket comment');
    return response.json();
  },

  async getQualityTicketReviewRequests(qualityTicketId: string, status?: 'Pending' | 'Reviewed') {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const url = `${API_URL}/quality-tickets/${qualityTicketId}/review-requests${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch quality review requests');
    return response.json();
  },

  async requestQualityReview(qualityTicketId: string, serial_number: string, rework_notes?: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/${qualityTicketId}/review-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ serial_number, rework_notes }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to request quality review');
    return response.json();
  },

  async markQualityReviewRequestReviewed(requestId: string, outcome: 'Pass' | 'Fail', review_notes?: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/quality-tickets/review-requests/${requestId}/reviewed`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ outcome, review_notes }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark review request as reviewed');
    return response.json();
  },

  async uploadQualityTicketImages(files: File[], onProgress?: (progress: number) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (_error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Failed to upload images: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', `${API_URL}/quality-tickets/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.timeout = 120000;
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },

  // Work Order: Quality workflow
  async updateWorkOrderStatus(id: string, status: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to update work order status');
    return response.json();
  },

  async updateWorkOrderQualityResult(id: string, quality_result: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/work-orders/${id}/quality-result`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ quality_result }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to update work order quality result');
    return response.json();
  },

  // Notifications
  async getNotifications(opts?: { unreadOnly?: boolean; limit?: number }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.append('unreadOnly', 'true');
    if (opts?.limit) params.append('limit', String(opts.limit));
    const url = `${API_URL}/notifications${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers, credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  async markNotificationRead(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark notification read');
    return response.json();
  },

  async markAllNotificationsRead() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark all notifications read');
    return response.json();
  },

  async uploadBoardReferenceImage(file: File, onProgress?: (progress: number) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const formData = new FormData();
    formData.append('image', file);

    return new Promise<{ url: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Failed to upload image: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', `${API_URL}/boards/upload-reference`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.timeout = 120000; // 2 minute timeout
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },

  // Areas
  async getAreas() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas`, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch areas');
    return response.json();
  },

  async createArea(data: { name: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to create area');
    return response.json();
  },

  async deleteArea(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/areas/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete area');
    return response.json();
  },

  // Users
  async getUsers() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users`, { 
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async updateUserRole(userId: string, role: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error('Failed to update user role');
    return response.json();
  },

  async updateUser(userId: string, data: { full_name: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async deleteUser(userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  async updateUserAccess(userId: string, accessGranted: boolean) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${userId}/access`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ access_granted: accessGranted }),
    });
    if (!response.ok) throw new Error('Failed to update user access');
    return response.json();
  },

  // Boards
  async getBoards(search?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const url = `${API_URL}/boards${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch boards');
    return response.json();
  },

  async getBoard(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/${id}`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch board');
    return response.json();
  },

  async createBoard(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create board');
    return response.json();
  },

  async updateBoard(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/${id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update board');
    return response.json();
  },

  async deleteBoard(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete board');
    return response.json();
  },

  async addBoardCycleTime(boardId: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/${boardId}/cycle-times`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add cycle time');
    return response.json();
  },

  async updateBoardCycleTime(cycleTimeId: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/cycle-times/${cycleTimeId}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update cycle time');
    return response.json();
  },

  async deleteBoardCycleTime(cycleTimeId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/cycle-times/${cycleTimeId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete cycle time');
    return response.json();
  },

  async addBoardAlert(boardId: string, data: { content: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/${boardId}/alerts`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add board alert');
    return response.json();
  },

  async updateBoardAlert(alertId: string, data: { content?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/alerts/${alertId}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update board alert');
    return response.json();
  },

  async deleteBoardAlert(alertId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/boards/alerts/${alertId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete board alert');
    return response.json();
  },
};

