const bcrypt = require('bcrypt');

async function testPassword() {
  console.log('🧪 Testing password verification...');
  
  // Test the exact password from database
  const storedHash = '$2b$10$rQc8Z1N9X.bqV4rj4hL1V.VD8Qa3qJ5qZ1N9X.bqV4rj4hL1V.VD8Q';
  const inputPassword = 'admin123';
  
  console.log('📝 Input password:', inputPassword);
  console.log('🔐 Stored hash:', storedHash.substring(0, 20) + '...');
  
  try {
    const isValid = await bcrypt.compare(inputPassword, storedHash);
    console.log('✅ Password match result:', isValid);
    
    // Also test creating a new hash
    const newHash = await bcrypt.hash(inputPassword, 10);
    console.log('🆕 New hash created:', newHash.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('❌ Password verification error:', error.message);
  }
}

testPassword();
