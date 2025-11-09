import { Calendar, Clock, FileText, Download, CheckCircle, XCircle } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmployeeDashboard() {
  // Mock data - in real app, this would come from API
  const employeeName = "John Doe";
  const stats = {
    daysPresent: 22,
    totalHours: 176,
    firstEntry: "08:30 AM",
    lastExit: "05:45 PM",
    missedDays: 2,
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <WelcomeCard userName={employeeName} userRole="employee" />
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Days Present This Month"
            value={stats.daysPresent}
            icon={Calendar}
            description="Out of 24 working days"
            trend={{ value: 5, isPositive: true }}
          />
          
          <StatCard
            title="Late Entries"
            value={3}
            icon={Clock}
            description="This month"
            trend={{ value: -25, isPositive: false }}
          />
          
          <StatCard
            title="First Entry Today"
            value={stats.firstEntry}
            icon={CheckCircle}
            description="Main entrance"
          />
          
          <StatCard
            title="Last Exit Today"
            value={stats.lastExit}
            icon={XCircle}
            description="Parking lot"
          />
          
          <StatCard
            title="Missed Days"
            value={stats.missedDays}
            icon={Calendar}
            description="This month"
            trend={{ value: -50, isPositive: false }}
          />

          <StatCard
            title="Average Hours/Day"
            value="8.2"
            icon={Clock}
            description="This month"
            trend={{ value: 3, isPositive: true }}
          />
        </div>

        {/* Personal Actions */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Monthly Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Detailed Logs
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Entry</span>
                  </div>
                  <span className="text-sm text-green-700">08:30 AM</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Break</span>
                  </div>
                  <span className="text-sm text-blue-700">12:30 PM</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Exit</span>
                  </div>
                  <span className="text-sm text-orange-700">05:45 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}