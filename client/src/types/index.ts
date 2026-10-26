export type UserRole = 'STUDENT' | 'ORGANIZER' | 'RESOURCE_MANAGER' | 'SUPER_ADMIN';

export interface StrikeRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  reason: string;
  issuedAt: string;
  issuedBy: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  studentId?: string;
  strikes: number;
  strikeHistory: StrikeRecord[];
  isBlockedUntil?: string | null;
  createdAt: string;
}

export type ResourceType = 'ROOM' | 'EQUIPMENT';
export type ResourceTier = 'BASIC' | 'RESTRICTED';
export type ResourceCategory = 'LAB' | 'SEMINAR_HALL' | 'AUDITORIUM' | 'PROJECTOR' | 'CAMERA' | 'AUDIO';

export interface CampusResource {
  id: string;
  name: string;
  type: ResourceType;
  category: ResourceCategory;
  tier: ResourceTier;
  capacity?: number;
  location: string;
  description: string;
  specs: string[];
  requiresApproval: boolean;
  approverRole: 'RESOURCE_MANAGER' | 'SUPER_ADMIN';
  cleanupBufferMinutes: number;
  currentCondition: 'Good' | 'Fair' | 'Maintenance';
  imageUrl?: string;
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN' | 'AUTO_RELEASED' | 'COMPLETED';

export interface ResourceBooking {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  bookedByUserId: string;
  bookedByUserName: string;
  bookedByUserEmail: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  approvalReason?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  checkedInAt?: string;
  autoReleaseDeadline: string;
  createdAt: string;
}

export interface CheckoutLog {
  id: string;
  bookingId: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  userEmail: string;
  checkedOutAt: string;
  checkedOutBy: string;
  expectedReturnTime: string;
  actualReturnTime?: string | null;
  conditionOnReturn?: 'Good' | 'Damaged' | 'Late' | null;
  damageNotes?: string;
  status: 'CHECKED_OUT' | 'RETURNED' | 'OVERDUE';
}

export interface EventPrerequisite {
  eventId: string;
  eventTitle: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  clubName: string;
  resourceId: string;
  resourceName: string;
  venueCapacity: number;
  startTime: string;
  endTime: string;
  category: 'WORKSHOP' | 'HACKATHON' | 'SEMINAR' | 'CULTURAL' | 'TECH_TALK';
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  prerequisites: EventPrerequisite[];
  dualScanRequired: boolean;
  registeredCount: number;
  checkedInCount: number;
  waitlistCount: number;
  coverImage?: string;
  tags: string[];
  createdAt: string;
}

export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  studentId?: string;
  status: RegistrationStatus;
  ticketId: string;
  qrSignature: string;
  registeredAt: string;
  waitlistPosition?: number;
  waitlistPromotedAt?: string;
  waitlistExpiresAt?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedInMethod?: 'ONLINE' | 'OFFLINE_SYNC';
  exitScanCompleted?: boolean;
  exitScannedAt?: string;
  certificateGenerated?: boolean;
  certificateHash?: string;
  certificateIssuedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'EVENT' | 'BOOKING' | 'REGISTRATION' | 'STRIKE' | 'RESOURCE' | 'SYSTEM';
  targetId: string;
  targetName?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface AnalyticsData {
  summary: {
    totalRegistrations: number;
    confirmedRegistrations: number;
    actualTurnout: number;
    turnoutRate: number;
    noShows: number;
    noShowRate: number;
    waitlisted: number;
    waitlistConversionRate: number;
    totalStrikes: number;
    blockedStudents: number;
    totalEvents: number;
    totalResources: number;
    totalBookings: number;
  };
  roomUtilization: {
    roomId: string;
    roomName: string;
    capacity: number;
    eventsHosted: number;
    utilizationRate: number;
  }[];
  categoryDistribution: Record<string, number>;
  recentEventsStats: {
    id: string;
    title: string;
    venueName: string;
    capacity: number;
    registered: number;
    checkedIn: number;
    waitlisted: number;
    fillRate: number;
  }[];
}
