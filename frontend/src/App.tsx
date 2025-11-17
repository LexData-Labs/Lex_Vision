import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./pages/DashboardLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EditorDashboard from "./pages/EditorDashboard";
import EditorEmployees from "./pages/EditorEmployees";
import EditorLogs from "./pages/EditorLogs";
import EditorCameras from "./pages/EditorCameras";
import WorkSchedule from "./pages/WorkSchedule";
import FaceRecognition from "./pages/FaceRecognition";
import Logs from "./pages/Logs";
import Alerts from "./pages/Alerts";
import Users from "./pages/Users";
import MyLogs from "./pages/MyLogs";
import Profile from "./pages/Profile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import * as tf from '@tensorflow/tfjs';

// Initialize TensorFlow.js backend
tf.ready().then(() => {
  console.log('TensorFlow.js backend initialized');
});

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'administrator' | 'employee' | 'editor' }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Index />} />
      
      {/* Admin Dashboard Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute requiredRole="administrator">
          <DashboardLayout userRole="admin" userName={user?.username || "Administrator"}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="face-recognition" element={<FaceRecognition />} />
              <Route path="logs" element={<Logs />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<AdminDashboard />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Employee Dashboard Routes */}
      <Route path="/employee/*" element={
        <ProtectedRoute requiredRole="employee">
          <DashboardLayout userRole="employee" userName={user?.username || "Employee"}>
            <Routes>
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="my-logs" element={<MyLogs />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<EmployeeDashboard />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Editor Dashboard Routes */}
      <Route path="/editor/*" element={
        <ProtectedRoute requiredRole="editor">
          <DashboardLayout userRole="editor" userName={user?.username || "Editor"}>
            <Routes>
              <Route path="dashboard" element={<EditorDashboard />} />
              <Route path="employees" element={<EditorEmployees />} />
              <Route path="logs" element={<EditorLogs />} />
              <Route path="cameras" element={<EditorCameras />} />
              <Route path="schedule" element={<WorkSchedule />} />
              <Route path="*" element={<EditorDashboard />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
