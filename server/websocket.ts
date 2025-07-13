import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";
import { storage } from "./storage";
import type { Server } from "http";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  circleId?: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
  circleId?: number;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket[]> = new Map(); // userId -> WebSocket[]
  private circleRooms: Map<number, Set<string>> = new Map(); // circleId -> Set of userIds

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('New WebSocket connection');

      ws.on('message', async (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.data);
        break;
      case 'join_circle':
        await this.handleJoinCircle(ws, message.data);
        break;
      case 'leave_circle':
        await this.handleLeaveCircle(ws, message.data);
        break;
      case 'send_message':
        await this.handleSendMessage(ws, message.data);
        break;
      case 'typing':
        await this.handleTyping(ws, message.data);
        break;
      case 'vote_item':
        await this.handleVoteItem(ws, message.data);
        break;
      case 'add_cart_item':
        await this.handleAddCartItem(ws, message.data);
        break;
      case 'update_task':
        await this.handleUpdateTask(ws, message.data);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private async handleAuth(ws: AuthenticatedWebSocket, data: { token: string }) {
    const decoded = verifyToken(data.token);
    if (!decoded) {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
      return;
    }

    ws.userId = decoded.userId;
    
    // Add to clients map
    if (!this.clients.has(decoded.userId)) {
      this.clients.set(decoded.userId, []);
    }
    this.clients.get(decoded.userId)!.push(ws);

    ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.userId }));
  }

  private async handleJoinCircle(ws: AuthenticatedWebSocket, data: { circleId: number }) {
    if (!ws.userId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
      return;
    }

    const { circleId } = data;
    
    // Verify user is member of circle
    const membership = await storage.getUserCircleMembership(ws.userId, circleId);
    if (!membership) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not a member of this circle' }));
      return;
    }

    ws.circleId = circleId;
    
    // Add to circle room
    if (!this.circleRooms.has(circleId)) {
      this.circleRooms.set(circleId, new Set());
    }
    this.circleRooms.get(circleId)!.add(ws.userId);

    // Notify others in circle
    this.broadcastToCircle(circleId, {
      type: 'user_joined',
      userId: ws.userId
    }, ws.userId);

    ws.send(JSON.stringify({ type: 'joined_circle', circleId }));
  }

  private async handleLeaveCircle(ws: AuthenticatedWebSocket, data: { circleId: number }) {
    if (!ws.userId) return;

    const { circleId } = data;
    
    // Remove from circle room
    if (this.circleRooms.has(circleId)) {
      this.circleRooms.get(circleId)!.delete(ws.userId);
    }

    // Notify others in circle
    this.broadcastToCircle(circleId, {
      type: 'user_left',
      userId: ws.userId
    }, ws.userId);

    ws.circleId = undefined;
    ws.send(JSON.stringify({ type: 'left_circle', circleId }));
  }

  private async handleSendMessage(ws: AuthenticatedWebSocket, data: { content: string, replyTo?: number }) {
    if (!ws.userId || !ws.circleId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated or not in a circle' }));
      return;
    }

    const message = await storage.createMessage({
      circle_id: ws.circleId,
      user_id: ws.userId,
      content: data.content,
      reply_to: data.replyTo || null
    });

    const user = await storage.getUser(ws.userId);
    
    // Broadcast to all circle members
    this.broadcastToCircle(ws.circleId, {
      type: 'new_message',
      message: {
        ...message,
        user
      }
    });

    // Create notifications for other members
    const members = await storage.getCircleMembers(ws.circleId);
    for (const member of members) {
      if (member.user_id !== ws.userId) {
        await storage.createNotification({
          user_id: member.user_id,
          circle_id: ws.circleId,
          type: 'new_message',
          title: 'New message',
          message: `${user?.first_name} ${user?.last_name} sent a message`,
          read: false
        });
      }
    }
  }

  private async handleTyping(ws: AuthenticatedWebSocket, data: { isTyping: boolean }) {
    if (!ws.userId || !ws.circleId) return;

    const user = await storage.getUser(ws.userId);
    
    this.broadcastToCircle(ws.circleId, {
      type: 'typing',
      userId: ws.userId,
      userName: `${user?.first_name} ${user?.last_name}`,
      isTyping: data.isTyping
    }, ws.userId);
  }

  private async handleVoteItem(ws: AuthenticatedWebSocket, data: { itemId: number, vote: number }) {
    if (!ws.userId || !ws.circleId) return;

    const existingVote = await storage.getItemVote(data.itemId, ws.userId);
    
    if (existingVote) {
      if (existingVote.vote === data.vote) {
        // Remove vote if same vote
        await storage.deleteItemVote(data.itemId, ws.userId);
      } else {
        // Update vote
        await storage.updateItemVote(data.itemId, ws.userId, data.vote);
      }
    } else {
      // Create new vote
      await storage.createItemVote({
        item_id: data.itemId,
        user_id: ws.userId,
        vote: data.vote
      });
    }

    // Get updated cart items
    const cartItems = await storage.getCartItems(ws.circleId);
    
    this.broadcastToCircle(ws.circleId, {
      type: 'cart_updated',
      cartItems
    });
  }

  private async handleAddCartItem(ws: AuthenticatedWebSocket, data: { name: string, price: number, quantity?: number }) {
    if (!ws.userId || !ws.circleId) return;

    const item = await storage.createCartItem({
      circle_id: ws.circleId,
      name: data.name,
      price: Math.round(data.price * 100), // Convert to cents
      quantity: data.quantity || 1,
      added_by: ws.userId,
      assigned_to: null
    });

    // Add to cart history
    await storage.createCartHistory({
      circle_id: ws.circleId,
      user_id: ws.userId,
      action: 'added',
      item_name: data.name,
      details: { price: Math.round(data.price * 100), quantity: data.quantity || 1 }
    });

    // Update circle spent amount
    const circle = await storage.getCircle(ws.circleId);
    if (circle) {
      await storage.updateCircle(ws.circleId, {
        spent: circle.spent + (Math.round(data.price * 100) * (data.quantity || 1))
      });
    }

    const user = await storage.getUser(ws.userId);
    
    this.broadcastToCircle(ws.circleId, {
      type: 'item_added',
      item: {
        ...item,
        user
      }
    });

    // Create notifications
    const members = await storage.getCircleMembers(ws.circleId);
    for (const member of members) {
      if (member.user_id !== ws.userId) {
        await storage.createNotification({
          user_id: member.user_id,
          circle_id: ws.circleId,
          type: 'item_added',
          title: 'New item added',
          message: `${user?.first_name} ${user?.last_name} added ${data.name} to the cart`,
          read: false
        });
      }
    }
  }

  private async handleUpdateTask(ws: AuthenticatedWebSocket, data: { taskId: number, updates: any }) {
    if (!ws.userId || !ws.circleId) return;

    const task = await storage.updateTask(data.taskId, data.updates);
    if (!task) return;

    const user = await storage.getUser(ws.userId);
    
    this.broadcastToCircle(ws.circleId, {
      type: 'task_updated',
      task,
      updatedBy: user
    });
  }

  private handleDisconnect(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      // Remove from clients map
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        const index = userClients.indexOf(ws);
        if (index > -1) {
          userClients.splice(index, 1);
        }
        if (userClients.length === 0) {
          this.clients.delete(ws.userId);
        }
      }

      // Remove from circle room
      if (ws.circleId) {
        const circleUsers = this.circleRooms.get(ws.circleId);
        if (circleUsers) {
          circleUsers.delete(ws.userId);
          
          // Notify others in circle
          this.broadcastToCircle(ws.circleId, {
            type: 'user_left',
            userId: ws.userId
          }, ws.userId);
        }
      }
    }
  }

  private broadcastToCircle(circleId: number, message: any, excludeUserId?: string) {
    const circleUsers = this.circleRooms.get(circleId);
    if (!circleUsers) return;

    for (const userId of circleUsers) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      const userClients = this.clients.get(userId);
      if (userClients) {
        const messageStr = JSON.stringify(message);
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      }
    }
  }

  public broadcastToUser(userId: string, message: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const messageStr = JSON.stringify(message);
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }
}