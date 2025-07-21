import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download, Eye, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/dateUtils";

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  created_at: string;
  User?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

const actionColors = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-gray-100 text-gray-800",
  invite: "bg-yellow-100 text-yellow-800",
  assign: "bg-orange-100 text-orange-800",
  register: "bg-indigo-100 text-indigo-800",
  citizen_report: "bg-teal-100 text-teal-800",
  citizen_upvote: "bg-cyan-100 text-cyan-800",
  emergency_alert: "bg-red-100 text-red-800",
  view_public_incidents: "bg-green-100 text-green-800",
};

export default function AuditPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey: ['/api/audit-logs'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  if (!user || !['main_admin', 'super_admin'].includes(user.role)) {
    return (
      <DashboardLayout title="Access Restricted" subtitle="Insufficient permissions">
        <div className="flex items-center justify-center min-h-64">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You don't have permission to access audit logs. Only Main Admin and Super Admin can view this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const filteredLogs = auditLogs.filter((log: AuditLog) => {
    const userInfo = log.User || log.user;
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userInfo?.firstName && userInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (userInfo?.lastName && userInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (userInfo?.email && userInfo.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesEntity = filterEntity === "all" || log.entityType === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const exportLogs = () => {
    const csv = [
      ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details'],
      ...filteredLogs.map((log: AuditLog) => {
        const userInfo = log.User || log.user;
        const timestamp = log.createdAt || log.created_at;
        return [
          timestamp ? format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 
            (log.userId === null ? 'Anonymous Citizen' : 'Unknown'),
          log.action,
          log.entityType,
          log.entityId?.toString() || '',
          log.ipAddress || '',
          log.details || ''
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Audit Logs" subtitle="Loading audit trail...">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Audit Logs" subtitle="Error loading data">
        <div className="flex items-center justify-center min-h-64">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Failed to load audit logs. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs" subtitle="Track all system activities and user actions for security and compliance">
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              System Activity Log
            </CardTitle>
            <CardDescription>
              View and filter all system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by action, entity, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="invite">Invite</SelectItem>
                  <SelectItem value="register">Register</SelectItem>
                  <SelectItem value="citizen_report">Citizen Report</SelectItem>
                  <SelectItem value="citizen_upvote">Citizen Upvote</SelectItem>
                  <SelectItem value="emergency_alert">Emergency Alert</SelectItem>
                  <SelectItem value="view_public_incidents">View Public Incidents</SelectItem>
                  <SelectItem value="assign">Assign</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="station">Station</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {searchTerm || filterAction !== "all" || filterEntity !== "all"
                    ? "Try adjusting your search or filters"
                    : "System activities will appear here"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm whitespace-pre-line">
                        {(() => {
                          const timestamp = log.createdAt || log.created_at;
                          return timestamp ? formatDateTime(timestamp) : '-';
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const userInfo = log.User || log.user;
                          
                          // Check if this is an anonymous citizen activity
                          if (!userInfo && log.userId === null) {
                            return (
                              <div>
                                <div className="font-medium text-orange-600">Anonymous Citizen</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Mobile App User</div>
                              </div>
                            );
                          }
                          
                          return userInfo ? (
                            <div>
                              <div className="font-medium">
                                {userInfo.firstName} {userInfo.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{userInfo.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${actionColors[log.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entityType}</TableCell>
                      <TableCell>{log.entityId || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-sm">
                          {(() => {
                            try {
                              const details = JSON.parse(log.details || '{}');
                              if (log.action === 'login') {
                                return `Logged in as ${details.role}`;
                              } else if (log.action === 'view' && log.entityType === 'analytics') {
                                return `Viewed ${details.timeframe} analytics (${details.totalIncidents} incidents)`;
                              } else if (log.action === 'create') {
                                return `Created new ${log.entityType}`;
                              } else if (log.action === 'update') {
                                return `Updated ${log.entityType} #${log.entityId}`;
                              } else if (log.action === 'delete') {
                                return `Deleted ${log.entityType} #${log.entityId}`;
                              } else if (log.action === 'invite') {
                                return `Invited user to ${log.entityType}`;
                              } else if (log.action === 'assign') {
                                return `Assigned ${log.entityType} #${log.entityId}`;
                              } else {
                                return `${log.action} ${log.entityType}`;
                              }
                            } catch {
                              return log.details || '-';
                            }
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}