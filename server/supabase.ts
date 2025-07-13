import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  created_at: string;
}

export interface Circle {
  id: number;
  name: string;
  description?: string;
  budget?: number;
  spent: number;
  created_by: string;
  created_at: string;
}

export interface CircleMember {
  id: number;
  circle_id: number;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface Message {
  id: number;
  circle_id: number;
  user_id: string;
  content: string;
  reply_to?: number;
  created_at: string;
}

export interface CartItem {
  id: number;
  circle_id: number;
  name: string;
  price: number;
  quantity: number;
  added_by: string;
  assigned_to?: string;
  created_at: string;
}

export interface ItemVote {
  id: number;
  item_id: number;
  user_id: string;
  vote: number;
  created_at: string;
}

export interface Task {
  id: number;
  circle_id: number;
  title: string;
  description?: string;
  assigned_to?: string;
  created_by: string;
  completed: boolean;
  due_date?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  circle_id?: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface CartHistory {
  id: number;
  circle_id: number;
  user_id: string;
  action: string;
  item_name: string;
  details?: any;
  created_at: string;
}