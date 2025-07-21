import { Op } from 'sequelize';
import type { DatabaseStorage } from '../storage';

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalIncidents: number;
  resolvedIncidents: number;
  resolutionRate: number;
  responseTimeByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  incidentsByStatus: {
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    escalated: number;
  };
}

export interface ResourceAllocation {
  stationId: number;
  stationName: string;
  totalStaff: number;
  activeStaff: number;
  assignedIncidents: number;
  workloadPercentage: number;
  averageResponseTime: number;
}

export interface IncidentHeatmapData {
  latitude: number;
  longitude: number;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeRange: string;
}

export interface PredictiveAnalytics {
  forecastedIncidents: {
    date: string;
    predictedCount: number;
    confidence: number;
  }[];
  trendAnalysis: {
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    periodComparison: string;
  };
  riskZones: {
    latitude: number;
    longitude: number;
    riskLevel: number;
    incidentTypes: string[];
  }[];
}

export class PerformanceService {
  constructor(private storage: DatabaseStorage) {}

  async getPerformanceMetrics(timeframe: string = '30d', stationId?: number, organizationId?: number): Promise<PerformanceMetrics> {
    const startDate = this.getStartDate(timeframe);
    
    let whereClause: any = {
      created_at: {
        [Op.gte]: startDate
      }
    };

    if (stationId) {
      whereClause.stationId = stationId;
    } else if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const incidents = await this.storage.getIncidentsWithFilter(whereClause);
    
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter((i: any) => i.status === 'resolved').length;
    const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;

    // Calculate average response time (in minutes)
    const respondedIncidents = incidents.filter((i: any) => i.status !== 'pending' && i.updated_at && i.created_at);
    const totalResponseTime = respondedIncidents.reduce((sum: number, incident: any) => {
      const responseTime = new Date(incident.updated_at!).getTime() - new Date(incident.created_at).getTime();
      return sum + (responseTime / (1000 * 60)); // Convert to minutes
    }, 0);
    const averageResponseTime = respondedIncidents.length > 0 ? totalResponseTime / respondedIncidents.length : 0;

    // Response time by priority
    const responseTimeByPriority = {
      critical: this.calculateAverageResponseTimeByPriority(incidents, 'critical'),
      high: this.calculateAverageResponseTimeByPriority(incidents, 'high'),
      medium: this.calculateAverageResponseTimeByPriority(incidents, 'medium'),
      low: this.calculateAverageResponseTimeByPriority(incidents, 'low')
    };

    // Incidents by status
    const incidentsByStatus = {
      pending: incidents.filter((i: any) => i.status === 'pending').length,
      assigned: incidents.filter((i: any) => i.status === 'assigned').length,
      in_progress: incidents.filter((i: any) => i.status === 'in_progress').length,
      resolved: incidents.filter((i: any) => i.status === 'resolved').length,
      escalated: incidents.filter((i: any) => i.status === 'escalated').length
    };

    return {
      averageResponseTime,
      totalIncidents,
      resolvedIncidents,
      resolutionRate,
      responseTimeByPriority,
      incidentsByStatus
    };
  }

  async getResourceAllocation(organizationId?: number): Promise<ResourceAllocation[]> {
    const stations = organizationId 
      ? await this.storage.getStationsByOrganization(organizationId)
      : await this.storage.getAllStations();

    const resourceData: ResourceAllocation[] = [];

    for (const station of stations) {
      const totalStaff = await this.storage.getUsersByStation(station.id);
      const activeIncidents = await this.storage.getIncidentsWithFilter({
        stationId: station.id,
        status: {
          [Op.in]: ['assigned', 'in_progress']
        }
      });

      const assignedIncidents = activeIncidents.length;
      const activeStaff = totalStaff.filter((user: any) => user.isActive !== false).length;
      const workloadPercentage = activeStaff > 0 ? (assignedIncidents / activeStaff) * 100 : 0;

      // Calculate average response time for this station
      const recentIncidents = await this.storage.getIncidentsWithFilter({
        stationId: station.id,
        status: {
          [Op.ne]: 'pending'
        },
        created_at: {
          [Op.gte]: this.getStartDate('7d')
        }
      });

      const respondedIncidents = recentIncidents.filter((i: any) => i.updated_at && i.created_at);
      const totalResponseTime = respondedIncidents.reduce((sum: number, incident: any) => {
        const responseTime = new Date(incident.updated_at!).getTime() - new Date(incident.created_at).getTime();
        return sum + (responseTime / (1000 * 60));
      }, 0);
      const averageResponseTime = respondedIncidents.length > 0 ? totalResponseTime / respondedIncidents.length : 0;

      resourceData.push({
        stationId: station.id,
        stationName: station.name,
        totalStaff: totalStaff.length,
        activeStaff,
        assignedIncidents,
        workloadPercentage,
        averageResponseTime
      });
    }

    return resourceData;
  }

  async getIncidentHeatmapData(timeframe: string = '30d', organizationId?: number): Promise<IncidentHeatmapData[]> {
    const startDate = this.getStartDate(timeframe);
    
    let whereClause: any = {
      created_at: {
        [Op.gte]: startDate
      },
      locationLat: {
        [Op.ne]: null
      },
      locationLng: {
        [Op.ne]: null
      }
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const incidents = await this.storage.getIncidentsWithFilter(whereClause);
    
    // Group incidents by location (rounded to reduce precision for clustering)
    const locationGroups = new Map<string, {
      incidents: any[];
      lat: number;
      lng: number;
    }>();

    incidents.forEach(incident => {
      if (incident.locationLat && incident.locationLng) {
        // Round to 3 decimal places for clustering
        const lat = Math.round(incident.locationLat * 1000) / 1000;
        const lng = Math.round(incident.locationLng * 1000) / 1000;
        const key = `${lat},${lng}`;
        
        if (!locationGroups.has(key)) {
          locationGroups.set(key, {
            incidents: [],
            lat,
            lng
          });
        }
        
        locationGroups.get(key)!.incidents.push(incident);
      }
    });

    const heatmapData: IncidentHeatmapData[] = [];
    
    locationGroups.forEach(group => {
      const count = group.incidents.length;
      const priorities = group.incidents.map(i => i.priority);
      
      // Determine severity based on priority distribution
      const criticalCount = priorities.filter(p => p === 'critical').length;
      const highCount = priorities.filter(p => p === 'high').length;
      const mediumCount = priorities.filter(p => p === 'medium').length;
      
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (criticalCount > 0) severity = 'critical';
      else if (highCount > 0) severity = 'high';
      else if (mediumCount > 0) severity = 'medium';

      heatmapData.push({
        latitude: group.lat,
        longitude: group.lng,
        count,
        severity,
        timeRange: timeframe
      });
    });

    return heatmapData;
  }

  async getPredictiveAnalytics(organizationId?: number): Promise<PredictiveAnalytics> {
    // Get historical data for the last 90 days
    const startDate = this.getStartDate('90d');
    
    let whereClause: any = {
      created_at: {
        [Op.gte]: startDate
      }
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const incidents = await this.storage.getIncidentsWithFilter(whereClause);
    
    // Group incidents by day
    const incidentsByDay = new Map<string, number>();
    const now = new Date();
    
    incidents.forEach((incident: any) => {
      const date = new Date(incident.created_at).toISOString().split('T')[0];
      incidentsByDay.set(date, (incidentsByDay.get(date) || 0) + 1);
    });

    // Calculate trend analysis
    const last30Days = this.getIncidentCountsForPeriod(incidentsByDay, 30);
    const previous30Days = this.getIncidentCountsForPeriod(incidentsByDay, 30, 30);
    
    const current30DayTotal = last30Days.reduce((sum, count) => sum + count, 0);
    const previous30DayTotal = previous30Days.reduce((sum, count) => sum + count, 0);
    
    const changePercentage = previous30DayTotal > 0 
      ? ((current30DayTotal - previous30DayTotal) / previous30DayTotal) * 100 
      : 0;
      
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (changePercentage > 5) trend = 'increasing';
    else if (changePercentage < -5) trend = 'decreasing';

    // Simple forecasting using moving average
    const forecastedIncidents = this.generateForecast(last30Days);
    
    // Risk zones based on incident density
    const riskZones = await this.calculateRiskZones(incidents);

    return {
      forecastedIncidents,
      trendAnalysis: {
        trend,
        changePercentage: Math.abs(changePercentage),
        periodComparison: 'Previous 30 days vs Current 30 days'
      },
      riskZones
    };
  }

  private calculateAverageResponseTimeByPriority(incidents: any[], priority: string): number {
    const priorityIncidents = incidents.filter(i => 
      i.priority === priority && 
      i.status !== 'pending' && 
      i.updated_at && 
      i.created_at
    );
    
    if (priorityIncidents.length === 0) return 0;
    
    const totalResponseTime = priorityIncidents.reduce((sum, incident) => {
      const responseTime = new Date(incident.updated_at).getTime() - new Date(incident.created_at).getTime();
      return sum + (responseTime / (1000 * 60));
    }, 0);
    
    return totalResponseTime / priorityIncidents.length;
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    const days = parseInt(timeframe.replace('d', ''));
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }

  private getIncidentCountsForPeriod(incidentsByDay: Map<string, number>, days: number, offset: number = 0): number[] {
    const counts: number[] = [];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offset);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      counts.push(incidentsByDay.get(dateStr) || 0);
    }
    
    return counts;
  }

  private generateForecast(historicalData: number[]): { date: string; predictedCount: number; confidence: number; }[] {
    const forecast: { date: string; predictedCount: number; confidence: number; }[] = [];
    
    // Simple moving average forecast
    const windowSize = 7;
    const recentData = historicalData.slice(-windowSize);
    const average = recentData.reduce((sum, count) => sum + count, 0) / recentData.length;
    
    // Generate 7-day forecast
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Add some variation based on day of week (higher on weekdays)
      const dayOfWeek = forecastDate.getDay();
      const weekdayMultiplier = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.2 : 0.8;
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedCount: Math.round(average * weekdayMultiplier),
        confidence: Math.max(0.6, 1 - (i * 0.05)) // Confidence decreases with time
      });
    }
    
    return forecast;
  }

  private async calculateRiskZones(incidents: any[]): Promise<{ latitude: number; longitude: number; riskLevel: number; incidentTypes: string[]; }[]> {
    const riskZones: { latitude: number; longitude: number; riskLevel: number; incidentTypes: string[]; }[] = [];
    
    // Group incidents by location and calculate risk
    const locationGroups = new Map<string, {
      incidents: any[];
      lat: number;
      lng: number;
    }>();

    incidents.forEach((incident: any) => {
      if (incident.locationLat && incident.locationLng) {
        const lat = Math.round(incident.locationLat * 100) / 100; // Cluster by 0.01 degree
        const lng = Math.round(incident.locationLng * 100) / 100;
        const key = `${lat},${lng}`;
        
        if (!locationGroups.has(key)) {
          locationGroups.set(key, {
            incidents: [],
            lat,
            lng
          });
        }
        
        locationGroups.get(key)!.incidents.push(incident);
      }
    });

    locationGroups.forEach(group => {
      if (group.incidents.length >= 3) { // Only consider areas with multiple incidents
        const riskLevel = Math.min(1, group.incidents.length / 10); // Normalize to 0-1
        const incidentTypes = Array.from(new Set(group.incidents.map((i: any) => i.priority)));
        
        riskZones.push({
          latitude: group.lat,
          longitude: group.lng,
          riskLevel,
          incidentTypes
        });
      }
    });

    return riskZones.sort((a, b) => b.riskLevel - a.riskLevel).slice(0, 10); // Top 10 risk zones
  }
}