import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bell, CheckCircle, XCircle, Clock, User, Camera, Shield } from "lucide-react";
import { api, Alert } from "@/services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch real alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alertsData = await api.alerts();
        console.log('Fetched alerts:', alertsData);
        setAlerts(alertsData);
        setFilteredAlerts(alertsData);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        // Keep empty array on error
        setAlerts([]);
        setFilteredAlerts([]);
      }
    };

    // Fetch initially
    fetchAlerts();

    // Poll for new alerts every 5 seconds
    const interval = setInterval(fetchAlerts, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Apply severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(alert => alert.category === categoryFilter);
    }

    setFilteredAlerts(filtered);
  }, [alerts, severityFilter, statusFilter, categoryFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security":
        return <Shield className="h-4 w-4" />;
      case "face_recognition":
        return <User className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      case "system":
        return <AlertTriangle className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.updateAlert(alertId, "acknowledged", "admin@company.com");
      // Update local state
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: "acknowledged" as const, acknowledgedBy: "admin@company.com", acknowledgedAt: new Date().toISOString() }
          : alert
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await api.updateAlert(alertId, "resolved");
      // Update local state
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: "resolved" as const }
          : alert
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getActiveAlertsCount = () => alerts.filter(alert => alert.status === "active").length;
  const getCriticalAlertsCount = () => alerts.filter(alert => alert.severity === "critical" && alert.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage security alerts and system notifications
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {getActiveAlertsCount()} Active
          </Badge>
          {getCriticalAlertsCount() > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {getCriticalAlertsCount()} Critical
            </Badge>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getActiveAlertsCount()}</p>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.filter(a => a.status === "acknowledged").length}</p>
                <p className="text-sm text-muted-foreground">Acknowledged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.filter(a => a.status === "resolved").length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Camera className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.filter(a => a.category === "camera").length}</p>
                <p className="text-sm text-muted-foreground">Camera Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="face_recognition">Face Recognition</SelectItem>
                <SelectItem value="camera">Camera</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Details</CardTitle>
          <CardDescription>
            Manage and respond to security alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        {getCategoryIcon(alert.category)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{alert.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(alert.status)}>
                            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">
                            {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                          </Badge>
                          <Badge variant="secondary">
                            {alert.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-3">{alert.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                      {alert.location && (
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {alert.location}
                        </div>
                      )}
                      {alert.cameraId && (
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {alert.cameraId}
                        </div>
                      )}
                    </div>

                    {alert.acknowledgedBy && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt!).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {alert.status === "active" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === "acknowledged" && (
                      <Button 
                        size="sm" 
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No alerts found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
