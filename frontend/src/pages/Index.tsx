import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white shadow-elegant border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  LexVision
                </h1>
                <p className="text-sm text-muted-foreground">Face Recognition Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            AI-Powered CCTV Face Recognition
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced security system with intelligent face detection and comprehensive monitoring capabilities
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Administrator</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Full system control with access to all monitoring features, user management, and security settings.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• View all system logs and alerts</li>
                <li>• Manage employee database</li>
                <li>• Configure face recognition models</li>
                <li>• Monitor live camera feeds</li>
              </ul>
              <Link to="/admin/dashboard">
                <Button className="w-full mt-6 bg-gradient-primary hover:bg-gradient-primary/90">
                  Access Admin Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Employee</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Personal dashboard to view your attendance logs, work hours, and manage your profile.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• View personal attendance logs</li>
                <li>• Track work hours and presence</li>
                <li>• Download attendance reports</li>
                <li>• Manage personal profile</li>
              </ul>
              <Link to="/employee/dashboard">
                <Button className="w-full mt-6" variant="outline">
                  Access Employee Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold mb-8">System Features</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white rounded-lg shadow-elegant">
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Real-time Recognition</h4>
              <p className="text-sm text-muted-foreground">
                Advanced AI algorithms for instant face detection and identification
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-elegant">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Secure Access Control</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive security monitoring with alert systems
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-elegant">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">User Management</h4>
              <p className="text-sm text-muted-foreground">
                Efficient employee database and attendance tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
