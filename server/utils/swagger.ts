import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rindwa Emergency Management API',
      version: '1.0.0',
      description: 'Comprehensive emergency incident management platform API',
      contact: {
        name: 'Rindwa Support',
        email: 'support@rindwa.com',
      },
    },
    servers: [
      {
        url: process.env.FRONTEND_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'] 
            },
            organizationId: { type: 'integer' },
            stationId: { type: 'integer' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Station: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            organizationId: { type: 'integer' },
            region: { type: 'string' },
            locationLat: { type: 'number' },
            locationLng: { type: 'number' },
            address: { type: 'string' },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            reporterId: { type: 'integer' },
            organizationId: { type: 'integer' },
            stationId: { type: 'integer' },
            assignedToId: { type: 'integer' },
            status: { 
              type: 'string', 
              enum: ['pending', 'assigned', 'in_progress', 'resolved', 'escalated'] 
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'critical'] 
            },
            locationLat: { type: 'number' },
            locationLng: { type: 'number' },
            locationAddress: { type: 'string' },
            photoUrl: { type: 'string' },
            notes: { type: 'string' },
            upvotes: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Stats: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            pending: { type: 'integer' },
            inProgress: { type: 'integer' },
            resolved: { type: 'integer' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./server/routes.ts', './server/middleware/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Rindwa API Documentation',
  }));
  
  // JSON endpoint for OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;