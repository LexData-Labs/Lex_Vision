import { useState, useEffect } from "react";
import { Users, Eye, AlertTriangle, FileText, TrendingUp, Clock } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetectionLogs } from "@/components/DetectionLogs";
import { api, AttendanceRecord } from "@/services/api";

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    knownDetections: 0,
    unknownDetections: 0,
    totalAlerts: 0,
    logsThisMonth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AttendanceRecord[]>([]);

  // Fetch real data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch attendance records
        const attendanceData = await api.attendance();
        
        // Calculate statistics
        const knownDetections = attendanceData.filter((r: AttendanceRecord) => 
          r.name && r.name !== "Unknown"
        ).length;
        
        const unknownDetections = attendanceData.filter((r: AttendanceRecord) => 
          !r.name || r.name === "Unknown"
        ).length;

        // Get unique employee count
        const uniqueEmployees = new Set(
          attendanceData
            .filter((r: AttendanceRecord) => r.name && r.name !== "Unknown")
            .map((r: AttendanceRecord) => r.employee_id)
        ).size;

        // Get records from this month
        const now = new Date();
        const thisMonth = attendanceData.filter((r: AttendanceRecord) => {
          const recordDate = new Date(r.timestamp);
          return recordDate.getMonth() === now.getMonth() && 
                 recordDate.getFullYear() === now.getFullYear();
        }).length;

        // Get recent activity (last 3 records)
        const recent = attendanceData
          .sort((a: AttendanceRecord, b: AttendanceRecord) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 3);

        setStats({
          totalEmployees: uniqueEmployees,
          knownDetections: knownDetections,
          unknownDetections: unknownDetections,
          totalAlerts: 0, // No alerts system yet
          logsThisMonth: thisMonth,
        });

        setRecentActivity(recent);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Keep default values (0) on error
      }
    };

    // Fetch data initially
    fetchDashboardData();
    
    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchDashboardData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <WelcomeCard userName="Admin" userRole="admin" />
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            description="Detected in system"
          />
          
          <StatCard
            title="Known Detections"
            value={stats.knownDetections}
            icon={Eye}
            description="Recognized faces"
          />
          
          <StatCard
            title="Unknown Detections"
            value={stats.unknownDetections}
            icon={AlertTriangle}
            description="Unrecognized faces"
          />
          
          <StatCard
            title="Total Alerts"
            value={stats.totalAlerts}
            icon={AlertTriangle}
            description="Security alerts"
          />
          
          <StatCard
            title="Logs This Month"
            value={stats.logsThisMonth}
            icon={FileText}
            description="This month's records"
          />

          <StatCard
            title="Total Records"
            value={stats.knownDetections + stats.unknownDetections}
            icon={TrendingUp}
            description="All time detections"
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
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => {
                    const isRecognized = activity.name && activity.name !== "Unknown";
                    const timeAgo = getTimeAgo(new Date(activity.timestamp));

                    return (
                      <div key={`${activity.employee_id}-${activity.timestamp}-${index}`}
                           className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {isRecognized
                                ? `${activity.name} detected`
                                : "Unknown person detected"}
                            </p>
                            {activity.entry_type && (
                              <Badge
                                variant="outline"
                                className={activity.entry_type === "entry"
                                  ? "bg-green-50 text-green-700 border-green-300 text-xs"
                                  : "bg-blue-50 text-blue-700 border-blue-300 text-xs"}
                              >
                                {activity.entry_type === "entry" ? "Entry" : "Exit"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ID: {activity.employee_id}
                            {activity.camera_id && ` • ${activity.camera_id}`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{timeAgo}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
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