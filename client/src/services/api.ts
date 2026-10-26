import { User, CampusResource, ResourceBooking, EventItem, Registration, CheckoutLog, AuditLogEntry, AnalyticsData } from '../types';

const API_BASE = '/api';

// Active simulated user ID saved in localStorage for quick persona switching
let currentUserId = localStorage.getItem('orchestr_user_id') || 'usr_student_aarav';

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
  localStorage.setItem('orchestr_user_id', userId);
}

export function getCurrentUserId(): string {
  return currentUserId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentUserId) {
    headers.set('x-user-id', currentUserId);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || data.error || `HTTP ${res.status}: Request failed`;
    const err = new Error(errorMsg);
    (err as any).data = data;
    (err as any).status = res.status;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, name?: string, role?: string, department?: string): Promise<{ success: boolean; user: User; token: string }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name, role, department }),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  async getDemoUsers(): Promise<{ users: User[] }> {
    return request('/auth/users');
  },

  // Resources & Bookings
  async getResources(params?: { type?: string; category?: string; tier?: string }): Promise<{ resources: CampusResource[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/resources${query ? `?${query}` : ''}`);
  },

  async createResource(resourceData: Partial<CampusResource>): Promise<{ success: boolean; resource: CampusResource }> {
    return request('/resources', {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  },

  async getBookings(params?: { resourceId?: string; status?: string }): Promise<{ bookings: ResourceBooking[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/bookings${query ? `?${query}` : ''}`);
  },

  async createBooking(bookingData: { resourceId: string; purpose: string; startTime: string; endTime: string }): Promise<{ success: boolean; booking: ResourceBooking; autoApproved: boolean; message: string }> {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  async approveBooking(bookingId: string, reason?: string): Promise<{ success: boolean; booking: ResourceBooking }> {
    return request(`/bookings/${bookingId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  async rejectBooking(bookingId: string, reason?: string): Promise<{ success: boolean; booking: ResourceBooking }> {
    return request(`/bookings/${bookingId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  async checkinBooking(bookingId: string): Promise<{ success: boolean; booking: ResourceBooking; message: string }> {
    return request(`/bookings/${bookingId}/checkin`, {
      method: 'POST',
    });
  },

  async triggerSweep(): Promise<{ success: boolean; releasedCount: number; message: string }> {
    return request('/bookings/sweep-unclaimed', {
      method: 'POST',
    });
  },

  // Equipment Logs
  async getCheckoutLogs(): Promise<{ checkoutLogs: CheckoutLog[] }> {
    return request('/checkout-logs');
  },

  async checkoutGear(data: { resourceId: string; userId: string; expectedReturnTime: string }): Promise<{ success: boolean; log: CheckoutLog }> {
    return request('/checkout-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async returnGear(logId: string, data: { conditionOnReturn: 'Good' | 'Damaged' | 'Late'; damageNotes?: string }): Promise<{ success: boolean; log: CheckoutLog }> {
    return request(`/checkout-logs/${logId}/return`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Events
  async getEvents(params?: { status?: string; category?: string }): Promise<{ events: EventItem[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/events${query ? `?${query}` : ''}`);
  },

  async getEventById(id: string): Promise<{ event: EventItem; registrations: Registration[] }> {
    return request(`/events/${id}`);
  },

  async createEvent(eventData: Partial<EventItem>): Promise<{ success: boolean; event: EventItem; message: string }> {
    return request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async markNoShows(eventId: string): Promise<{ success: boolean; penalizedCount: number; penalizedStudents: any[]; message: string }> {
    return request(`/events/${eventId}/mark-noshows`, {
      method: 'POST',
    });
  },

  async stressTest(eventId: string, count: number = 50): Promise<any> {
    return request(`/events/${eventId}/stress-test`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  // Registrations & Waitlist
  async getMyRegistrations(): Promise<{ registrations: Registration[] }> {
    return request('/registrations/my');
  },

  async registerForEvent(eventId: string): Promise<{ success: boolean; status: 'CONFIRMED' | 'WAITLISTED'; waitlistPosition?: number; registration: Registration; message: string }> {
    return request(`/events/${eventId}/register`, {
      method: 'POST',
    });
  },

  async cancelRegistration(registrationId: string): Promise<{ success: boolean; message: string; promotedWaitlistStudent?: Registration }> {
    return request(`/registrations/${registrationId}/cancel`, {
      method: 'POST',
    });
  },

  async claimWaitlistSeat(registrationId: string): Promise<{ success: boolean; registration: Registration; message: string }> {
    return request(`/registrations/${registrationId}/claim-waitlist`, {
      method: 'POST',
    });
  },

  // Door Check-in & Scanner
  async scanTicket(data: { ticketData: any; scanMode?: 'ENTRY' | 'EXIT'; gateName?: string }): Promise<any> {
    return request('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getOfflineManifest(eventId: string): Promise<{ success: boolean; manifest: any }> {
    return request(`/checkin/manifest/${eventId}`);
  },

  async syncOfflineScans(scans: any[]): Promise<any> {
    return request('/checkin/sync-offline', {
      method: 'POST',
      body: JSON.stringify({ scans }),
    });
  },

  // Certificates & Verification
  async generateCertificate(registrationId: string): Promise<{ success: boolean; certificateHash: string; verificationUrl: string; message: string }> {
    return request(`/certificates/generate/${registrationId}`, {
      method: 'POST',
    });
  },

  async verifyCertificate(hash: string): Promise<any> {
    return request(`/certificates/verify/${hash}`);
  },

  // Analytics & Audit Logs
  async getAnalytics(): Promise<AnalyticsData> {
    return request('/analytics');
  },

  async getAuditLogs(params?: { action?: string; targetType?: string; search?: string }): Promise<{ logs: AuditLogEntry[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/audit-logs${query ? `?${query}` : ''}`);
  },

  async revokeStrike(userId: string, strikeId: string, reason: string): Promise<{ success: boolean; user: User; message: string }> {
    return request('/strikes/revoke', {
      method: 'POST',
      body: JSON.stringify({ userId, strikeId, reason }),
    });
  },

  async issueStrike(userId: string, reason: string, eventTitle?: string): Promise<{ success: boolean; user: User; message: string }> {
    return request('/strikes/issue', {
      method: 'POST',
      body: JSON.stringify({ userId, reason, eventTitle }),
    });
  },

  async overrideAttendance(registrationId: string, reason: string): Promise<{ success: boolean; registration: Registration; message: string }> {
    return request('/attendance/override', {
      method: 'POST',
      body: JSON.stringify({ registrationId, reason }),
    });
  },
};
