import { QueryTypes } from 'sequelize';
import { sequelize } from './db';
import { EnhancedRoutingService } from './services/routingService';

// Comprehensive keyword database for intelligent incident classification
const ORGANIZATION_KEYWORDS = {
  // Ministry of Health (50+ keywords)
  health: [
    // Medical emergencies
    'medical', 'health', 'healthcare', 'ambulance', 'hospital', 'clinic', 'doctor', 'nurse', 'emergency',
    'injury', 'injured', 'accident', 'heart', 'cardiac', 'breathing', 'respiratory', 'unconscious', 'coma',
    'bleeding', 'blood', 'wound', 'cut', 'fracture', 'broken', 'pain', 'chest pain', 'headache', 'fever',
    'temperature', 'covid', 'coronavirus', 'virus', 'disease', 'illness', 'sick', 'nausea', 'vomiting',
    'diarrhea', 'dehydration', 'overdose', 'poisoning', 'allergic', 'reaction', 'seizure', 'stroke',
    'diabetes', 'hypertension', 'asthma', 'pregnancy', 'birth', 'delivery', 'labor', 'medication',
    'prescription', 'treatment', 'surgery', 'operation', 'intensive care', 'icu', 'emergency room',
    'first aid', 'cpr', 'resuscitation', 'trauma', 'mental health', 'depression', 'anxiety', 'suicide',
    'psychiatric', 'psychotic', 'overdose', 'drug abuse', 'alcohol poisoning', 'food poisoning',
    'infectious', 'contagious', 'epidemic', 'outbreak', 'quarantine', 'isolation', 'vaccination'
  ],

  // Rwanda Investigation Bureau (50+ keywords)  
  investigation: [
    // Criminal activities
    'theft', 'robbery', 'burglary', 'stealing', 'stolen', 'fraud', 'scam', 'embezzlement', 'corruption',
    'bribery', 'extortion', 'blackmail', 'money laundering', 'forgery', 'counterfeiting', 'cybercrime',
    'hacking', 'identity theft', 'credit card fraud', 'phishing', 'online scam', 'investigation',
    'criminal', 'crime', 'suspect', 'evidence', 'witness', 'murder', 'homicide', 'killing', 'death',
    'assault', 'battery', 'violence', 'attack', 'fight', 'abuse', 'domestic violence', 'rape',
    'sexual assault', 'harassment', 'kidnapping', 'abduction', 'trafficking', 'human trafficking',
    'drug trafficking', 'narcotics', 'drugs', 'cocaine', 'heroin', 'marijuana', 'methamphetamine',
    'smuggling', 'contraband', 'illegal', 'unlawful', 'conspiracy', 'organized crime', 'gang',
    'weapon', 'gun', 'firearm', 'knife', 'explosive', 'bomb', 'threat', 'intimidation',
    'vandalism', 'property damage', 'arson', 'terrorism', 'extremism', 'radicalization',
    'surveillance', 'undercover', 'forensic', 'fingerprint', 'dna', 'ballistics'
  ],

  // Police Emergency Response (50+ keywords)
  police: [
    // General security and emergency response
    'police', 'security', 'emergency', 'patrol', 'officer', 'law enforcement', 'public safety',
    'disturbance', 'noise complaint', 'dispute', 'argument', 'fight', 'altercation', 'conflict',
    'traffic', 'accident', 'collision', 'crash', 'vehicle', 'car', 'motorcycle', 'truck', 'bus',
    'hit and run', 'drunk driving', 'speeding', 'reckless driving', 'road rage', 'parking',
    'public order', 'crowd control', 'protest', 'demonstration', 'riot', 'civil unrest',
    'missing person', 'lost child', 'runaway', 'welfare check', 'suspicious activity',
    'suspicious person', 'loitering', 'trespassing', 'breaking and entering', 'prowler',
    'alarm', 'burglar alarm', 'panic button', 'emergency call', 'help', 'assistance',
    'escort', 'protection', 'safety', 'secure', 'lockdown', 'evacuation', 'shelter',
    'fire', 'smoke', 'flames', 'burning', 'explosion', 'gas leak', 'chemical spill',
    'hazmat', 'dangerous', 'toxic', 'poisonous', 'radioactive', 'bomb squad', 'swat',
    'hostage', 'barricade', 'standoff', 'siege', 'rescue', 'search and rescue'
  ]
};

// Station locations for geographic assignment
const STATION_LOCATIONS = {
  // Rwanda Investigation Bureau stations
  'nyamirambo': { lat: -1.9656, lng: 30.0441, name: 'Nyamirambo Station' },
  'kimisagara': { lat: -1.9393, lng: 30.0583, name: 'Kimisagara Station' },
  'kicukiro': { lat: -1.9847, lng: 30.1038, name: 'Kicukiro Station' },
  
  // Police stations
  'remera': { lat: -1.9441, lng: 30.0856, name: 'Remera Police Station' },
  'nyamirambo_police': { lat: -1.9656, lng: 30.0441, name: 'Nyamirambo Police Station' },
  'gikondo': { lat: -1.9831, lng: 30.0744, name: 'Gikondo Police Station' },
  'kimisagara_police': { lat: -1.9393, lng: 30.0583, name: 'Kimisagara Police Station' },
  
  // Health facilities
  'kigali_hospital': { lat: -1.9441, lng: 30.0619, name: 'Kigali University Teaching Hospital' },
  'king_faisal': { lat: -1.9355, lng: 30.0606, name: 'King Faisal Hospital' },
  'kibagabaga': { lat: -1.9167, lng: 30.1000, name: 'Kibagabaga Hospital' }
};

interface LocationCoords {
  lat: number;
  lng: number;
}

interface IncidentAssignment {
  organizationId: string;
  stationId: string;
  confidence: number;
  assignmentReason: string;
}

interface EscalationRule {
  fromStatus: string;
  toStatus: string;
  timeThresholdMinutes: number;
  priorityLevel: string;
  escalateTo: string; // role to escalate to
}

// Escalation rules configuration
const ESCALATION_RULES: EscalationRule[] = [
  // High priority incidents - escalate quickly
  { fromStatus: 'reported', toStatus: 'escalated', timeThresholdMinutes: 15, priorityLevel: 'critical', escalateTo: 'station_admin' },
  { fromStatus: 'reported', toStatus: 'escalated', timeThresholdMinutes: 30, priorityLevel: 'high', escalateTo: 'station_admin' },
  
  // Assigned incidents not started
  { fromStatus: 'assigned', toStatus: 'escalated', timeThresholdMinutes: 20, priorityLevel: 'critical', escalateTo: 'station_admin' },
  { fromStatus: 'assigned', toStatus: 'escalated', timeThresholdMinutes: 45, priorityLevel: 'high', escalateTo: 'station_admin' },
  { fromStatus: 'assigned', toStatus: 'escalated', timeThresholdMinutes: 120, priorityLevel: 'medium', escalateTo: 'station_admin' },
  
  // In progress incidents taking too long
  { fromStatus: 'in_progress', toStatus: 'escalated', timeThresholdMinutes: 60, priorityLevel: 'critical', escalateTo: 'super_admin' },
  { fromStatus: 'in_progress', toStatus: 'escalated', timeThresholdMinutes: 120, priorityLevel: 'high', escalateTo: 'super_admin' },
  { fromStatus: 'in_progress', toStatus: 'escalated', timeThresholdMinutes: 240, priorityLevel: 'medium', escalateTo: 'super_admin' }
];

export class IncidentAssignmentService {
  
  /**
   * Analyze incident text using comprehensive keyword matching
   */
  static analyzeIncidentContent(title: string, description: string): { 
    organization: 'health' | 'investigation' | 'police', 
    confidence: number,
    matchedKeywords: string[] 
  } {
    const text = `${title} ${description}`.toLowerCase();
    const results = [];
    
    // Check each organization's keywords
    for (const [org, keywords] of Object.entries(ORGANIZATION_KEYWORDS)) {
      const matches = keywords.filter(keyword => text.includes(keyword));
      const confidence = (matches.length / keywords.length) * 100;
      
      results.push({
        organization: org as 'health' | 'investigation' | 'police',
        confidence,
        matchedKeywords: matches
      });
    }
    
    // Sort by confidence and return the best match
    results.sort((a, b) => b.confidence - a.confidence);
    
    // If no strong match found, default to police
    if (results[0].confidence < 5) {
      return {
        organization: 'police',
        confidence: 50,
        matchedKeywords: ['general incident']
      };
    }
    
    return results[0];
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(coord1: LocationCoords, coord2: LocationCoords): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Find optimal station using enhanced routing with real-world distances
   */
  static async findNearestStation(
    organizationType: 'health' | 'investigation' | 'police',
    incidentLocation: LocationCoords,
    urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<{ stationId: string, distance: number, stationName: string, eta: number, routeQuality: string }> {
    
    try {
      console.log(`🚑 Finding optimal ${organizationType} station using enhanced routing...`);
      
      // Use enhanced routing service for much more accurate assignment
      const optimalStation = await EnhancedRoutingService.findOptimalStationWithRouting(
        organizationType,
        incidentLocation,
        urgencyLevel
      );
      
      return {
        stationId: optimalStation.stationId,
        stationName: optimalStation.stationName,
        distance: optimalStation.route.distance,
        eta: optimalStation.emergencyETA,
        routeQuality: optimalStation.route.routeQuality
      };
      
    } catch (error) {
      console.warn(`❌ Enhanced routing failed, falling back to basic assignment: ${(error as Error).message}`);
      
      try {
        // Fallback to basic distance calculation
        const stations = await sequelize.query(
          `SELECT id, name, "organizationId", location FROM stations WHERE "isActive" = true`,
          { type: QueryTypes.SELECT }
        ) as any[];
        
        const organizations = await sequelize.query(
          `SELECT id, name FROM organizations WHERE "isActive" = true`,
          { type: QueryTypes.SELECT }
        ) as any[];
        
        // Filter stations by organization type
        const targetOrg = organizations.find(org => {
          const orgName = org.name.toLowerCase();
          return (
            (organizationType === 'health' && orgName.includes('health')) ||
            (organizationType === 'investigation' && orgName.includes('investigation')) ||
            (organizationType === 'police' && orgName.includes('police'))
          );
        });
        
        if (!targetOrg) {
          throw new Error(`No organization found for type: ${organizationType}`);
        }
        
        const relevantStations = stations.filter(station => station.organizationId === targetOrg.id);
        
        if (relevantStations.length === 0) {
          throw new Error(`No stations found for organization: ${targetOrg.name}`);
        }
        
        // Calculate basic distances and find nearest
        const stationsWithDistance = relevantStations.map(station => {
          let stationCoords;
          
          try {
            stationCoords = typeof station.location === 'string' 
              ? JSON.parse(station.location)  
              : station.location;
          } catch (e) {
            stationCoords = { lat: -1.9441, lng: 30.0619 };
          }
          
          if (!stationCoords || typeof stationCoords.lat !== 'number') {
            stationCoords = { lat: -1.9441, lng: 30.0619 };
          }
          
          const distance = this.calculateDistance(incidentLocation, stationCoords);
          const estimatedETA = (distance / 60) * 60; // Rough estimate: 60 km/h average speed
          
          return {
            stationId: station.id,
            stationName: station.name,
            distance: distance,
            eta: estimatedETA,
            routeQuality: 'basic_calculation'
          };
        });
        
        stationsWithDistance.sort((a, b) => a.distance - b.distance);
        return stationsWithDistance[0];
        
      } catch (fallbackError) {
        console.error('Error in fallback station assignment:', fallbackError);
        
        // Ultimate fallback: return first available station
        const fallbackStations = await sequelize.query(
          `SELECT s.id, s.name FROM stations s 
           JOIN organizations o ON s."organizationId" = o.id 
           WHERE o.name ILIKE :orgPattern AND s."isActive" = true 
           LIMIT 1`,
          {
            replacements: { 
              orgPattern: organizationType === 'health' ? '%Health%' : 
                         organizationType === 'investigation' ? '%Investigation%' : '%Police%'
            },
            type: QueryTypes.SELECT
          }
        ) as any[];
        
        if (fallbackStations.length > 0) {
          return {
            stationId: fallbackStations[0].id,
            stationName: fallbackStations[0].name,
            distance: 999,
            eta: 999,
            routeQuality: 'fallback'
          };
        }
        
        throw new Error('No suitable station found');
      }
    }
  }
  
  /**
   * Intelligent incident assignment with AI analysis and enhanced routing
   */
  static async assignIncident(
    title: string,
    description: string,
    incidentLocation?: LocationCoords,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<IncidentAssignment> {
    
    try {
      // Step 1: AI Content Analysis
      const contentAnalysis = this.analyzeIncidentContent(title, description);
      
      console.log(`🤖 AI Analysis Result:`, {
        organization: contentAnalysis.organization,
        confidence: `${contentAnalysis.confidence.toFixed(1)}%`,
        keywords: contentAnalysis.matchedKeywords.slice(0, 5) // Show first 5 matches
      });
      
      // Step 2: Enhanced Geographic Assignment with Real-World Routing
      let nearestStation;
      let assignmentReason = `AI Content Analysis (${contentAnalysis.confidence.toFixed(1)}% confidence)`;
      
      if (incidentLocation && incidentLocation.lat && incidentLocation.lng) {
        nearestStation = await this.findNearestStation(
          contentAnalysis.organization, 
          incidentLocation, 
          priority // Pass priority as urgency level
        );
        
        assignmentReason += ` + Enhanced Routing (${nearestStation.distance.toFixed(1)}km, ${nearestStation.eta.toFixed(1)}min ETA, ${nearestStation.routeQuality} route)`;
        
        console.log(`🚑 Enhanced Routing Assignment:`, {
          station: nearestStation.stationName,
          distance: `${nearestStation.distance.toFixed(1)}km`,
          eta: `${nearestStation.eta.toFixed(1)} minutes`,
          routeQuality: nearestStation.routeQuality,
          provider: 'Enhanced Routing Service'
        });
      } else {
        // Fallback to default station selection with priority consideration
        nearestStation = await this.findNearestStation(
          contentAnalysis.organization, 
          { lat: -1.9441, lng: 30.0619 }, // Kigali center
          priority
        );
        assignmentReason += ' + Default Location Assignment (no coordinates provided)';
      }
      
      // Get organization ID
      const organizations = await sequelize.query(
        `SELECT id FROM organizations WHERE name ILIKE :pattern AND "isActive" = true LIMIT 1`,
        {
          replacements: { 
            pattern: contentAnalysis.organization === 'health' ? '%Health%' : 
                    contentAnalysis.organization === 'investigation' ? '%Investigation%' : '%Police%'
          },
          type: QueryTypes.SELECT
        }
      ) as any[];
      
      return {
        organizationId: organizations[0]?.id,
        stationId: nearestStation.stationId,
        confidence: contentAnalysis.confidence,
        assignmentReason: assignmentReason
      };
      
    } catch (error) {
      console.error('Error in enhanced incident assignment:', error);
      
      // Ultimate fallback - assign to default police station
      const fallback = await sequelize.query(
        `SELECT o.id as orgId, s.id as stationId 
         FROM organizations o 
         JOIN stations s ON o.id = s."organizationId" 
         WHERE o.name ILIKE '%Police%' AND o."isActive" = true AND s."isActive" = true 
         LIMIT 1`,
        { type: QueryTypes.SELECT }
      ) as any[];
      
      if (fallback.length > 0) {
        return {
          organizationId: fallback[0].orgId,
          stationId: fallback[0].stationId,
          confidence: 25,
          assignmentReason: 'Fallback Assignment (Default Police Station)'
        };
      }
      
      throw new Error('Unable to assign incident to any organization/station');
    }
  }
  
  /**
   * Check and process incident escalations based on rules
   */
  static async processEscalations(): Promise<void> {
    try {
      console.log('🔄 Processing incident escalations...');
      
      // Get incidents that might need escalation
      const incidents = await sequelize.query(
        `SELECT 
          i.id, i.title, i.priority, i.status, i."stationId", i."organisationId",
          i."createdAt", i."statusUpdatedAt", i."assignedAt",
          s.name as "stationName", o.name as "organizationName"
         FROM incidents i
         JOIN stations s ON i."stationId" = s.id
         JOIN organizations o ON i."organisationId" = o.id
         WHERE i.status IN ('reported', 'assigned', 'in_progress') 
         AND i."createdAt" > NOW() - INTERVAL '24 hours'`,
        { type: QueryTypes.SELECT }
      ) as any[];
      
      let escalationCount = 0;
      
      for (const incident of incidents) {
        // Find applicable escalation rules
        const applicableRules = ESCALATION_RULES.filter(rule => 
          rule.fromStatus === incident.status && 
          rule.priorityLevel === incident.priority
        );
        
        for (const rule of applicableRules) {
          const timeToCheck = incident.statusUpdatedAt || incident.assignedAt || incident.createdAt;
          const minutesElapsed = Math.floor((Date.now() - new Date(timeToCheck).getTime()) / (1000 * 60));
          
          if (minutesElapsed >= rule.timeThresholdMinutes) {
            // Escalate incident
            await this.escalateIncident(incident.id, rule, incident);
            escalationCount++;
            
            console.log(`⚠️ Escalated incident "${incident.title}" after ${minutesElapsed} minutes`);
          }
        }
      }
      
      if (escalationCount > 0) {
        console.log(`✅ Processed ${escalationCount} incident escalations`);
      }
      
    } catch (error) {
      console.error('Error processing escalations:', error);
    }
  }
  
  /**
   * Escalate specific incident based on rule
   */
  private static async escalateIncident(incidentId: string, rule: EscalationRule, incident: any): Promise<void> {
    try {
      // Update incident status
      await sequelize.query(
        `UPDATE incidents 
         SET status = :newStatus, 
             "escalationLevel" = COALESCE("escalationLevel", 0) + 1,
             "escalatedAt" = NOW(),
             "escalationReason" = :reason,
             "statusUpdatedAt" = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: incidentId,
            newStatus: rule.toStatus,
            reason: `Auto-escalated: ${rule.fromStatus} for ${rule.timeThresholdMinutes} minutes (${rule.priorityLevel} priority)`
          },
          type: QueryTypes.UPDATE
        }
      );
      
      // Create notification for escalation target
      const targetUsers = await sequelize.query(
        `SELECT id FROM users 
         WHERE role = :role 
         AND ("stationId" = :stationId OR "organisationId" = :organizationId)
         AND "isActive" = true`,
        {
          replacements: {
            role: rule.escalateTo,
            stationId: incident.stationId,
            organizationId: incident.organisationId
          },
          type: QueryTypes.SELECT
        }
      ) as any[];
      
      // Send notifications to target users
      for (const user of targetUsers) {
        await sequelize.query(
          `INSERT INTO notifications (
            id, "userId", type, title, message, "relatedEntityType", "relatedEntityId", 
            "actionRequired", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), :userId, 'warning', :title, :message, 'incident', :incidentId,
            true, NOW(), NOW()
          )`,
          {
            replacements: {
              userId: user.id,
              title: `Incident Escalated: ${incident.title}`,
              message: `${incident.priority.toUpperCase()} priority incident has been escalated to you. Immediate attention required.`,
              incidentId: incidentId
            },
            type: QueryTypes.INSERT
          }
        );
      }
      
    } catch (error) {
      console.error(`Error escalating incident ${incidentId}:`, error);
    }
  }
  
  /**
   * Start escalation monitoring (call this periodically)
   */
  static startEscalationMonitoring(): NodeJS.Timeout {
    console.log('🚀 Starting incident escalation monitoring...');
    
    // Run immediately
    this.processEscalations();
    
    // Then run every 5 minutes
    return setInterval(() => {
      this.processEscalations();
    }, 5 * 60 * 1000); // 5 minutes
  }
} 