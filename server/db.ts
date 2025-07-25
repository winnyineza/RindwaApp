import dotenv from 'dotenv';
dotenv.config();
import { Sequelize } from 'sequelize';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine if we're in production based on multiple factors
const isProduction = process.env.NODE_ENV === 'production' && 
                    !process.env.DATABASE_URL.includes('localhost') && 
                    !process.env.DATABASE_URL.includes('127.0.0.1');

console.log(`🔧 Database Mode: ${isProduction ? 'Production' : 'Development'}`);
console.log(`🔧 SSL Enabled: ${isProduction}`);

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {
    // Explicitly disable SSL for local development
    ssl: false
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /TIMEOUT/,
      /ESOCKETTIMEDOUT/,
      /ENOTFOUND/,
      /EAI_AGAIN/
    ],
    max: 3
  }
});

