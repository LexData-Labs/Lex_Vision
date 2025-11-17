import { useState, useEffect } from "react";
import { Users, Clock, Calendar, Camera, TrendingUp, AlertTriangle } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { api, AttendanceRecord } from "@/services/api";

export default function EditorDashboard() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const editorName = user?.username || "Editor";

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendance, employees] = await Promise.all([
          api.attendance(),
          api.employees()
        ]);
        setAttendanceData(attendance);
        setEmployeeCount(employees.length);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    const now = new Date();
    const today = now.toDateString();

    // Filter today's records
    const todayRecords = attendanceData.filter((record) => {
      const recordDate = new Date(record.timestamp);
      return recordDate.toDateString() === today;
    });

    // Count unique employees present today
    const uniqueEmployeesToday = new Set(todayRecords.map(r => r.employee_id));
    const presentToday = uniqueEmployeesToday.size;

    // Count entries and exits
    const entries = todayRecords.filter(r => r.entry_type === "entry").length;
    const exits = todayRecords.filter(r => r.entry_type === "exit").length;

    // Total records
    const totalRecords = attendanceData.length;

    return {
      presentToday,
      entries,
      exits,
      totalRecords,
      todayRecords,
    };
  };

  const stats = loading ? {
    presentToday: 0,
    entries: 0,
    exits: 0,
    totalRecords: 0,
    todayRecords: [],
  } : calculateStats();

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <WelcomeCard userName={editorName} userRole="editor" />
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={employeeCount}
            icon={Users}
            description="In the system"
          />

          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={TrendingUp}
            description="Employees checked in"
          />

          <StatCard
            title="Entries Today"
            value={stats.entries}
            icon={Calendar}
            description="Check-ins recorded"
          />

          <StatCard
            title="Exits Today"
            value={stats.exits}
            icon={Clock}
            description="Check-outs recorded"
          />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-12">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Attendance Activity
              </CardTitle>
              <CardDescription>
                Latest 10 attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-semibold">Employee ID</th>
                        <th className="text-left p-4 font-semibold">Name</th>
                        <th className="text-left p-4 font-semibold">Type</th>
                        <th className="text-left p-4 font-semibold">Time</th>
                        <th className="text-left p-4 font-semibold">Camera</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.todayRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No attendance records for today
                          </td>
                        </tr>
                      ) : (
                        stats.todayRecords
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 10)
                          .map((record: AttendanceRecord, index: number) => (
                            <tr key={index} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-medium">{record.employee_id}</td>
                              <td className="p-4">{record.name}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  record.entry_type === "entry"
                                    ? "bg-green-100 text-green-800"
                                    : record.entry_type === "exit"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {record.entry_type || "Unknown"}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {new Date(record.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {record.camera_id || "N/A"}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
