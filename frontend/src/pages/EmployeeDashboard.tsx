import { useState } from "react";
import { Calendar, Clock, FileText, Download, CheckCircle, XCircle, Key, AlertCircle } from "lucide-react";
import { WelcomeCard } from "@/components/ui/welcome-card";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mock data - in real app, this would come from API
  const employeeName = user?.username || "Employee";
  const stats = {
    daysPresent: 22,
    totalHours: 176,
    firstEntry: "08:30 AM",
    lastExit: "05:45 PM",
    missedDays: 2,
  };

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

      // If this was a forced password change, the user data should be updated
      // (This will be reflected on next login)
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
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
          {/* Change Password Card */}
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