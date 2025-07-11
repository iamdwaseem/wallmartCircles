import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Circle } from "@/types";
import { Users, Plus, LogOut } from "lucide-react";

interface SidebarProps {
  circles: Circle[];
  selectedCircleId: number | null;
  onCircleSelect: (circleId: number) => void;
  onCreateCircle: () => void;
}

export function Sidebar({ circles, selectedCircleId, onCircleSelect, onCreateCircle }: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getCircleColor = (index: number) => {
    const colors = [
      "bg-[hsl(var(--walmart-blue))]",
      "bg-[hsl(var(--walmart-yellow))]",
      "bg-[hsl(var(--success))]",
      "bg-[hsl(var(--warning))]",
      "bg-[hsl(var(--error))]",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
            {getInitials(user.firstName, user.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Circle Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">My Circles</h2>
            <Button variant="ghost" size="sm" onClick={onCreateCircle}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {circles.map((circle, index) => (
              <button
                key={circle.id}
                onClick={() => onCircleSelect(circle.id)}
                className={`w-full flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedCircleId === circle.id
                    ? "bg-gray-100 border-l-4 border-primary"
                    : ""
                }`}
              >
                <div className={`w-8 h-8 ${getCircleColor(index)} rounded-full flex items-center justify-center mr-3`}>
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="font-medium text-gray-900 truncate">
                    {circle.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {circle.memberCount} members
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-2 h-2 bg-[hsl(var(--success))] rounded-full mb-1" />
                  <div className="text-xs bg-[hsl(var(--error))] text-white px-2 py-1 rounded-full">
                    {Math.floor(Math.random() * 5)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200">
        <Button onClick={onCreateCircle} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Create Circle
        </Button>
      </div>
    </div>
  );
}
