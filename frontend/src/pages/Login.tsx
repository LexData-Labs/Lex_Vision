import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Eye, EyeOff, AlertCircle, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const success = await login(username, password);
    
    if (success) {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } else {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex items-center justify-center p-6 pt-8 pb-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LexVision
            </h1>
            <p className="text-muted-foreground mt-2">Face Recognition Dashboard</p>
          </div>

          {/* Login Form */}
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <p className="text-muted-foreground">Enter your credentials to access the system</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-white/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/50 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-2">Demo Credentials:</p>
                    <div className="space-y-1 text-blue-800">
                      <p><strong>Administrator:</strong> admin / admin</p>
                      <p><strong>Employee:</strong> employee / employee</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Overview - Below login form */}
      <div className="py-2 px-6">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-8 bg-gradient-primary bg-clip-text text-transparent">System Features</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-gradient-card rounded-lg shadow-elegant border-0 hover:shadow-glow transition-all duration-300">
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Real-time Recognition</h4>
              <p className="text-sm text-muted-foreground">
                Advanced AI algorithms for instant face detection and identification
              </p>
            </div>
            <div className="p-6 bg-gradient-card rounded-lg shadow-elegant border-0 hover:shadow-glow transition-all duration-300">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Secure Access Control</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive security monitoring with alert systems
              </p>
            </div>
            <div className="p-6 bg-gradient-card rounded-lg shadow-elegant border-0 hover:shadow-glow transition-all duration-300">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">User Management</h4>
              <p className="text-sm text-muted-foreground">
                Efficient employee database and attendance tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-sm text-muted-foreground">
        <p>AI-Powered CCTV Face Recognition System</p>
      </div>
    </div>
  );
};

export default Login;