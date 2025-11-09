import { Calendar, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  userName: string;
  userRole: "admin" | "employee";
}

export function TopBar({ userName, userRole }: TopBarProps) {
  const { logout } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-gradient-card border-b flex items-center justify-between px-6 shadow-elegant">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{currentDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">Welcome back, {userName}!</p>
          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-avatar.jpg" alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="ml-2"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}