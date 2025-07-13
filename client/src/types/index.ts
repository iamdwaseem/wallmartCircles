export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface Circle {
  id: number;
  name: string;
  description?: string;
  budget: number;
  spent: number;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  onlineCount: number;
  userRole?: string;
  members?: CircleMember[];
}

export interface CircleMember {
  id: number;
  circleId: number;
  userId: string;
  role: string;
  joinedAt: string;
  user: AuthUser;
}

export interface Message {
  id: number;
  circleId: number;
  userId: string;
  content: string;
  replyTo?: number;
  createdAt: string;
  user: AuthUser;
  replies?: Message[];
}

export interface CartItem {
  id: number;
  circleId: number;
  name: string;
  price: number;
  quantity: number;
  addedBy: string;
  assignedTo?: string;
  createdAt: string;
  user: AuthUser;
  assignedUser?: AuthUser;
  votes: ItemVote[];
}

export interface ItemVote {
  id: number;
  itemId: number;
  userId: string;
  vote: number;
  createdAt: string;
}

export interface Task {
  id: number;
  circleId: number;
  title: string;
  description?: string;
  assignedTo?: string;
  createdBy: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  assignedUser?: AuthUser;
  createdByUser: AuthUser;
}

export interface Notification {
  id: number;
  userId: string;
  circleId?: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}
