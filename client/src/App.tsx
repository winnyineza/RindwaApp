import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import OrganizationsPage from "@/pages/organizations";
import StationsOverviewPage from "@/pages/stations";
import IncidentsPage from "@/pages/incidents";
import UsersPage from "@/pages/users";
import InvitationsPage from "@/pages/invitations";
import StationsManagementPage from "@/pages/stations-updated";
import IncidentWorkflowPage from "@/pages/incident-workflow";
import AnalyticsPage from "@/pages/analytics";
import AuditPage from "@/pages/audit";
import ProfilePage from "@/pages/profile";
import ReportsPage from "@/pages/reports";
import AcceptInvitationPage from "@/pages/accept-invitation";
import IncidentHistoryPage from "@/pages/incident-history";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";


import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function StationsRouter() {
  const { user } = useAuth();
  
  // Main admin gets overview page (monitoring all stations)
  if (user?.role === 'main_admin') {
    return <StationsOverviewPage />;
  }
  
  // Super admin gets management page (create/manage stations)
  if (user?.role === 'super_admin') {
    return <StationsManagementPage />;
  }
  
  // Station admin also gets management page (for their specific stations)
  if (user?.role === 'station_admin') {
    return <StationsManagementPage />;
  }
  
  return <NotFound />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes that don't require authentication */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/accept-invitation/:token" component={AcceptInvitationPage} />
      
      {/* Protected dashboard routes */}
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/organizations" component={OrganizationsPage} />
      <Route path="/stations" component={StationsRouter} />
      <Route path="/incident-workflow" component={IncidentWorkflowPage} />
      <Route path="/incidents" component={IncidentsPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/invitations" component={InvitationsPage} />
      <Route path="/analytics" component={AnalyticsPage} />

      <Route path="/audit" component={AuditPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/incident-history" component={IncidentHistoryPage} />
      <Route path="/history" component={IncidentHistoryPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
