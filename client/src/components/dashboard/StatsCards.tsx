import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Loader, CheckCircle } from "lucide-react";
import { getIncidentStats } from "@/lib/api";
import { IncidentStats } from "@/types";

export const StatsCards = () => {
  const { data: stats, isLoading } = useQuery<IncidentStats>({
    queryKey: ["/api/stats"],
    queryFn: getIncidentStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="stats-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="stats-card-icon bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">All time</span>
          </div>
        </CardContent>
      </Card>

      <Card className="stats-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Assignment</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="stats-card-icon bg-amber-100">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-amber-600 font-medium">
              {stats.pending > 0 ? 'Urgent' : 'None'}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              {stats.pending > 0 ? 'needs attention' : 'pending'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="stats-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="stats-card-icon bg-blue-100">
              <Loader className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-blue-600 font-medium">Active</span>
            <span className="text-sm text-gray-500 ml-2">being resolved</span>
          </div>
        </CardContent>
      </Card>

      <Card className="stats-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="stats-card-icon bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-green-600 font-medium">{resolutionRate}%</span>
            <span className="text-sm text-gray-500 ml-2">resolution rate</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
