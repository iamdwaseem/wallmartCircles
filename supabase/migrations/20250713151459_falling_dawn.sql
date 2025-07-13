/*
  # Initial Schema for Walmart Circle

  1. New Tables
    - `users` - User profiles and authentication data
    - `circles` - Shopping circles/groups
    - `circle_members` - Circle membership with roles
    - `messages` - Chat messages within circles
    - `cart_items` - Shared shopping cart items
    - `item_votes` - Voting system for cart items
    - `tasks` - Task management within circles
    - `notifications` - User notifications
    - `cart_history` - Audit trail for cart changes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Proper foreign key relationships
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circles table
CREATE TABLE IF NOT EXISTS circles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  budget INTEGER DEFAULT 0, -- in cents
  spent INTEGER DEFAULT 0, -- in cents
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circle members table
CREATE TABLE IF NOT EXISTS circle_members (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to INTEGER REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents
  quantity INTEGER DEFAULT 1,
  added_by UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item votes table
CREATE TABLE IF NOT EXISTS item_votes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES cart_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)), -- -1 for downvote, 1 for upvote
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart history table
CREATE TABLE IF NOT EXISTS cart_history (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed', 'updated')),
  item_name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Circles policies
CREATE POLICY "Users can read circles they are members of" ON circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = circles.id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Circle admins can update circles" ON circles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = circles.id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
    )
  );

-- Circle members policies
CREATE POLICY "Users can read circle members for their circles" ON circle_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members cm 
      WHERE cm.circle_id = circle_members.circle_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle admins can manage members" ON circle_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM circle_members cm 
      WHERE cm.circle_id = circle_members.circle_id 
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- Messages policies
CREATE POLICY "Circle members can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = messages.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = messages.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

-- Cart items policies
CREATE POLICY "Circle members can read cart items" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = cart_items.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can add cart items" ON cart_items
  FOR INSERT WITH CHECK (
    auth.uid() = added_by AND
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = cart_items.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can update cart items" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = cart_items.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can delete cart items" ON cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = cart_items.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

-- Item votes policies
CREATE POLICY "Circle members can manage votes" ON item_votes
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM cart_items ci
      JOIN circle_members cm ON cm.circle_id = ci.circle_id
      WHERE ci.id = item_votes.item_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Circle members can read tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = tasks.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = tasks.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can update tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = tasks.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Cart history policies
CREATE POLICY "Circle members can read cart history" ON cart_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members 
      WHERE circle_members.circle_id = cart_history.circle_id 
      AND circle_members.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_circle_id ON messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_circle_id ON cart_items(circle_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_item_id ON item_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_tasks_circle_id ON tasks(circle_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_history_circle_id ON cart_history(circle_id);