import { Users, Eye, AlertTriangle, FileText, TrendingUp, Clock } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendVideoFeed } from "@/components/BackendVideoFeed";
import { DetectionLogs } from "@/components/DetectionLogs";

export default function AdminDashboard() {
  // Mock data - in real app, this would come from API
  const stats = {
    totalEmployees: 156,
    knownDetections: 2347,
    unknownDetections: 12,
    totalAlerts: 8,
    logsThisMonth: 1245,
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <WelcomeCard userName="Admin" userRole="admin" />
        </div>
        
        {/* Live Video Feed (from backend) */}
        <div className="lg:col-span-12">
          <BackendVideoFeed />
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            description="Registered in system"
            trend={{ value: 12, isPositive: true }}
          />
          
          <StatCard
            title="Known Detections"
            value={stats.knownDetections}
            icon={Eye}
            description="This week"
            trend={{ value: 8, isPositive: true }}
          />
          
          <StatCard
            title="Unknown Detections"
            value={stats.unknownDetections}
            icon={AlertTriangle}
            description="Requires attention"
            trend={{ value: -25, isPositive: false }}
          />
          
          <StatCard
            title="Total Alerts"
            value={stats.totalAlerts}
            icon={AlertTriangle}
            description="This month"
            trend={{ value: -15, isPositive: false }}
          />
          
          <StatCard
            title="Logs This Month"
            value={stats.logsThisMonth}
            icon={FileText}
            description="Entry/Exit records"
            trend={{ value: 18, isPositive: true }}
          />

          <StatCard
            title="System Uptime"
            value="99.8%"
            icon={TrendingUp}
            description="Last 30 days"
            trend={{ value: 2, isPositive: true }}
          />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">John Doe entered</p>
                    <p className="text-xs text-muted-foreground">Main entrance</p>
                  </div>
                  <span className="text-xs text-muted-foreground">2 min ago</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Unknown person detected</p>
                    <p className="text-xs text-muted-foreground">Camera 3</p>
                  </div>
                  <span className="text-xs text-muted-foreground">5 min ago</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Sarah Smith exited</p>
                    <p className="text-xs text-muted-foreground">Parking lot</p>
                  </div>
                  <span className="text-xs text-muted-foreground">12 min ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Detection Logs Section */}
      <div className="mt-6">
        <DetectionLogs />
      </div>
    </div>
  );
}