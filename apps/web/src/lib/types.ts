export type Role = 'ADMIN' | 'MANAGER' | 'AGENT' | 'CHAT';

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  role: Role;
  isAcceptingChats?: boolean;
  maxConcurrentChats?: number;
  activeConversationCount?: number;
}

export interface CustomerSource {
  id: string;
  name: string;
  createdAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type CustomerStatus = 'NEW' | 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  zaloUserId: string | null;
  avatar: string | null;
  source: string;
  status: CustomerStatus;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  tags: { tag: Tag }[];
  createdAt: string;
  updatedAt: string;
  deals?: Deal[];
  appointments?: Appointment[];
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: UserSummary;
}

export type AppointmentStatus = 'SCHEDULED' | 'DONE' | 'CANCELED';

export interface Appointment {
  id: string;
  title: string;
  startAt: string;
  status: AppointmentStatus;
  staff: UserSummary;
}

export interface ActivityLogItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  actor: UserSummary | null;
}

export type ZaloOAStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED';

export interface ZaloOA {
  id: string;
  name: string;
  avatar: string | null;
  zaloOaId: string;
  status: ZaloOAStatus;
  lastSyncAt: string | null;
  dailyMessageLimit: number;
  messagesSentToday: number;
  webhookUrl: string;
  webhookSecret: string | null;
  webhookVerifiedAt: string | null;
  staffAccess: { user: UserSummary; canSend: boolean }[];
  _count?: { conversations: number };
}

export type ConversationStatus = 'UNREAD' | 'PROCESSING' | 'RESOLVED';

export interface Conversation {
  id: string;
  status: ConversationStatus;
  lastMessageAt: string;
  isPinned: boolean;
  isGroup: boolean;
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'avatar' | 'status'> & { tags?: { tag: Tag }[] };
  zaloOA: Pick<ZaloOA, 'id' | 'name' | 'avatar'>;
  assignedTo: UserSummary | null;
  lastMessage?: Message | null;
}

export type MessageDirection = 'IN' | 'OUT';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'TEMPLATE';
  content: string;
  attachmentUrl: string | null;
  externalSenderId?: string | null;
  externalSenderName?: string | null;
  externalSenderAvatar?: string | null;
  status: MessageStatus;
  sentAt: string;
  sender: UserSummary | null;
}

export interface UserNotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  conversation: { id: string; customer: { name: string } };
}

export type DealStage = 'NEW' | 'CONSULTING' | 'POTENTIAL' | 'WON' | 'LOST';

export interface Deal {
  id: string;
  stage: DealStage;
  value: number;
  note: string | null;
  createdAt: string;
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'avatar'>;
  owner: UserSummary;
}

export type TaskStatus = 'TODO' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserSummary;
  customer: Pick<Customer, 'id' | 'name' | 'avatar'> | null;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface OverviewStats {
  myOpenConversations?: number;
  newCustomersToday?: number;
  newCustomersWeek?: number;
  unresolvedConversations?: number;
  overdueTasks?: number;
  avgResponseMinutes?: number;
  messagesToday?: number;
  assignedPages?: number;
}

export interface EngagementPoint {
  date: string;
  inbound: number;
  outbound: number;
}

export interface StaffPerformance extends UserSummary {
  sentMessages: number;
  resolvedConversations: number;
  wonDeals: number;
  totalDeals: number;
  pendingTasks: number;
}
