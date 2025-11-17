import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, FileText, Download, CheckCircle, XCircle, Key, AlertCircle } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { api, AttendanceRecord } from "@/services/api";

export default function EmployeeDashboard() {
  const { user, updatePasswordResetStatus } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const employeeName = user?.username || "Employee";

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const data = await api.attendance();
        // Filter to show only current employee's records
        const myRecords = data.filter((record: AttendanceRecord) => record.employee_id === user?.employee_id);
        setAttendanceData(myRecords);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.employee_id) {
      fetchAttendance();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAttendance, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.employee_id]);

  // Calculate statistics from real data
  const calculateStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.toDateString();

    // Filter records for current month
    const monthRecords = attendanceData.filter((record) => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    // Filter records for today
    const todayRecords = attendanceData.filter((record) => {
      const recordDate = new Date(record.timestamp);
      return recordDate.toDateString() === today;
    });

    // Count unique days present this month
    const uniqueDays = new Set(
      monthRecords.map((record) => new Date(record.timestamp).toDateString())
    );
    const daysPresent = uniqueDays.size;

    // Get today's entry and exit
    const entryRecords = todayRecords.filter((r) => r.entry_type === "entry");
    const exitRecords = todayRecords.filter((r) => r.entry_type === "exit");

    const firstEntry = entryRecords.length > 0
      ? new Date(entryRecords[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "N/A";

    const lastExit = exitRecords.length > 0
      ? new Date(exitRecords[exitRecords.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "N/A";

    // Calculate total hours (rough estimate based on entry/exit pairs)
    let totalMinutes = 0;
    const dayMap = new Map<string, { entry?: Date; exit?: Date }>();

    monthRecords.forEach((record) => {
      const day = new Date(record.timestamp).toDateString();
      if (!dayMap.has(day)) {
        dayMap.set(day, {});
      }
      const dayData = dayMap.get(day)!;
      if (record.entry_type === "entry" && !dayData.entry) {
        dayData.entry = new Date(record.timestamp);
      } else if (record.entry_type === "exit") {
        dayData.exit = new Date(record.timestamp);
      }
    });

    dayMap.forEach((dayData) => {
      if (dayData.entry && dayData.exit) {
        const diff = dayData.exit.getTime() - dayData.entry.getTime();
        totalMinutes += diff / (1000 * 60);
      }
    });

    const totalHours = Math.round(totalMinutes / 60);
    const avgHoursPerDay = daysPresent > 0 ? (totalMinutes / 60 / daysPresent).toFixed(1) : "0.0";

    return {
      daysPresent,
      totalHours,
      firstEntry,
      lastExit,
      avgHoursPerDay,
      todayRecords,
    };
  };

  const stats = loading ? {
    daysPresent: 0,
    totalHours: 0,
    firstEntry: "Loading...",
    lastExit: "Loading...",
    avgHoursPerDay: "0.0",
    todayRecords: [],
  } : calculateStats();

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    try {
      setIsChangingPassword(true);

      // First verify current password by attempting login
      const loginSuccess = await api.login({
        username: user?.employee_id || "",
        password: currentPassword
      });

      if (!loginSuccess) {
        setPasswordError("Current password is incorrect");
        return;
      }

      // If login successful, reset password
      await api.resetPassword(user?.employee_id || "", newPassword);

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update the password reset required flag in the session
      updatePasswordResetStatus(false);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDownloadReport = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter records for current month
    const monthRecords = attendanceData.filter((record) => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    // Create CSV
    const csv = [
      ["Date", "Time", "Type", "Camera"],
      ...monthRecords.map(record => [
        new Date(record.timestamp).toLocaleDateString(),
        new Date(record.timestamp).toLocaleTimeString(),
        record.entry_type || "Unknown",
        record.camera_id || "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      {/* Password Reset Required Alert */}
      {user?.password_reset_required && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Password Change Required:</strong> Your password must be changed for security reasons. Please update your password below.
          </AlertDescription>
        </Alert>
      )}

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
            description="This month"
          />

          <StatCard
            title="Total Hours This Month"
            value={stats.totalHours}
            icon={Clock}
            description="Hours worked"
          />

          <StatCard
            title="First Entry Today"
            value={stats.firstEntry}
            icon={CheckCircle}
            description={stats.firstEntry !== "N/A" ? "Entry time" : "No entry yet"}
          />

          <StatCard
            title="Last Exit Today"
            value={stats.lastExit}
            icon={XCircle}
            description={stats.lastExit !== "N/A" ? "Exit time" : "No exit yet"}
          />

          <StatCard
            title="Average Hours/Day"
            value={stats.avgHoursPerDay}
            icon={Clock}
            description="This month"
          />

          <StatCard
            title="Total Records"
            value={attendanceData.length}
            icon={FileText}
            description="All time"
          />
        </div>

        {/* Personal Actions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Change Password Card - Only show when password reset is required */}
          {user?.password_reset_required && (
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Password changed successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {passwordError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {passwordError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your attendance records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleDownloadReport}
                disabled={attendanceData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Monthly Report
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/employee/my-logs')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Detailed Logs
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Timeline
              </CardTitle>
              <CardDescription>
                {stats.todayRecords && stats.todayRecords.length > 0
                  ? `${stats.todayRecords.length} record${stats.todayRecords.length > 1 ? 's' : ''} today`
                  : "Your attendance records for today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.todayRecords && stats.todayRecords.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                  {stats.todayRecords
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((record: AttendanceRecord, index: number) => {
                      const isEntry = record.entry_type === "entry";
                      const bgColor = isEntry ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200";
                      const textColor = isEntry ? "text-green-700" : "text-orange-700";
                      const iconColor = isEntry ? "text-green-600" : "text-orange-600";
                      const Icon = isEntry ? CheckCircle : XCircle;
                      const label = isEntry ? "Entry" : "Exit";

                      return (
                        <div key={index} className={`flex items-center justify-between p-3 ${bgColor} border rounded-lg`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${iconColor}`} />
                            <span className="text-sm font-medium">{label}</span>
                            {record.camera_id && (
                              <span className="text-xs text-muted-foreground">({record.camera_id})</span>
                            )}
                          </div>
                          <span className={`text-sm ${textColor}`}>
                            {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No attendance records for today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}