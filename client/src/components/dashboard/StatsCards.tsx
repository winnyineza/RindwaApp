import { AlertTriangle, Clock, CheckCircle, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  } | null;
  isLoading?: boolean;
}

export const StatsCards = ({ stats, isLoading = false }: StatsCardsProps) => {
  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse w-16" />
                  <div className="h-3 bg-muted rounded animate-pulse w-20" />
                </div>
                <div className="w-12 h-12 bg-muted rounded-lg animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Provide default values if stats is undefined or null
  const safeStats = stats || {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-card border hover:bg-accent/50 hover:scale-105 transition-all duration-200 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
              <p className="text-3xl font-bold text-foreground">{safeStats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border hover:bg-accent/50 hover:scale-105 transition-all duration-200 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-foreground">{safeStats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
            </div>
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border hover:bg-accent/50 hover:scale-105 transition-all duration-200 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold text-foreground">{safeStats.inProgress}</p>
              <p className="text-xs text-muted-foreground mt-1">Active cases</p>
            </div>
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <UserCheck className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border hover:bg-accent/50 hover:scale-105 transition-all duration-200 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolved</p>
              <p className="text-3xl font-bold text-foreground">{safeStats.resolved}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
