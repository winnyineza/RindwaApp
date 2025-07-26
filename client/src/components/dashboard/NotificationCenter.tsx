import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Check, AlertTriangle, Info, Clock, BellRing, Trash2, ExternalLink, Wifi, WifiOff, Loader2, Shield, MapPin, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';

interface Notification {
  id: number;
  userId: number;
  type: 'INCIDENT_CREATED' | 'INCIDENT_UPDATED' | 'INCIDENT_ASSIGNED' | 'INCIDENT_ESCALATED' | 'INCIDENT_RESOLVED' | 'INCIDENT_COMMENTED' | 'EMERGENCY_CONTACT_ADDED' | 'USER_INVITED' | 'SYSTEM_ALERT' | 'PROFILE_UPDATED' | 'PASSWORD_CHANGED';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  incidentId?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    incidentType?: string;
    location?: string;
    assignedUser?: string;
  };
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch notifications
  const { data: notifications = [], refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    refetchInterval: 8000, // Refresh every 8 seconds for timely notifications
  });

  // Fetch unread count
  const { data: unreadNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadCount = unreadNotifications.length;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const { apiRequest } = await import('@/lib/queryClient');
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      return apiRequest('/api/notifications/read-all', {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const { apiRequest } = await import('@/lib/queryClient');
      return apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('@rindwa/token');
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Authenticate with server
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: token
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_notification') {
          // Show toast for new notification with enhanced styling
          const notification = data.notification;
          const isPriority = notification.priority === 'high' || notification.priority === 'critical';
          
          toast({
            title: notification.title,
            description: notification.message,
            variant: isPriority ? "destructive" : "default",
            duration: isPriority ? 8000 : 4000,
          });
          
          // Refresh notifications
          refetch();
          queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
        } else if (data.type === 'notification_read' || data.type === 'all_notifications_read' || data.type === 'notification_deleted') {
          // Refresh notifications when marked as read or deleted
          refetch();
          queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, toast, refetch, queryClient]);

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4 flex-shrink-0";
    switch (type) {
      case 'INCIDENT_RESOLVED':
      case 'PROFILE_UPDATED':
        return <Check className={`${iconClass} text-green-500`} />;
      case 'INCIDENT_ESCALATED':
      case 'PASSWORD_CHANGED':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
      case 'SYSTEM_ALERT':
        return <X className={`${iconClass} text-red-500`} />;
      case 'INCIDENT_CREATED':
      case 'INCIDENT_UPDATED':
        return <Shield className={`${iconClass} text-blue-500`} />;
      case 'EMERGENCY_CONTACT_ADDED':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      case 'INCIDENT_ASSIGNED':
        return <UserPlus className={`${iconClass} text-purple-500`} />;
      case 'INCIDENT_COMMENTED':
        return <AlertTriangle className={`${iconClass} text-orange-500`} />;
      case 'USER_INVITED':
        return <UserPlus className={`${iconClass} text-green-600`} />;
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const variants = {
      low: { variant: "secondary" as const, text: "LOW", className: "bg-gray-100 text-gray-700" },
      medium: { variant: "outline" as const, text: "MED", className: "bg-blue-50 text-blue-700 border-blue-200" },
      high: { variant: "destructive" as const, text: "HIGH", className: "bg-orange-100 text-orange-700" },
      critical: { variant: "destructive" as const, text: "CRITICAL", className: "bg-red-100 text-red-700 animate-pulse" }
    };

    const config = variants[priority as keyof typeof variants];
    if (!config) return null;

    return (
      <Badge 
        variant={config.variant} 
        className={`text-xs font-bold ${config.className}`}
      >
        {config.text}
      </Badge>
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on actionUrl or incidentId
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    } else if (notification.incidentId) {
      navigate(`/incidents/${notification.incidentId}`);
      setIsOpen(false);
    }
  };

  const markAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const deleteNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the notification click
    deleteNotificationMutation.mutate(id);
  };

  const markAllAsRead = () => {
    setIsLoading(true);
    markAllAsReadMutation.mutate(undefined, {
      onSettled: () => setIsLoading(false)
    });
  };

  const isOperationPending = markAsReadMutation.isPending || deleteNotificationMutation.isPending || markAllAsReadMutation.isPending;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          
          {/* Connection Status Indicator */}
          <div className={`absolute top-0 right-0 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
          
          {/* Unread Count Badge */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{unreadCount} new</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0 || isLoading}
                  className="text-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Mark all read'
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <ScrollArea className="h-96">
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                      <Bell className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">No notifications yet</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        You're all caught up! New notifications will appear here.
                      </p>
                    </div>
                    {!isConnected && (
                      <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                        <WifiOff className="h-3 w-3" />
                        Reconnecting...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {isFetching && (
                    <div className="flex items-center justify-center py-2 bg-blue-50 dark:bg-blue-950/20">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-blue-600">Refreshing...</span>
                    </div>
                  )}
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500' : ''
                        } ${isOperationPending ? 'opacity-50' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                                {getPriorityBadge(notification.priority)}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              {/* Metadata display */}
                              {notification.metadata && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {notification.metadata.location && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <MapPin className="h-3 w-3" />
                                      {notification.metadata.location}
                                    </div>
                                  )}
                                  {notification.metadata.incidentType && (
                                    <Badge variant="outline" className="text-xs">
                                      {notification.metadata.incidentType}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Just now'}
                                {(notification.actionUrl || notification.incidentId) && (
                                  <div className="flex items-center gap-1 text-blue-500">
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Click to view</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600"
                                disabled={isOperationPending}
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                              disabled={isOperationPending}
                              title="Delete notification"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </PopoverContent>
    </Popover>
  );
};