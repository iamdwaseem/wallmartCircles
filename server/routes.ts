import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { hashPassword, generateToken, verifyToken } from "./auth";
import { WebSocketManager } from "./websocket";
import { insertUserSchema, insertCircleSchema, insertMessageSchema, insertCartItemSchema, insertTaskSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate token
      const token = generateToken(user);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Invalid registration data' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Circle routes
  app.get('/api/circles', requireAuth, async (req, res) => {
    try {
      const circles = await storage.getCirclesByUserId(req.user.userId);
      
      // Get member counts for each circle
      const circlesWithCounts = await Promise.all(
        circles.map(async (circle) => {
          const members = await storage.getCircleMembers(circle.id);
          return {
            ...circle,
            memberCount: members.length,
            onlineCount: Math.floor(Math.random() * members.length) // Mock online count
          };
        })
      );

      res.json(circlesWithCounts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get circles' });
    }
  });

  app.post('/api/circles', requireAuth, async (req, res) => {
    try {
      const circleData = insertCircleSchema.parse({
        ...req.body,
        createdBy: req.user.userId
      });

      const circle = await storage.createCircle(circleData);
      res.json(circle);
    } catch (error) {
      res.status(400).json({ message: 'Invalid circle data' });
    }
  });

  app.get('/api/circles/:id', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      const circle = await storage.getCircle(circleId);
      
      if (!circle) {
        return res.status(404).json({ message: 'Circle not found' });
      }

      // Check if user is member
      const membership = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this circle' });
      }

      const members = await storage.getCircleMembers(circleId);
      res.json({
        ...circle,
        members,
        memberCount: members.length,
        userRole: membership.role
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get circle' });
    }
  });

  app.post('/api/circles/:id/join', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      
      // Check if already member
      const existing = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (existing) {
        return res.status(400).json({ message: 'Already a member' });
      }

      await storage.addCircleMember({
        circleId,
        userId: req.user.userId,
        role: 'member'
      });

      res.json({ message: 'Joined circle successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to join circle' });
    }
  });

  // Message routes
  app.get('/api/circles/:id/messages', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      
      // Check if user is member
      const membership = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this circle' });
      }

      const messages = await storage.getMessages(circleId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  app.post('/api/circles/:id/messages', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        circleId,
        userId: req.user.userId
      });

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: 'Invalid message data' });
    }
  });

  // Cart routes
  app.get('/api/circles/:id/cart', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      
      // Check if user is member
      const membership = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this circle' });
      }

      const cartItems = await storage.getCartItems(circleId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get cart items' });
    }
  });

  app.post('/api/circles/:id/cart', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      const itemData = insertCartItemSchema.parse({
        ...req.body,
        circleId,
        addedBy: req.user.userId
      });

      const item = await storage.createCartItem(itemData);
      
      // Add to cart history
      await storage.createCartHistory({
        circleId,
        userId: req.user.userId,
        action: 'added',
        itemName: itemData.name,
        details: { price: itemData.price, quantity: itemData.quantity }
      });

      res.json(item);
    } catch (error) {
      res.status(400).json({ message: 'Invalid cart item data' });
    }
  });

  app.delete('/api/circles/:id/cart/:itemId', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      
      // Check if user is member
      const membership = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this circle' });
      }

      await storage.deleteCartItem(itemId);
      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove item' });
    }
  });

  // Task routes
  app.get('/api/circles/:id/tasks', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      
      // Check if user is member
      const membership = await storage.getUserCircleMembership(req.user.userId, circleId);
      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this circle' });
      }

      const tasks = await storage.getTasks(circleId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get tasks' });
    }
  });

  app.post('/api/circles/:id/tasks', requireAuth, async (req, res) => {
    try {
      const circleId = parseInt(req.params.id);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        circleId,
        createdBy: req.user.userId
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid task data' });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;

      const task = await storage.updateTask(taskId, updates);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get notifications' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize WebSocket manager
  new WebSocketManager(httpServer);

  return httpServer;
}
