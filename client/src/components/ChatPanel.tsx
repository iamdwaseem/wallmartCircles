import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "@/types";
import { Send, Reply, Heart, Paperclip, Smile } from "lucide-react";

interface ChatPanelProps {
  circleId: number;
  isActive: boolean;
}

export function ChatPanel({ circleId, isActive }: ChatPanelProps) {
  const { user, token } = useAuth();
  const { sendMessage, sendTyping, typingUsers } = useSocket();
  const [messageInput, setMessageInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/circles", circleId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
    enabled: !!circleId,
  });

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles", circleId, "messages"] });
    };

    window.addEventListener("new_message", handleNewMessage as EventListener);
    return () => window.removeEventListener("new_message", handleNewMessage as EventListener);
  }, [circleId, queryClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput.trim(), replyingTo?.id);
      setMessageInput("");
      setReplyingTo(null);
      setIsTyping(false);
      sendTyping(false);
    }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      sendTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      sendTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (userId: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
    ];
    return colors[userId % colors.length];
  };

  if (!isActive) return null;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 ${getAvatarColor(message.userId)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
              {getInitials(message.user.firstName, message.user.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {message.user.firstName} {message.user.lastName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <div className="mt-1 text-gray-700">{message.content}</div>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <button
                  onClick={() => setReplyingTo(message)}
                  className="hover:text-primary transition-colors"
                >
                  <Reply className="w-4 h-4 mr-1 inline" />
                  Reply
                </button>
                <button className="hover:text-primary transition-colors">
                  <Heart className="w-4 h-4 mr-1 inline" />
                  React
                </button>
              </div>

              {/* Thread Replies */}
              {message.replies && message.replies.length > 0 && (
                <div className="mt-3 ml-4 border-l-2 border-gray-200 pl-4 space-y-3">
                  {message.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start space-x-3">
                      <div className={`w-6 h-6 ${getAvatarColor(reply.userId)} rounded-full flex items-center justify-center text-white text-xs font-medium`}>
                        {getInitials(reply.user.firstName, reply.user.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {reply.user.firstName} {reply.user.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(reply.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-gray-700">{reply.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-3 text-gray-500">
            <div className="w-8 h-8 bg-gray-300 rounded-full" />
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animate-bounce-delayed" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animate-bounce-delayed" />
            </div>
            <span className="text-sm">
              {typingUsers.map(u => u.userName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Replying to <span className="font-medium">{replyingTo.user.firstName}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-gray-700 mt-1 truncate">
            {replyingTo.content}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-20"
            />
            <div className="absolute right-3 top-2.5 flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
