import { 
  users, circles, circleMembers, messages, cartItems, itemVotes, tasks, notifications, cartHistory,
  type User, type InsertUser, type Circle, type InsertCircle, type CircleMember, type InsertCircleMember,
  type Message, type InsertMessage, type CartItem, type InsertCartItem, type ItemVote, type InsertItemVote,
  type Task, type InsertTask, type Notification, type InsertNotification, type CartHistory, type InsertCartHistory
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Circles
  getCircle(id: number): Promise<Circle | undefined>;
  getCirclesByUserId(userId: number): Promise<Circle[]>;
  createCircle(circle: InsertCircle): Promise<Circle>;
  updateCircle(id: number, updates: Partial<Circle>): Promise<Circle | undefined>;
  
  // Circle Members
  getCircleMembers(circleId: number): Promise<(CircleMember & { user: User })[]>;
  getUserCircleMembership(userId: number, circleId: number): Promise<CircleMember | undefined>;
  addCircleMember(member: InsertCircleMember): Promise<CircleMember>;
  removeCircleMember(userId: number, circleId: number): Promise<void>;
  
  // Messages
  getMessages(circleId: number, limit?: number): Promise<(Message & { user: User, replies?: (Message & { user: User })[] })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Cart Items
  getCartItems(circleId: number): Promise<(CartItem & { user: User, votes: ItemVote[], assignedUser?: User })[]>;
  createCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | undefined>;
  deleteCartItem(id: number): Promise<void>;
  
  // Item Votes
  getItemVote(itemId: number, userId: number): Promise<ItemVote | undefined>;
  createItemVote(vote: InsertItemVote): Promise<ItemVote>;
  updateItemVote(itemId: number, userId: number, vote: number): Promise<ItemVote | undefined>;
  deleteItemVote(itemId: number, userId: number): Promise<void>;
  
  // Tasks
  getTasks(circleId: number): Promise<(Task & { assignedUser?: User, createdByUser: User })[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  
  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Cart History
  getCartHistory(circleId: number): Promise<(CartHistory & { user: User })[]>;
  createCartHistory(history: InsertCartHistory): Promise<CartHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private circles: Map<number, Circle>;
  private circleMembers: Map<number, CircleMember>;
  private messages: Map<number, Message>;
  private cartItems: Map<number, CartItem>;
  private itemVotes: Map<number, ItemVote>;
  private tasks: Map<number, Task>;
  private notifications: Map<number, Notification>;
  private cartHistory: Map<number, CartHistory>;
  
  private currentUserId: number = 1;
  private currentCircleId: number = 1;
  private currentCircleMemberId: number = 1;
  private currentMessageId: number = 1;
  private currentCartItemId: number = 1;
  private currentItemVoteId: number = 1;
  private currentTaskId: number = 1;
  private currentNotificationId: number = 1;
  private currentCartHistoryId: number = 1;

  constructor() {
    this.users = new Map();
    this.circles = new Map();
    this.circleMembers = new Map();
    this.messages = new Map();
    this.cartItems = new Map();
    this.itemVotes = new Map();
    this.tasks = new Map();
    this.notifications = new Map();
    this.cartHistory = new Map();
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      avatar: insertUser.avatar || null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Circles
  async getCircle(id: number): Promise<Circle | undefined> {
    return this.circles.get(id);
  }

  async getCirclesByUserId(userId: number): Promise<Circle[]> {
    const userMemberships = Array.from(this.circleMembers.values()).filter(m => m.userId === userId);
    return userMemberships.map(m => this.circles.get(m.circleId)).filter(Boolean) as Circle[];
  }

  async createCircle(insertCircle: InsertCircle): Promise<Circle> {
    const id = this.currentCircleId++;
    const circle: Circle = { 
      ...insertCircle, 
      id, 
      description: insertCircle.description || null,
      budget: insertCircle.budget || null,
      spent: 0,
      createdAt: new Date() 
    };
    this.circles.set(id, circle);
    
    // Add creator as admin
    await this.addCircleMember({
      circleId: id,
      userId: circle.createdBy,
      role: "admin"
    });
    
    return circle;
  }

  async updateCircle(id: number, updates: Partial<Circle>): Promise<Circle | undefined> {
    const circle = this.circles.get(id);
    if (!circle) return undefined;
    
    const updatedCircle = { ...circle, ...updates };
    this.circles.set(id, updatedCircle);
    return updatedCircle;
  }

  // Circle Members
  async getCircleMembers(circleId: number): Promise<(CircleMember & { user: User })[]> {
    const members = Array.from(this.circleMembers.values()).filter(m => m.circleId === circleId);
    return members.map(member => ({
      ...member,
      user: this.users.get(member.userId)!
    }));
  }

  async getUserCircleMembership(userId: number, circleId: number): Promise<CircleMember | undefined> {
    return Array.from(this.circleMembers.values()).find(m => m.userId === userId && m.circleId === circleId);
  }

  async addCircleMember(insertMember: InsertCircleMember): Promise<CircleMember> {
    const id = this.currentCircleMemberId++;
    const member: CircleMember = { 
      ...insertMember, 
      id,
      role: insertMember.role || "member",
      joinedAt: new Date() 
    };
    this.circleMembers.set(id, member);
    return member;
  }

  async removeCircleMember(userId: number, circleId: number): Promise<void> {
    const member = Array.from(this.circleMembers.entries()).find(([_, m]) => m.userId === userId && m.circleId === circleId);
    if (member) {
      this.circleMembers.delete(member[0]);
    }
  }

  // Messages
  async getMessages(circleId: number, limit: number = 50): Promise<(Message & { user: User, replies?: (Message & { user: User })[] })[]> {
    const allMessages = Array.from(this.messages.values())
      .filter(m => m.circleId === circleId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    const topLevelMessages = allMessages.filter(m => !m.replyTo);
    const replies = allMessages.filter(m => m.replyTo);
    
    return topLevelMessages.slice(-limit).map(message => ({
      ...message,
      user: this.users.get(message.userId)!,
      replies: replies.filter(r => r.replyTo === message.id).map(reply => ({
        ...reply,
        user: this.users.get(reply.userId)!
      }))
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id,
      replyTo: insertMessage.replyTo || null,
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  // Cart Items
  async getCartItems(circleId: number): Promise<(CartItem & { user: User, votes: ItemVote[], assignedUser?: User })[]> {
    const items = Array.from(this.cartItems.values()).filter(i => i.circleId === circleId);
    return items.map(item => ({
      ...item,
      user: this.users.get(item.addedBy)!,
      assignedUser: item.assignedTo ? this.users.get(item.assignedTo) : undefined,
      votes: Array.from(this.itemVotes.values()).filter(v => v.itemId === item.id)
    }));
  }

  async createCartItem(insertItem: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartItemId++;
    const item: CartItem = { 
      ...insertItem, 
      id,
      quantity: insertItem.quantity || 1,
      assignedTo: insertItem.assignedTo || null,
      createdAt: new Date() 
    };
    this.cartItems.set(id, item);
    return item;
  }

  async updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates };
    this.cartItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteCartItem(id: number): Promise<void> {
    this.cartItems.delete(id);
    // Also delete associated votes
    Array.from(this.itemVotes.entries()).forEach(([voteId, vote]) => {
      if (vote.itemId === id) {
        this.itemVotes.delete(voteId);
      }
    });
  }

  // Item Votes
  async getItemVote(itemId: number, userId: number): Promise<ItemVote | undefined> {
    return Array.from(this.itemVotes.values()).find(v => v.itemId === itemId && v.userId === userId);
  }

  async createItemVote(insertVote: InsertItemVote): Promise<ItemVote> {
    const id = this.currentItemVoteId++;
    const vote: ItemVote = { 
      ...insertVote, 
      id, 
      createdAt: new Date() 
    };
    this.itemVotes.set(id, vote);
    return vote;
  }

  async updateItemVote(itemId: number, userId: number, voteValue: number): Promise<ItemVote | undefined> {
    const vote = Array.from(this.itemVotes.entries()).find(([_, v]) => v.itemId === itemId && v.userId === userId);
    if (!vote) return undefined;
    
    const updatedVote = { ...vote[1], vote: voteValue };
    this.itemVotes.set(vote[0], updatedVote);
    return updatedVote;
  }

  async deleteItemVote(itemId: number, userId: number): Promise<void> {
    const vote = Array.from(this.itemVotes.entries()).find(([_, v]) => v.itemId === itemId && v.userId === userId);
    if (vote) {
      this.itemVotes.delete(vote[0]);
    }
  }

  // Tasks
  async getTasks(circleId: number): Promise<(Task & { assignedUser?: User, createdByUser: User })[]> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.circleId === circleId);
    return tasks.map(task => ({
      ...task,
      assignedUser: task.assignedTo ? this.users.get(task.assignedTo) : undefined,
      createdByUser: this.users.get(task.createdBy)!
    }));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id,
      description: insertTask.description || null,
      assignedTo: insertTask.assignedTo || null,
      completed: insertTask.completed || false,
      dueDate: insertTask.dueDate || null,
      createdAt: new Date() 
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id,
      read: insertNotification.read || false,
      circleId: insertNotification.circleId || null,
      createdAt: new Date() 
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, { ...notification, read: true });
    }
  }

  // Cart History
  async getCartHistory(circleId: number): Promise<(CartHistory & { user: User })[]> {
    const history = Array.from(this.cartHistory.values())
      .filter(h => h.circleId === circleId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return history.map(h => ({
      ...h,
      user: this.users.get(h.userId)!
    }));
  }

  async createCartHistory(insertHistory: InsertCartHistory): Promise<CartHistory> {
    const id = this.currentCartHistoryId++;
    const history: CartHistory = { 
      ...insertHistory, 
      id,
      details: insertHistory.details || null,
      createdAt: new Date() 
    };
    this.cartHistory.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
