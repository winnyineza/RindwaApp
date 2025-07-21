# Rindwa Emergency Management Platform

A comprehensive emergency incident management platform that empowers citizens and emergency services through innovative mobile and web technologies.

##  Features

### Web Admin Dashboard
- **Role-Based Access Control**: Main Admin, Super Admin, Station Admin, Station Staff hierarchies
- **Real-time Incident Management**: Create, assign, track, and resolve emergency incidents
- **Advanced Analytics**: Comprehensive reporting and performance metrics
- **Multi-language Support**: English, French, and Kinyarwanda
- **User Management**: Invitation-based user onboarding system
- **File Management**: Profile pictures and incident photo uploads

### Mobile Citizen App
- **Anonymous Reporting**: Citizens can report incidents without authentication
- **Real-time Updates**: Live incident feed with community upvoting
- **Emergency Services**: Direct access to Police (100), Fire (101), Medical (102)
- **GPS Integration**: Automatic location detection for incident reporting
- **Photo Capture**: Evidence collection for incident reports

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive data sanitization
- **Audit Logging**: Complete activity tracking
- **Security Headers**: CORS, CSP, and other security protections

##  Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- React Hook Form with Zod validation

### Backend
- Express.js with TypeScript
- PostgreSQL with Sequelize ORM
- JWT for authentication
- SendGrid for email services
- Twilio for SMS notifications
- Winston for logging

### Development
- Vite for build tooling
- ESLint + Prettier for code quality
- Jest for testing
- Swagger for API documentation

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rindwa-platform.git
   cd rindwa-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/rindwa
   JWT_SECRET=your-secure-jwt-secret
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=admin@yourdomain.com
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run backup:db` - Create database backup
- `npm run backup:files` - Create file backup
- `npm run backup:full` - Create full backup

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### API Documentation

Once the server is running, visit:
- **API Documentation**: `http://localhost:5000/api-docs`
- **OpenAPI Spec**: `http://localhost:5000/api-docs.json`

##  Architecture

### Database Schema
- **Users**: Role-based user management
- **Organizations**: Emergency service organizations
- **Stations**: Regional service stations
- **Incidents**: Emergency reports with tracking
- **Invitations**: User invitation system
- **Audit Logs**: Activity tracking
- **File Uploads**: File management
- **Notifications**: User notifications

### Security Features
- Rate limiting on all API endpoints
- Input validation and sanitization
- JWT-based authentication
- CORS and security headers
- Comprehensive audit logging
- Password hashing with bcrypt

### Monitoring & Health
- Health check endpoints (`/health`, `/ready`, `/alive`)
- Structured logging with Winston
- Performance monitoring
- Error tracking and reporting

##  Deployment

### Production Checklist
- [ ] Database configured and migrated
- [ ] Environment variables set
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Email service configured
- [ ] SMS service configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup

### Deployment Options
1. **VPS Deployment** (Recommended)
2. **Platform-as-a-Service** (Heroku, Railway, Render)
3. **Container Deployment** (Docker, Kubernetes)

## User Roles

### Main Admin
- System-wide organization management
- User role assignments
- System configuration

### Super Admin
- Organization-level management
- Station creation and management
- User management within organization

### Station Admin
- Station-level operations
- Incident assignment
- Staff management

### Station Staff
- Incident handling
- Status updates
- Field operations

## Mobile App

The mobile app is currently a responsive web application. For native mobile apps:

1. **Current**: Web-based (works in mobile browsers)
2. **Future**: Convert to React Native for native apps

## Security

### Authentication Flow
1. User logs in with email/password
2. JWT token issued and stored
3. Token included in subsequent requests
4. Role-based access control applied

### Rate Limiting
- General API: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Automatic IP-based blocking

### Data Protection
- All passwords hashed with bcrypt
- Input validation on all endpoints
- SQL injection protection via ORM
- XSS protection through sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: support@rindwa.com
- Documentation: `/api-docs`
- Health Status: `/health`

## Monitoring

### Health Endpoints
- `/health` - Complete health check
- `/ready` - Readiness probe
- `/alive` - Liveness probe

### Logging
Logs are stored in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error logs only

### Metrics
- Response times
- Error rates
- Database performance
- User activity

##  Backup & Recovery

### Automated Backups
- Database backups: Daily in production
- File backups: Daily in production
- Retention: 7 days

### Manual Backups
```bash
npm run backup:db      # Database only
npm run backup:files   # Files only
npm run backup:full    # Complete backup
```

## Internationalization

Supported languages:
- English (en)
- French (fr)
- Kinyarwanda (rw)

Language files located in `client/src/lib/i18n.ts`