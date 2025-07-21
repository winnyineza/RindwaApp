import { createContext, useContext, ReactNode } from 'react';
import { Alert } from 'react-native';

// AI-powered incident detection types
export interface IncidentDetection {
  type: 'fire' | 'accident' | 'medical' | 'security' | 'flood' | 'unknown';
  confidence: number;
  description: string;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  detectedElements: string[];
  recommendedActions: string[];
}

interface SmartCameraContextType {
  analyzeImage: (imageUri: string) => Promise<IncidentDetection>;
  getSuggestedTitle: (detection: IncidentDetection) => string;
  getSuggestedDescription: (detection: IncidentDetection) => string;
}

const SmartCameraContext = createContext<SmartCameraContextType | undefined>(undefined);

// Mock AI detection service (in production, this would connect to a real AI service)
const mockAIDetection = async (imageUri: string): Promise<IncidentDetection> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate AI detection based on image analysis
  // In production, this would send the image to an AI service
  const detectionTypes = [
    {
      type: 'fire' as const,
      confidence: 0.85,
      description: 'Fire or smoke detected in the image',
      suggestedPriority: 'critical' as const,
      detectedElements: ['flames', 'smoke', 'burning'],
      recommendedActions: ['Call fire department immediately', 'Evacuate the area', 'Alert nearby people']
    },
    {
      type: 'accident' as const,
      confidence: 0.78,
      description: 'Vehicle accident or collision detected',
      suggestedPriority: 'high' as const,
      detectedElements: ['damaged vehicle', 'road obstruction'],
      recommendedActions: ['Call emergency services', 'Check for injuries', 'Direct traffic safely']
    },
    {
      type: 'medical' as const,
      confidence: 0.72,
      description: 'Medical emergency situation detected',
      suggestedPriority: 'high' as const,
      detectedElements: ['person in distress', 'medical situation'],
      recommendedActions: ['Call ambulance', 'Provide first aid if trained', 'Keep person comfortable']
    },
    {
      type: 'flood' as const,
      confidence: 0.68,
      description: 'Flooding or water damage detected',
      suggestedPriority: 'medium' as const,
      detectedElements: ['standing water', 'flood damage'],
      recommendedActions: ['Report to authorities', 'Avoid flooded areas', 'Document damage']
    },
    {
      type: 'security' as const,
      confidence: 0.65,
      description: 'Security concern or suspicious activity detected',
      suggestedPriority: 'medium' as const,
      detectedElements: ['suspicious activity', 'security concern'],
      recommendedActions: ['Report to police', 'Stay safe', 'Document what you see']
    }
  ];

  // Randomly select a detection for demonstration
  const randomDetection = detectionTypes[Math.floor(Math.random() * detectionTypes.length)];
  
  return randomDetection;
};

export function SmartCameraProvider({ children }: { children: ReactNode }) {
  const analyzeImage = async (imageUri: string): Promise<IncidentDetection> => {
    try {
      console.log('Analyzing image with AI...', imageUri);
      
      // Show loading indicator
      Alert.alert(
        'AI Analysis',
        'Analyzing image to detect incident type...',
        [],
        { cancelable: false }
      );

      const detection = await mockAIDetection(imageUri);
      
      console.log('AI Detection Result:', detection);
      
      return detection;
    } catch (error) {
      console.error('Failed to analyze image:', error);
      
      // Return fallback detection
      return {
        type: 'unknown',
        confidence: 0.5,
        description: 'Unable to automatically detect incident type',
        suggestedPriority: 'medium',
        detectedElements: ['general incident'],
        recommendedActions: ['Report to appropriate authorities', 'Provide detailed description']
      };
    }
  };

  const getSuggestedTitle = (detection: IncidentDetection): string => {
    const titleTemplates = {
      fire: 'Fire Emergency Detected',
      accident: 'Vehicle Accident Reported',
      medical: 'Medical Emergency',
      security: 'Security Incident',
      flood: 'Flooding Situation',
      unknown: 'Emergency Incident'
    };

    return titleTemplates[detection.type] || 'Emergency Incident';
  };

  const getSuggestedDescription = (detection: IncidentDetection): string => {
    const baseDescription = `AI-detected ${detection.type} incident with ${Math.round(detection.confidence * 100)}% confidence.`;
    
    const elementsText = detection.detectedElements.length > 0 
      ? ` Detected elements: ${detection.detectedElements.join(', ')}.`
      : '';
    
    const actionsText = detection.recommendedActions.length > 0
      ? ` Recommended actions: ${detection.recommendedActions.join(', ')}.`
      : '';

    return baseDescription + elementsText + actionsText;
  };

  const contextValue: SmartCameraContextType = {
    analyzeImage,
    getSuggestedTitle,
    getSuggestedDescription,
  };

  return (
    <SmartCameraContext.Provider value={contextValue}>
      {children}
    </SmartCameraContext.Provider>
  );
}

export const useSmartCamera = () => {
  const context = useContext(SmartCameraContext);
  if (context === undefined) {
    throw new Error('useSmartCamera must be used within a SmartCameraProvider');
  }
  return context;
};

// Utility functions for image processing
export const ImageProcessor = {
  // Compress image for better upload performance
  compressImage: async (imageUri: string, quality: number = 0.7): Promise<string> => {
    try {
      // In production, use react-native-image-resizer or similar
      // For now, return the original URI
      return imageUri;
    } catch (error) {
      console.error('Failed to compress image:', error);
      return imageUri;
    }
  },

  // Extract metadata from image
  getImageMetadata: async (imageUri: string) => {
    try {
      // In production, extract EXIF data, location, etc.
      return {
        size: 'unknown',
        location: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      return null;
    }
  },

  // Validate image for incident reporting
  validateImage: (imageUri: string): boolean => {
    if (!imageUri) return false;
    
    // Check if it's a valid image URI
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = imageUri.toLowerCase().split('.').pop();
    
    return validExtensions.some(ext => imageUri.toLowerCase().includes(ext));
  },
};

// Mock responses for different incident types
export const IncidentTemplates = {
  fire: {
    title: 'Fire Emergency',
    description: 'Fire detected with visible flames and smoke. Immediate emergency response required.',
    priority: 'critical',
    actions: ['Call Fire Department (101)', 'Evacuate area', 'Alert nearby residents']
  },
  accident: {
    title: 'Traffic Accident',
    description: 'Vehicle collision detected. Emergency services may be needed.',
    priority: 'high',
    actions: ['Call Police (100)', 'Check for injuries', 'Manage traffic flow']
  },
  medical: {
    title: 'Medical Emergency',
    description: 'Medical situation requiring immediate attention.',
    priority: 'high',
    actions: ['Call Medical Services (102)', 'Provide first aid', 'Keep person comfortable']
  },
  security: {
    title: 'Security Incident',
    description: 'Security concern or suspicious activity observed.',
    priority: 'medium',
    actions: ['Contact Police (100)', 'Document incident', 'Stay safe']
  },
  flood: {
    title: 'Flooding Emergency',
    description: 'Water accumulation or flooding situation detected.',
    priority: 'medium',
    actions: ['Report to authorities', 'Avoid flooded areas', 'Document damage']
  }
};