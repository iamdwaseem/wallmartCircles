export interface AuthUser {
  id: number;
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
  createdBy: number;
  createdAt: string;
  memberCount: number;
  onlineCount: number;
  userRole?: string;
  members?: CircleMember[];
}

export interface CircleMember {
  id: number;
  circleId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: AuthUser;
}

export interface Message {
  id: number;
  circleId: number;
  userId: number;
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
  addedBy: number;
  assignedTo?: number;
  createdAt: string;
  user: AuthUser;
  assignedUser?: AuthUser;
  votes: ItemVote[];
}

export interface ItemVote {
  id: number;
  itemId: number;
  userId: number;
  vote: number;
  createdAt: string;
}

export interface Task {
  id: number;
  circleId: number;
  title: string;
  description?: string;
  assignedTo?: number;
  createdBy: number;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  assignedUser?: AuthUser;
  createdByUser: AuthUser;
}

export interface Notification {
  id: number;
  userId: number;
  circleId?: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TypingUser {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}
