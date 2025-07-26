import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
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
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import HelpCenterPage from "@/pages/help-center";
import ContactsPage from "@/pages/contacts";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ResetRedirect from "@/pages/ResetRedirect";

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
  
  // Station admin should NOT have access to stations management
  return <NotFound />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes that don't require authentication */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/reset-redirect/:token" component={ResetRedirect} />
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
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/incident-history" component={IncidentHistoryPage} />
      <Route path="/history" component={IncidentHistoryPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/help-center" component={HelpCenterPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <WebSocketProvider>
              <div className="theme-transition">
                <Toaster />
                <Router />
              </div>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
