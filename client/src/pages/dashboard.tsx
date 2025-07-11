import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { RightSidebar } from "@/components/RightSidebar";
import { CreateCircleModal } from "@/components/CreateCircleModal";
import { Button } from "@/components/ui/button";
import { Circle } from "@/types";
import { Users, ShoppingCart, CheckSquare, BarChart3, Settings, Bell } from "lucide-react";

type TabType = "chat" | "cart" | "tasks" | "analytics";

export default function Dashboard() {
  const { user, token } = useAuth();
  const { joinCircle, leaveCircle, currentCircleId } = useSocket();
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: circles = [] } = useQuery({
    queryKey: ["/api/circles"],
    queryFn: async () => {
      const response = await fetch("/api/circles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  });

  const { data: selectedCircle } = useQuery({
    queryKey: ["/api/circles", selectedCircleId],
    queryFn: async () => {
      if (!selectedCircleId) return null;
      const response = await fetch(`/api/circles/${selectedCircleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
    enabled: !!selectedCircleId,
  });

  const handleCircleSelect = (circleId: number) => {
    if (currentCircleId && currentCircleId !== circleId) {
      leaveCircle();
    }
    setSelectedCircleId(circleId);
    joinCircle(circleId);
  };

  const handleCreateCircle = () => {
    setShowCreateModal(true);
  };

  const tabs = [
    { id: "chat", label: "Chat", icon: Users },
    { id: "cart", label: "Cart", icon: ShoppingCart },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        circles={circles}
        selectedCircleId={selectedCircleId}
        onCircleSelect={handleCircleSelect}
        onCreateCircle={handleCreateCircle}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[hsl(var(--walmart-blue))] rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {selectedCircle?.name || "Select a Circle"}
                  </h1>
                  {selectedCircle && (
                    <p className="text-sm text-gray-500">
                      {selectedCircle.memberCount} members • {selectedCircle.onlineCount} online
                    </p>
                  )}
                </div>
              </div>

              {selectedCircle && (
                <div className="ml-8 flex items-center space-x-4">
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <div className="text-sm text-gray-500">Budget</div>
                    <div className="font-semibold text-gray-900">
                      ${(selectedCircle.budget / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <div className="text-sm text-gray-500">Spent</div>
                    <div className="font-semibold text-primary">
                      ${(selectedCircle.spent / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <div className="text-sm text-gray-500">Remaining</div>
                    <div className="font-semibold text-[hsl(var(--success))]">
                      ${((selectedCircle.budget - selectedCircle.spent) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {selectedCircle && (
            <div className="mt-4 flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {selectedCircle ? (
            <>
              <ChatPanel
                circleId={selectedCircle.id}
                isActive={activeTab === "chat"}
              />
              <RightSidebar
                circleId={selectedCircle.id}
                activeTab={activeTab}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Walmart Circle
                </h2>
                <p className="text-gray-500 mb-4">
                  Select a circle to start collaborating or create a new one
                </p>
                <Button onClick={handleCreateCircle}>
                  Create Your First Circle
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
