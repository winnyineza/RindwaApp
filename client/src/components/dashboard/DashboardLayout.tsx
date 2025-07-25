import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title={title} subtitle={subtitle} />
        <main className="p-6 bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
