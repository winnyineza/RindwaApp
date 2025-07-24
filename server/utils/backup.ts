import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger';

const execAsync = promisify(exec);

export class BackupManager {
  private backupDir: string;
  private maxBackups: number;

  constructor(backupDir = 'backups', maxBackups = 7) {
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createDatabaseBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `database-${timestamp}.sql`);
    
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const command = `pg_dump "${databaseUrl}" > ${backupFile}`;
      await execAsync(command);
      
      logger.info('Database backup created successfully', {
        backupFile,
        timestamp,
      });

      // Clean up old backups
      await this.cleanupOldBackups();
      
      return backupFile;
    } catch (error) {
      logger.error('Database backup failed', {
        error: error.message,
        backupFile,
      });
      throw error;
    }
  }

  async createFileBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `files-${timestamp}.tar.gz`);
    
    try {
      const command = `tar -czf ${backupFile} uploads/`;
      await execAsync(command);
      
      logger.info('File backup created successfully', {
        backupFile,
        timestamp,
      });
      
      return backupFile;
    } catch (error) {
      logger.error('File backup failed', {
        error: error.message,
        backupFile,
      });
      throw error;
    }
  }

  async createFullBackup(): Promise<{ database: string; files: string }> {
    try {
      const [databaseBackup, filesBackup] = await Promise.all([
        this.createDatabaseBackup(),
        this.createFileBackup(),
      ]);

      logger.info('Full backup completed successfully', {
        databaseBackup,
        filesBackup,
      });

      return {
        database: databaseBackup,
        files: filesBackup,
      };
    } catch (error) {
      logger.error('Full backup failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async restoreDatabase(backupFile: string): Promise<void> {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const command = `psql "${databaseUrl}" < ${backupFile}`;
      await execAsync(command);
      
      logger.info('Database restored successfully', {
        backupFile,
      });
    } catch (error) {
      logger.error('Database restore failed', {
        error: error.message,
        backupFile,
      });
      throw error;
    }
  }

  async restoreFiles(backupFile: string): Promise<void> {
    try {
      const command = `tar -xzf ${backupFile}`;
      await execAsync(command);
      
      logger.info('Files restored successfully', {
        backupFile,
      });
    } catch (error) {
      logger.error('File restore failed', {
        error: error.message,
        backupFile,
      });
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files.filter(file => file.endsWith('.sql') || file.endsWith('.tar.gz'));
    } catch (error) {
      logger.error('Failed to list backups', {
        error: error.message,
      });
      return [];
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const sortedBackups = backups.sort((a, b) => {
        const timeA = fs.statSync(path.join(this.backupDir, a)).mtime;
        const timeB = fs.statSync(path.join(this.backupDir, b)).mtime;
        return timeB.getTime() - timeA.getTime();
      });

      if (sortedBackups.length > this.maxBackups) {
        const backupsToDelete = sortedBackups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          const backupPath = path.join(this.backupDir, backup);
          fs.unlinkSync(backupPath);
          logger.info('Old backup deleted', { backup });
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups', {
        error: error.message,
      });
    }
  }

  async scheduleBackup(intervalHours = 24): Promise<void> {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const runBackup = async () => {
      try {
        await this.createFullBackup();
        logger.info('Scheduled backup completed');
      } catch (error) {
        logger.error('Scheduled backup failed', {
          error: error.message,
        });
      }
    };

    // Run initial backup
    await runBackup();

    // Schedule recurring backups
    setInterval(runBackup, intervalMs);
    
    logger.info('Backup scheduler started', {
      intervalHours,
    });
  }
}

export const backupManager = new BackupManager();