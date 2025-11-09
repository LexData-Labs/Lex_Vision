import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface WelcomeCardProps {
  userName: string;
  userRole: "admin" | "employee";
}

export function WelcomeCard({ userName, userRole }: WelcomeCardProps) {
  const roleMessages = {
    admin: "Manage your AI-powered CCTV system with complete control and oversight.",
    employee: "View your attendance logs and manage your personal profile.",
  };

  return (
    <Card className="col-span-full bg-gradient-primary border-0 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm opacity-90">
                {userRole === "admin" ? "Administrator" : "Employee"} Dashboard
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-white/80 max-w-md">
              {roleMessages[userRole]}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}