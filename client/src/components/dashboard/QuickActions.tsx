import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  AlertTriangle, 
  Building, 
  MapPin, 
  FileText, 
  Bell,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
}

export const QuickActions = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const getQuickActions = (): QuickAction[] => {
    const baseActions = [
      {
        title: t('sendInvitation'),
        description: 'Send invitation to new users',
        icon: <UserPlus className="h-5 w-5" />,
        href: '/users',
        color: 'bg-blue-100 text-blue-600',
        badge: 'New'
      },
      {
        title: 'Create Report',
        description: 'Generate system reports',
        icon: <FileText className="h-5 w-5" />,
        href: '/reports',
        color: 'bg-green-100 text-green-600'
      },
      {
        title: 'System Notifications',
        description: 'View system alerts',
        icon: <Bell className="h-5 w-5" />,
        href: '/notifications',
        color: 'bg-yellow-100 text-yellow-600',
        badge: '3'
      }
    ];

    if (user?.role === 'main_admin') {
      return [
        {
          title: t('organizations'),
          description: 'Manage organizations',
          icon: <Building className="h-5 w-5" />,
          href: '/organizations',
          color: 'bg-purple-100 text-purple-600'
        },
        ...baseActions
      ];
    }

    if (user?.role === 'super_admin') {
      return [
        {
          title: t('stations'),
          description: 'Manage stations',
          icon: <MapPin className="h-5 w-5" />,
          href: '/stations',
          color: 'bg-indigo-100 text-indigo-600'
        },
        ...baseActions
      ];
    }

    if (user?.role === 'station_admin') {
      return [
        {
          title: t('incidents'),
          description: 'Manage incidents',
          icon: <AlertTriangle className="h-5 w-5" />,
          href: '/incidents',
          color: 'bg-red-100 text-red-600'
        },
        ...baseActions
      ];
    }

    return baseActions;
  };

  const actions = getQuickActions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant="outline"
                className="h-auto p-4 flex items-start gap-3 hover:bg-gray-50 w-full"
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  {action.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{action.title}</span>
                    {action.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {action.description}
                  </p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};