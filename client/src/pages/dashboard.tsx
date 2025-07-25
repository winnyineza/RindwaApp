import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PersonalizedDashboard } from "@/components/dashboard/PersonalizedDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const getTitle = () => {
    return t('dashboard');
  };

  const getSubtitle = () => {
    const userName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email ? user.email.split('@')[0] : 'User');
    const orgInfo = user?.organizationName ? ` at ${user.organizationName}` : '';
    const stationInfo = user?.stationName ? ` - ${user.stationName}` : '';
    
    return `Welcome back, ${userName}${orgInfo}${stationInfo}.\nManage stations and organization-level operations`;
  };

  return (
    <DashboardLayout title={getTitle()} subtitle={getSubtitle()}>
      <PersonalizedDashboard />
    </DashboardLayout>
  );
}
