import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Activity, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user_created' | 'incident_reported' | 'incident_resolved' | 'invitation_sent';
  title: string;
  description: string;
  time: string;
  user: {
    name: string;
    avatar?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'user_created':
      return <UserPlus className="h-4 w-4" />;
    case 'incident_reported':
      return <AlertTriangle className="h-4 w-4" />;
    case 'incident_resolved':
      return <CheckCircle className="h-4 w-4" />;
    case 'invitation_sent':
      return <FileText className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getStatusColor = (status: ActivityItem['status']) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'info':
    default:
      return 'bg-blue-100 text-blue-800';
  }
};



export const RecentActivity = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-1">
              System activities will appear here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};