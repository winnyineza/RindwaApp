// Global test teardown - runs once after all test suites
import { sequelize } from '../server/db';

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Close database connections
    await sequelize.close();
    console.log('✅ Database connections closed');
    
    // Additional cleanup if needed
    // - Close WebSocket connections
    // - Clean up temporary files
    // - Reset environment variables
    
    console.log('✅ Test environment cleaned up successfully');
    
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
    // Don't fail the process, just log the error
  }
}; 