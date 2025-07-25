/**
 * ============================================================================
 * 📊 Rindwa Emergency Platform - Advanced Analytics Service
 * ============================================================================
 * Comprehensive analytics service providing business intelligence,
 * predictive analytics, and advanced reporting capabilities
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import logger from '../utils/logger';
import { cache } from '../utils/cache';

export interface AnalyticsTimeframe {
  start: Date;
  end: Date;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface IncidentMetrics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byLocation: Record<string, number>;
  avgResponseTime: number;
  avgResolutionTime: number;
  escalationRate: number;
}

export interface PerformanceMetrics {
  responseTimeMetrics: {
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  resolutionMetrics: {
    average: number;
    median: number;
    withinSLA: number;
    outsideSLA: number;
  };
  staffUtilization: {
    average: number;
    byRole: Record<string, number>;
    byStation: Record<string, number>;
  };
  systemLoad: {
    peakHours: string[];
    averageLoad: number;
    capacityUtilization: number;
  };
}

export interface PredictiveAnalytics {
  incidentTrends: {
    forecast: Array<{ date: string; predicted: number; confidence: number }>;
    seasonality: Record<string, number>;
    growth: number;
  };
  resourceNeeds: {
    staffingRecommendations: Array<{ role: string; station: string; recommended: number }>;
    equipmentNeeds: Array<{ type: string; location: string; priority: number }>;
  };
  riskAssessment: {
    highRiskAreas: Array<{ location: string; riskScore: number; factors: string[] }>;
    emergingPatterns: Array<{ pattern: string; confidence: number; impact: string }>;
  };
}

export interface BusinessIntelligence {
  kpis: {
    responseTimeImprovement: number;
    resolutionRateImprovement: number;
    userSatisfaction: number;
    costEfficiency: number;
    systemReliability: number;
  };
  benchmarks: {
    industryAverage: Record<string, number>;
    regionalComparison: Record<string, number>;
    historicalComparison: Record<string, number>;
  };
  insights: Array<{
    category: 'performance' | 'efficiency' | 'quality' | 'cost';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
    dataPoints: Array<{ metric: string; value: number; change: number }>;
  }>;
}

export class AdvancedAnalyticsService {
  
  /**
   * Generate comprehensive incident metrics
   */
  async getIncidentMetrics(timeframe: AnalyticsTimeframe): Promise<IncidentMetrics> {
    const cacheKey = `incident_metrics_${timeframe.start.getTime()}_${timeframe.end.getTime()}_${timeframe.period}`;
    
    return cache.getOrSet(cacheKey, async () => {
      try {
        // Total incidents
        const totalResult = await sequelize.query(`
          SELECT COUNT(*) as total
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // By status
        const statusResult = await sequelize.query(`
          SELECT status, COUNT(*) as count
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
          GROUP BY status
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // By priority
        const priorityResult = await sequelize.query(`
          SELECT priority, COUNT(*) as count
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
          GROUP BY priority
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // By type
        const typeResult = await sequelize.query(`
          SELECT title, COUNT(*) as count
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
          GROUP BY title
          ORDER BY count DESC
          LIMIT 10
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // By location (district)
        const locationResult = await sequelize.query(`
          SELECT 
            COALESCE(s.district, 'Unknown') as location,
            COUNT(i.*) as count
          FROM incidents i
          LEFT JOIN stations s ON i."stationId" = s.id
          WHERE i."createdAt" BETWEEN :start AND :end
          GROUP BY s.district
          ORDER BY count DESC
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // Response and resolution times
        const timingResult = await sequelize.query(`
          SELECT 
            AVG(EXTRACT(EPOCH FROM ("assignedAt" - "createdAt"))/60) as avg_response_time,
            AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/60) as avg_resolution_time,
            COUNT(CASE WHEN status = 'escalated' THEN 1 END)::float / COUNT(*)::float * 100 as escalation_rate
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
          AND "assignedAt" IS NOT NULL
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        const total = (totalResult[0] as any)?.total || 0;
        const byStatus = Object.fromEntries((statusResult as any[]).map(r => [r.status, parseInt(r.count)]));
        const byPriority = Object.fromEntries((priorityResult as any[]).map(r => [r.priority, parseInt(r.count)]));
        const byType = Object.fromEntries((typeResult as any[]).map(r => [r.title, parseInt(r.count)]));
        const byLocation = Object.fromEntries((locationResult as any[]).map(r => [r.location, parseInt(r.count)]));
        
        const timing = timingResult[0] as any;
        
        return {
          total: parseInt(total),
          byStatus,
          byPriority,
          byType,
          byLocation,
          avgResponseTime: parseFloat(timing?.avg_response_time) || 0,
          avgResolutionTime: parseFloat(timing?.avg_resolution_time) || 0,
          escalationRate: parseFloat(timing?.escalation_rate) || 0
        };

      } catch (error) {
        logger.error('Error generating incident metrics', error);
        throw new Error('Failed to generate incident metrics');
      }
    }, 300); // Cache for 5 minutes
  }

  /**
   * Generate performance metrics and KPIs
   */
  async getPerformanceMetrics(timeframe: AnalyticsTimeframe): Promise<PerformanceMetrics> {
    const cacheKey = `performance_metrics_${timeframe.start.getTime()}_${timeframe.end.getTime()}`;
    
    return cache.getOrSet(cacheKey, async () => {
      try {
        // Response time metrics
        const responseTimeResult = await sequelize.query(`
          WITH response_times AS (
            SELECT EXTRACT(EPOCH FROM ("assignedAt" - "createdAt"))/60 as response_minutes
            FROM incidents 
            WHERE "createdAt" BETWEEN :start AND :end
            AND "assignedAt" IS NOT NULL
          )
          SELECT 
            AVG(response_minutes) as average,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes) as median,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_minutes) as p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_minutes) as p99
          FROM response_times
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // Resolution metrics
        const resolutionResult = await sequelize.query(`
          WITH resolution_times AS (
            SELECT 
              EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600 as resolution_hours,
              CASE WHEN EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600 <= 24 THEN 1 ELSE 0 END as within_sla
            FROM incidents 
            WHERE "createdAt" BETWEEN :start AND :end
            AND "resolvedAt" IS NOT NULL
          )
          SELECT 
            AVG(resolution_hours) as average,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_hours) as median,
            SUM(within_sla) as within_sla,
            COUNT(*) - SUM(within_sla) as outside_sla
          FROM resolution_times
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // Staff utilization
        const staffResult = await sequelize.query(`
          SELECT 
            u.role,
            s.name as station,
            COUNT(i.*) as incidents_handled,
            AVG(EXTRACT(EPOCH FROM (i."resolvedAt" - i."assignedAt"))/3600) as avg_handling_time
          FROM incidents i
          JOIN users u ON i."assignedTo" = u.id
          LEFT JOIN stations s ON u."stationId" = s.id
          WHERE i."createdAt" BETWEEN :start AND :end
          AND i."assignedAt" IS NOT NULL
          GROUP BY u.role, s.name
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // System load analysis
        const systemLoadResult = await sequelize.query(`
          SELECT 
            EXTRACT(HOUR FROM "createdAt") as hour,
            COUNT(*) as incident_count,
            AVG(COUNT(*)) OVER() as average_load
          FROM incidents 
          WHERE "createdAt" BETWEEN :start AND :end
          GROUP BY EXTRACT(HOUR FROM "createdAt")
          ORDER BY incident_count DESC
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        const responseTime = responseTimeResult[0] as any;
        const resolution = resolutionResult[0] as any;
        const systemLoad = systemLoadResult as any[];

        // Calculate staff utilization metrics
        const byRole = {} as Record<string, number>;
        const byStation = {} as Record<string, number>;
        let totalHandlingTime = 0;
        let staffCount = 0;

        (staffResult as any[]).forEach(staff => {
          const incidentsHandled = parseInt(staff.incidents_handled);
          const handlingTime = parseFloat(staff.avg_handling_time) || 0;
          
          byRole[staff.role] = (byRole[staff.role] || 0) + incidentsHandled;
          byStation[staff.station || 'Unknown'] = (byStation[staff.station || 'Unknown'] || 0) + incidentsHandled;
          
          totalHandlingTime += handlingTime;
          staffCount++;
        });

        const peakHours = systemLoad
          .slice(0, 3)
          .map(sl => `${sl.hour}:00`);

        return {
          responseTimeMetrics: {
            average: parseFloat(responseTime?.average) || 0,
            median: parseFloat(responseTime?.median) || 0,
            p95: parseFloat(responseTime?.p95) || 0,
            p99: parseFloat(responseTime?.p99) || 0
          },
          resolutionMetrics: {
            average: parseFloat(resolution?.average) || 0,
            median: parseFloat(resolution?.median) || 0,
            withinSLA: parseInt(resolution?.within_sla) || 0,
            outsideSLA: parseInt(resolution?.outside_sla) || 0
          },
          staffUtilization: {
            average: staffCount > 0 ? totalHandlingTime / staffCount : 0,
            byRole,
            byStation
          },
          systemLoad: {
            peakHours,
            averageLoad: parseFloat(systemLoad[0]?.average_load) || 0,
            capacityUtilization: Math.min((parseFloat(systemLoad[0]?.average_load) || 0) / 10 * 100, 100)
          }
        };

      } catch (error) {
        logger.error('Error generating performance metrics', error);
        throw new Error('Failed to generate performance metrics');
      }
    }, 600); // Cache for 10 minutes
  }

  /**
   * Generate predictive analytics using historical data
   */
  async getPredictiveAnalytics(timeframe: AnalyticsTimeframe): Promise<PredictiveAnalytics> {
    const cacheKey = `predictive_analytics_${timeframe.period}`;
    
    return cache.getOrSet(cacheKey, async () => {
      try {
        // Historical incident patterns for forecasting
        const historicalResult = await sequelize.query(`
          SELECT 
            DATE_TRUNC(:period, "createdAt") as period,
            COUNT(*) as incident_count,
            AVG(COUNT(*)) OVER (ORDER BY DATE_TRUNC(:period, "createdAt") ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) as moving_avg
          FROM incidents 
          WHERE "createdAt" >= :start - INTERVAL '90 days'
          GROUP BY DATE_TRUNC(:period, "createdAt")
          ORDER BY period
        `, {
          replacements: { 
            period: timeframe.period,
            start: timeframe.start 
          },
          type: QueryTypes.SELECT
        });

        // Seasonal patterns
        const seasonalResult = await sequelize.query(`
          SELECT 
            EXTRACT(MONTH FROM "createdAt") as month,
            EXTRACT(DOW FROM "createdAt") as day_of_week,
            EXTRACT(HOUR FROM "createdAt") as hour,
            COUNT(*) as count
          FROM incidents 
          WHERE "createdAt" >= :start - INTERVAL '365 days'
          GROUP BY EXTRACT(MONTH FROM "createdAt"), EXTRACT(DOW FROM "createdAt"), EXTRACT(HOUR FROM "createdAt")
        `, {
          replacements: { start: timeframe.start },
          type: QueryTypes.SELECT
        });

        // Risk assessment by location
        const riskResult = await sequelize.query(`
          SELECT 
            COALESCE(s.district, 'Unknown') as location,
            COUNT(i.*) as incident_count,
            AVG(CASE WHEN i.priority = 'critical' THEN 3 WHEN i.priority = 'high' THEN 2 ELSE 1 END) as avg_severity,
            COUNT(CASE WHEN i.status = 'escalated' THEN 1 END)::float / COUNT(*)::float as escalation_rate
          FROM incidents i
          LEFT JOIN stations s ON i."stationId" = s.id
          WHERE i."createdAt" BETWEEN :start AND :end
          GROUP BY s.district
          HAVING COUNT(i.*) > 5
          ORDER BY (COUNT(i.*) * AVG(CASE WHEN i.priority = 'critical' THEN 3 WHEN i.priority = 'high' THEN 2 ELSE 1 END)) DESC
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // Staffing analysis
        const staffingResult = await sequelize.query(`
          SELECT 
            u.role,
            s.name as station,
            COUNT(i.*) as workload,
            AVG(EXTRACT(EPOCH FROM (i."resolvedAt" - i."assignedAt"))/3600) as avg_resolution_time
          FROM users u
          LEFT JOIN incidents i ON i."assignedTo" = u.id
          LEFT JOIN stations s ON u."stationId" = s.id
          WHERE u.role IN ('station_staff', 'station_admin')
          AND (i."createdAt" IS NULL OR i."createdAt" BETWEEN :start AND :end)
          GROUP BY u.role, s.name
        `, {
          replacements: { start: timeframe.start, end: timeframe.end },
          type: QueryTypes.SELECT
        });

        // Generate forecasts using simple linear regression
        const historical = historicalResult as any[];
        const forecast = this.generateForecast(historical, 30); // 30 days forecast

        // Process seasonal patterns
        const seasonal = seasonalResult as any[];
        const seasonality = {
          monthly: this.calculateSeasonality(seasonal, 'month'),
          weekly: this.calculateSeasonality(seasonal, 'day_of_week'),
          hourly: this.calculateSeasonality(seasonal, 'hour')
        };

        // Calculate growth rate
        const growth = historical.length > 1 
          ? ((historical[historical.length - 1].incident_count - historical[0].incident_count) / historical[0].incident_count) * 100
          : 0;

        // Generate staffing recommendations
        const staffingRecommendations = (staffingResult as any[]).map(staff => ({
          role: staff.role,
          station: staff.station || 'Unknown',
          recommended: Math.ceil(staff.workload / 10) // Recommend 1 staff per 10 incidents
        }));

        // High-risk areas
        const highRiskAreas = (riskResult as any[]).slice(0, 5).map(risk => ({
          location: risk.location,
          riskScore: Math.round((risk.incident_count * risk.avg_severity * (1 + risk.escalation_rate)) * 100) / 100,
          factors: [
            risk.incident_count > 50 ? 'High incident volume' : null,
            risk.avg_severity > 2 ? 'High severity incidents' : null,
            risk.escalation_rate > 0.2 ? 'High escalation rate' : null
          ].filter(Boolean)
        }));

        return {
          incidentTrends: {
            forecast,
            seasonality,
            growth
          },
          resourceNeeds: {
            staffingRecommendations,
            equipmentNeeds: [] // To be implemented based on incident types
          },
          riskAssessment: {
            highRiskAreas,
            emergingPatterns: [] // To be implemented with ML
          }
        };

      } catch (error) {
        logger.error('Error generating predictive analytics', error);
        throw new Error('Failed to generate predictive analytics');
      }
    }, 3600); // Cache for 1 hour
  }

  /**
   * Generate business intelligence insights
   */
  async getBusinessIntelligence(timeframe: AnalyticsTimeframe): Promise<BusinessIntelligence> {
    const cacheKey = `business_intelligence_${timeframe.start.getTime()}_${timeframe.end.getTime()}`;
    
    return cache.getOrSet(cacheKey, async () => {
      try {
        // Current metrics
        const currentMetrics = await this.getIncidentMetrics(timeframe);
        const performanceMetrics = await this.getPerformanceMetrics(timeframe);

        // Previous period for comparison
        const previousPeriod = {
          start: new Date(timeframe.start.getTime() - (timeframe.end.getTime() - timeframe.start.getTime())),
          end: timeframe.start,
          period: timeframe.period
        };
        const previousMetrics = await this.getIncidentMetrics(previousPeriod);
        const previousPerformance = await this.getPerformanceMetrics(previousPeriod);

        // Calculate KPIs
        const responseTimeImprovement = previousPerformance.responseTimeMetrics.average > 0
          ? ((previousPerformance.responseTimeMetrics.average - performanceMetrics.responseTimeMetrics.average) / previousPerformance.responseTimeMetrics.average) * 100
          : 0;

        const resolutionRateImprovement = previousMetrics.total > 0
          ? ((currentMetrics.byStatus.resolved || 0) / currentMetrics.total - (previousMetrics.byStatus.resolved || 0) / previousMetrics.total) * 100
          : 0;

        const kpis = {
          responseTimeImprovement,
          resolutionRateImprovement,
          userSatisfaction: 85, // Mock data - implement actual user satisfaction surveys
          costEfficiency: 78, // Mock data - implement cost tracking
          systemReliability: 95 // Mock data - implement uptime tracking
        };

        // Generate insights
        const insights = this.generateInsights(currentMetrics, performanceMetrics, previousMetrics, previousPerformance);

        return {
          kpis,
          benchmarks: {
            industryAverage: {
              responseTime: 15, // minutes
              resolutionTime: 4, // hours
              escalationRate: 12 // percentage
            },
            regionalComparison: {
              responseTime: 18,
              resolutionTime: 5,
              escalationRate: 15
            },
            historicalComparison: {
              responseTime: previousPerformance.responseTimeMetrics.average,
              resolutionTime: previousPerformance.resolutionMetrics.average,
              escalationRate: previousMetrics.escalationRate
            }
          },
          insights
        };

      } catch (error) {
        logger.error('Error generating business intelligence', error);
        throw new Error('Failed to generate business intelligence');
      }
    }, 1800); // Cache for 30 minutes
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateComprehensiveReport(timeframe: AnalyticsTimeframe) {
    try {
      const [incidentMetrics, performanceMetrics, predictiveAnalytics, businessIntelligence] = await Promise.all([
        this.getIncidentMetrics(timeframe),
        this.getPerformanceMetrics(timeframe),
        this.getPredictiveAnalytics(timeframe),
        this.getBusinessIntelligence(timeframe)
      ]);

      return {
        reportId: `analytics_${Date.now()}`,
        generatedAt: new Date(),
        timeframe,
        incidentMetrics,
        performanceMetrics,
        predictiveAnalytics,
        businessIntelligence,
        summary: this.generateExecutiveSummary(incidentMetrics, performanceMetrics, businessIntelligence)
      };

    } catch (error) {
      logger.error('Error generating comprehensive report', error);
      throw new Error('Failed to generate comprehensive analytics report');
    }
  }

  /**
   * Helper: Generate forecast using linear regression
   */
  private generateForecast(historical: any[], days: number) {
    if (historical.length < 2) return [];

    const dataPoints = historical.map((h, index) => ({
      x: index,
      y: h.incident_count
    }));

    // Simple linear regression
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < days; i++) {
      const x = n + i;
      const predicted = Math.max(0, slope * x + intercept);
      const confidence = Math.max(0.5, Math.min(0.95, 1 - (i / days) * 0.3)); // Decreasing confidence

      forecast.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predicted: Math.round(predicted),
        confidence: Math.round(confidence * 100) / 100
      });
    }

    return forecast;
  }

  /**
   * Helper: Calculate seasonality patterns
   */
  private calculateSeasonality(seasonal: any[], groupBy: string) {
    const grouped = seasonal.reduce((acc, item) => {
      const key = item[groupBy];
      acc[key] = (acc[key] || 0) + item.count;
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((sum: number, count: any) => sum + count, 0);
    const average = total / Object.keys(grouped).length;

    return Object.fromEntries(
      Object.entries(grouped).map(([key, count]: [string, any]) => [
        key,
        Math.round(((count - average) / average) * 100) / 100
      ])
    );
  }

  /**
   * Helper: Generate business insights
   */
  private generateInsights(current: IncidentMetrics, performance: PerformanceMetrics, previous: IncidentMetrics, previousPerformance: PerformanceMetrics) {
    const insights = [];

    // Response time insight
    if (performance.responseTimeMetrics.average > 20) {
      insights.push({
        category: 'performance' as const,
        title: 'Response Time Above Target',
        description: `Average response time is ${Math.round(performance.responseTimeMetrics.average)} minutes, exceeding the 15-minute target.`,
        impact: 'high' as const,
        recommendation: 'Consider increasing staff during peak hours or optimizing incident routing.',
        dataPoints: [
          { metric: 'Current Response Time', value: performance.responseTimeMetrics.average, change: 0 },
          { metric: 'Target', value: 15, change: 0 }
        ]
      });
    }

    // Escalation rate insight
    if (current.escalationRate > 15) {
      insights.push({
        category: 'quality' as const,
        title: 'High Escalation Rate',
        description: `${Math.round(current.escalationRate)}% of incidents are being escalated, indicating potential training or resource issues.`,
        impact: 'medium' as const,
        recommendation: 'Review escalation patterns and provide additional training to staff.',
        dataPoints: [
          { metric: 'Escalation Rate', value: current.escalationRate, change: current.escalationRate - previous.escalationRate }
        ]
      });
    }

    // Volume insight
    const volumeChange = previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : 0;
    if (Math.abs(volumeChange) > 20) {
      insights.push({
        category: 'efficiency' as const,
        title: volumeChange > 0 ? 'Incident Volume Increase' : 'Incident Volume Decrease',
        description: `Incident volume has ${volumeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(volumeChange))}% compared to the previous period.`,
        impact: Math.abs(volumeChange) > 50 ? 'high' : 'medium' as const,
        recommendation: volumeChange > 0 
          ? 'Monitor capacity and consider scaling resources.' 
          : 'Analyze factors contributing to the decrease and maintain preventive measures.',
        dataPoints: [
          { metric: 'Current Period', value: current.total, change: volumeChange },
          { metric: 'Previous Period', value: previous.total, change: 0 }
        ]
      });
    }

    return insights;
  }

  /**
   * Helper: Generate executive summary
   */
  private generateExecutiveSummary(incidents: IncidentMetrics, performance: PerformanceMetrics, bi: BusinessIntelligence) {
    return {
      headline: `Processed ${incidents.total} incidents with ${Math.round(performance.responseTimeMetrics.average)}min average response time`,
      keyMetrics: [
        `${Math.round(bi.kpis.responseTimeImprovement)}% response time improvement`,
        `${Math.round(performance.resolutionMetrics.withinSLA / (performance.resolutionMetrics.withinSLA + performance.resolutionMetrics.outsideSLA) * 100)}% within SLA`,
        `${Math.round(incidents.escalationRate)}% escalation rate`
      ],
      topConcerns: bi.insights
        .filter(insight => insight.impact === 'high')
        .slice(0, 3)
        .map(insight => insight.title),
      recommendations: bi.insights
        .slice(0, 3)
        .map(insight => insight.recommendation)
    };
  }
}

export const analyticsService = new AdvancedAnalyticsService(); 