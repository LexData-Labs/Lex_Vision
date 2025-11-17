import { useState, useEffect } from "react";
import { Clock, Save, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkScheduleSettings {
  officeEntryTime: string;
  officeExitTime: string;
  lateThresholdMinutes: number;
  breakDurationMinutes: number;
}

export default function WorkSchedule() {
  const [settings, setSettings] = useState<WorkScheduleSettings>({
    officeEntryTime: "09:00",
    officeExitTime: "17:00",
    lateThresholdMinutes: 15,
    breakDurationMinutes: 60,
  });
  const [savedMessage, setSavedMessage] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("workScheduleSettings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("workScheduleSettings", JSON.stringify(settings));
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      alert("Failed to save settings");
    }
  };

  const calculateWorkHours = () => {
    const [entryHour, entryMinute] = settings.officeEntryTime.split(":").map(Number);
    const [exitHour, exitMinute] = settings.officeExitTime.split(":").map(Number);

    const entryTotalMinutes = entryHour * 60 + entryMinute;
    const exitTotalMinutes = exitHour * 60 + exitMinute;

    const totalMinutes = exitTotalMinutes - entryTotalMinutes - settings.breakDurationMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Work Schedule Settings</h1>
        <p className="text-muted-foreground mt-1">Configure office timing and break policies</p>
      </div>

      {savedMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Office Timing */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Office Timing
            </CardTitle>
            <CardDescription>
              Set standard office hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-time">Office Entry Time</Label>
              <Input
                id="entry-time"
                type="time"
                value={settings.officeEntryTime}
                onChange={(e) => setSettings({ ...settings, officeEntryTime: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Standard time employees should arrive
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit-time">Office Exit Time</Label>
              <Input
                id="exit-time"
                type="time"
                value={settings.officeExitTime}
                onChange={(e) => setSettings({ ...settings, officeExitTime: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Standard time employees can leave
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Total Work Hours (excluding break)</p>
              <p className="text-2xl font-bold text-primary mt-1">{calculateWorkHours()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Policy Settings */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Policy Settings
            </CardTitle>
            <CardDescription>
              Configure late arrival and break policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="late-threshold">Late Arrival Threshold (minutes)</Label>
              <Input
                id="late-threshold"
                type="number"
                min="0"
                value={settings.lateThresholdMinutes}
                onChange={(e) => setSettings({ ...settings, lateThresholdMinutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                How many minutes late before marking as late arrival
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="break-duration">Break Duration (minutes)</Label>
              <Input
                id="break-duration"
                type="number"
                min="0"
                value={settings.breakDurationMinutes}
                onChange={(e) => setSettings({ ...settings, breakDurationMinutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Total break time allowed per day
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Late if arrives after:</span>
                <span className="font-medium">
                  {(() => {
                    const [hour, minute] = settings.officeEntryTime.split(":").map(Number);
                    const lateMinute = minute + settings.lateThresholdMinutes;
                    const lateHour = hour + Math.floor(lateMinute / 60);
                    const finalMinute = lateMinute % 60;
                    return `${String(lateHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Break allowance:</span>
                <span className="font-medium">{Math.floor(settings.breakDurationMinutes / 60)}h {settings.breakDurationMinutes % 60}m</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Information Card */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Entry Time</p>
              <p className="text-xl font-bold">{settings.officeEntryTime}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Exit Time</p>
              <p className="text-xl font-bold">{settings.officeExitTime}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Late Threshold</p>
              <p className="text-xl font-bold">{settings.lateThresholdMinutes} min</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Break Duration</p>
              <p className="text-xl font-bold">{settings.breakDurationMinutes} min</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
