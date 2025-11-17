import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "admin" | "employee" | "editor";
  userName: string;
}

export function DashboardLayout({ children, userRole, userName }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar userRole={userRole} />
        
        <div className="flex-1 flex flex-col">
          <TopBar userName={userName} userRole={userRole} />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}