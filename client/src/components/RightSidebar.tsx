import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartItem, Task } from "@/types";
import { ThumbsUp, ThumbsDown, ShoppingBag, Plus, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface RightSidebarProps {
  circleId: number;
  activeTab: string;
}

export function RightSidebar({ circleId, activeTab }: RightSidebarProps) {
  const { user, token } = useAuth();
  const { voteItem, addCartItem } = useSocket();
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const queryClient = useQueryClient();

  const { data: cartItems = [] } = useQuery({
    queryKey: ["/api/circles", circleId, "cart"],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
    enabled: !!circleId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/circles", circleId, "tasks"],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
    enabled: !!circleId,
  });

  useEffect(() => {
    const handleCartUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles", circleId, "cart"] });
    };

    const handleItemAdded = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles", circleId, "cart"] });
    };

    window.addEventListener("cart_updated", handleCartUpdate);
    window.addEventListener("item_added", handleItemAdded);

    return () => {
      window.removeEventListener("cart_updated", handleCartUpdate);
      window.removeEventListener("item_added", handleItemAdded);
    };
  }, [circleId, queryClient]);

  const handleVote = (itemId: number, vote: number) => {
    voteItem(itemId, vote);
  };

  const handleAddItem = () => {
    if (newItemName.trim() && newItemPrice.trim()) {
      const price = Math.round(parseFloat(newItemPrice) * 100); // Convert to cents
      addCartItem(newItemName.trim(), price, 1);
      setNewItemName("");
      setNewItemPrice("");
      setShowAddItem(false);
    }
  };

  const getVoteScore = (votes: any[]) => {
    return votes.reduce((sum, vote) => sum + vote.vote, 0);
  };

  const getUserVote = (votes: any[]) => {
    const userVote = votes.find(v => v.userId === user?.id);
    return userVote ? userVote.vote : 0;
  };

  const cartTotal = cartItems.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Cart Summary */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Shopping Cart</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{cartItems.length} items</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showAddItem && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <Input
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <Input
                placeholder="Price (e.g., 4.99)"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                type="number"
                step="0.01"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleAddItem}>
                  Add Item
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddItem(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {cartItems.map((item: CartItem) => {
              const userVote = getUserVote(item.votes);
              const voteScore = getVoteScore(item.votes);
              
              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        ${(item.price / 100).toFixed(2)} • Added by {item.user.firstName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleVote(item.id, 1)}
                        className={`${
                          userVote === 1 ? "text-[hsl(var(--success))]" : "text-gray-400"
                        } hover:text-[hsl(var(--success))] transition-colors`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        {voteScore}
                      </span>
                      <button
                        onClick={() => handleVote(item.id, -1)}
                        className={`${
                          userVote === -1 ? "text-[hsl(var(--error))]" : "text-gray-400"
                        } hover:text-[hsl(var(--error))] transition-colors`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Cart Total</span>
              <span className="text-lg font-semibold text-primary">
                ${(cartTotal / 100).toFixed(2)}
              </span>
            </div>
            <Button className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Shopping Tasks</h3>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.map((task: Task) => (
              <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={task.completed}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  {task.assignedUser && (
                    <p className="text-sm text-gray-500">
                      Assigned to: {task.assignedUser.firstName} {task.assignedUser.lastName}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-[hsl(var(--warning))]">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Active Members</h3>
          <div className="space-y-3">
            {/* This would be populated with real member data */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[hsl(var(--success))] rounded-full border-2 border-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h4>
                <p className="text-xs text-gray-500">Active now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
