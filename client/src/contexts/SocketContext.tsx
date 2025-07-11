import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { WebSocketMessage, TypingUser } from "@/types";

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  currentCircleId: number | null;
  joinCircle: (circleId: number) => void;
  leaveCircle: () => void;
  sendMessage: (content: string, replyTo?: number) => void;
  sendTyping: (isTyping: boolean) => void;
  voteItem: (itemId: number, vote: number) => void;
  addCartItem: (name: string, price: number, quantity?: number) => void;
  typingUsers: TypingUser[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCircleId, setCurrentCircleId] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!user || !token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: "auth",
        data: { token }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleSocketMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user, token]);

  const handleSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case "auth_success":
        console.log("WebSocket authenticated");
        break;
      case "auth_error":
        console.error("WebSocket authentication failed:", message.message);
        break;
      case "joined_circle":
        setCurrentCircleId(message.circleId);
        break;
      case "left_circle":
        setCurrentCircleId(null);
        break;
      case "new_message":
        // Handle new message - this could trigger a query refetch
        window.dispatchEvent(new CustomEvent("new_message", { detail: message.message }));
        break;
      case "typing":
        handleTypingMessage(message);
        break;
      case "cart_updated":
        // Handle cart update
        window.dispatchEvent(new CustomEvent("cart_updated", { detail: message.cartItems }));
        break;
      case "item_added":
        // Handle item added
        window.dispatchEvent(new CustomEvent("item_added", { detail: message.item }));
        break;
      case "task_updated":
        // Handle task update
        window.dispatchEvent(new CustomEvent("task_updated", { detail: message.task }));
        break;
      case "user_joined":
      case "user_left":
        // Handle user presence changes
        window.dispatchEvent(new CustomEvent("user_presence", { detail: message }));
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  };

  const handleTypingMessage = (message: WebSocketMessage) => {
    const { userId, userName, isTyping } = message;
    
    setTypingUsers(prev => {
      const filtered = prev.filter(user => user.userId !== userId);
      if (isTyping) {
        return [...filtered, { userId, userName, isTyping }];
      }
      return filtered;
    });

    // Clear typing indicator after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(user => user.userId !== userId));
      }, 3000);
    }
  };

  const joinCircle = (circleId: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: "join_circle",
        data: { circleId }
      }));
    }
  };

  const leaveCircle = () => {
    if (socket && isConnected && currentCircleId) {
      socket.send(JSON.stringify({
        type: "leave_circle",
        data: { circleId: currentCircleId }
      }));
    }
  };

  const sendMessage = (content: string, replyTo?: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: "send_message",
        data: { content, replyTo }
      }));
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: "typing",
        data: { isTyping }
      }));
    }
  };

  const voteItem = (itemId: number, vote: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: "vote_item",
        data: { itemId, vote }
      }));
    }
  };

  const addCartItem = (name: string, price: number, quantity?: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: "add_cart_item",
        data: { name, price, quantity }
      }));
    }
  };

  const value = {
    socket,
    isConnected,
    currentCircleId,
    joinCircle,
    leaveCircle,
    sendMessage,
    sendTyping,
    voteItem,
    addCartItem,
    typingUsers,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
