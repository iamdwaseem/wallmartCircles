import { supabase } from "./supabase";
import type { 
  User, Circle, CircleMember, Message, CartItem, ItemVote, 
  Task, Notification, CartHistory 
} from "./supabase";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User>;
  
  // Circles
  getCircle(id: number): Promise<Circle | null>;
  getCirclesByUserId(userId: string): Promise<Circle[]>;
  createCircle(circle: Omit<Circle, 'id' | 'created_at' | 'spent'>): Promise<Circle>;
  updateCircle(id: number, updates: Partial<Circle>): Promise<Circle | null>;
  
  // Circle Members
  getCircleMembers(circleId: number): Promise<(CircleMember & { user: User })[]>;
  getUserCircleMembership(userId: string, circleId: number): Promise<CircleMember | null>;
  addCircleMember(member: Omit<CircleMember, 'id' | 'joined_at'>): Promise<CircleMember>;
  removeCircleMember(userId: string, circleId: number): Promise<void>;
  
  // Messages
  getMessages(circleId: number, limit?: number): Promise<(Message & { user: User, replies?: (Message & { user: User })[] })[]>;
  createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message>;
  
  // Cart Items
  getCartItems(circleId: number): Promise<(CartItem & { user: User, votes: ItemVote[], assignedUser?: User })[]>;
  createCartItem(item: Omit<CartItem, 'id' | 'created_at'>): Promise<CartItem>;
  updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | null>;
  deleteCartItem(id: number): Promise<void>;
  
  // Item Votes
  getItemVote(itemId: number, userId: string): Promise<ItemVote | null>;
  createItemVote(vote: Omit<ItemVote, 'id' | 'created_at'>): Promise<ItemVote>;
  updateItemVote(itemId: number, userId: string, vote: number): Promise<ItemVote | null>;
  deleteItemVote(itemId: number, userId: string): Promise<void>;
  
  // Tasks
  getTasks(circleId: number): Promise<(Task & { assignedUser?: User, createdByUser: User })[]>;
  createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: number): Promise<void>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Cart History
  getCartHistory(circleId: number): Promise<(CartHistory & { user: User })[]>;
  createCartHistory(history: Omit<CartHistory, 'id' | 'created_at'>): Promise<CartHistory>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) return null;
    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) return null;
    return data;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getCircle(id: number): Promise<Circle | null> {
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async getCirclesByUserId(userId: string): Promise<Circle[]> {
    const { data, error } = await supabase
      .from('circles')
      .select(`
        *,
        circle_members!inner(user_id)
      `)
      .eq('circle_members.user_id', userId);
    
    if (error) return [];
    return data || [];
  }

  async createCircle(circleData: Omit<Circle, 'id' | 'created_at' | 'spent'>): Promise<Circle> {
    const { data, error } = await supabase
      .from('circles')
      .insert([{ ...circleData, spent: 0 }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Add creator as admin
    await this.addCircleMember({
      circle_id: data.id,
      user_id: data.created_by,
      role: 'admin'
    });
    
    return data;
  }

  async updateCircle(id: number, updates: Partial<Circle>): Promise<Circle | null> {
    const { data, error } = await supabase
      .from('circles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }

  async getCircleMembers(circleId: number): Promise<(CircleMember & { user: User })[]> {
    const { data, error } = await supabase
      .from('circle_members')
      .select(`
        *,
        users(*)
      `)
      .eq('circle_id', circleId);
    
    if (error) return [];
    return data?.map(item => ({
      ...item,
      user: item.users
    })) || [];
  }

  async getUserCircleMembership(userId: string, circleId: number): Promise<CircleMember | null> {
    const { data, error } = await supabase
      .from('circle_members')
      .select('*')
      .eq('user_id', userId)
      .eq('circle_id', circleId)
      .single();
    
    if (error) return null;
    return data;
  }

  async addCircleMember(member: Omit<CircleMember, 'id' | 'joined_at'>): Promise<CircleMember> {
    const { data, error } = await supabase
      .from('circle_members')
      .insert([member])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async removeCircleMember(userId: string, circleId: number): Promise<void> {
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('user_id', userId)
      .eq('circle_id', circleId);
    
    if (error) throw error;
  }

  async getMessages(circleId: number, limit: number = 50): Promise<(Message & { user: User, replies?: (Message & { user: User })[] })[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        users(*)
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) return [];
    return data?.map(item => ({
      ...item,
      user: item.users,
      replies: []
    })) || [];
  }

  async createMessage(messageData: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getCartItems(circleId: number): Promise<(CartItem & { user: User, votes: ItemVote[], assignedUser?: User })[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        users!cart_items_added_by_fkey(*),
        assigned_user:users!cart_items_assigned_to_fkey(*),
        item_votes(*)
      `)
      .eq('circle_id', circleId);
    
    if (error) return [];
    return data?.map(item => ({
      ...item,
      user: item.users,
      assignedUser: item.assigned_user,
      votes: item.item_votes || []
    })) || [];
  }

  async createCartItem(itemData: Omit<CartItem, 'id' | 'created_at'>): Promise<CartItem> {
    const { data, error } = await supabase
      .from('cart_items')
      .insert([itemData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | null> {
    const { data, error } = await supabase
      .from('cart_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }

  async deleteCartItem(id: number): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getItemVote(itemId: number, userId: string): Promise<ItemVote | null> {
    const { data, error } = await supabase
      .from('item_votes')
      .select('*')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .single();
    
    if (error) return null;
    return data;
  }

  async createItemVote(voteData: Omit<ItemVote, 'id' | 'created_at'>): Promise<ItemVote> {
    const { data, error } = await supabase
      .from('item_votes')
      .insert([voteData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateItemVote(itemId: number, userId: string, vote: number): Promise<ItemVote | null> {
    const { data, error } = await supabase
      .from('item_votes')
      .update({ vote })
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }

  async deleteItemVote(itemId: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('item_votes')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  async getTasks(circleId: number): Promise<(Task & { assignedUser?: User, createdByUser: User })[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        created_by_user:users!tasks_created_by_fkey(*),
        assigned_user:users!tasks_assigned_to_fkey(*)
      `)
      .eq('circle_id', circleId);
    
    if (error) return [];
    return data?.map(item => ({
      ...item,
      createdByUser: item.created_by_user,
      assignedUser: item.assigned_user
    })) || [];
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }

  async deleteTask(id: number): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
  }

  async createNotification(notificationData: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) throw error;
  }

  async getCartHistory(circleId: number): Promise<(CartHistory & { user: User })[]> {
    const { data, error } = await supabase
      .from('cart_history')
      .select(`
        *,
        users(*)
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data?.map(item => ({
      ...item,
      user: item.users
    })) || [];
  }

  async createCartHistory(historyData: Omit<CartHistory, 'id' | 'created_at'>): Promise<CartHistory> {
    const { data, error } = await supabase
      .from('cart_history')
      .insert([historyData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export const storage = new SupabaseStorage();