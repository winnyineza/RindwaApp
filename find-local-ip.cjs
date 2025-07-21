#!/usr/bin/env node

// Simple script to find your local IP address for mobile app configuration

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const netInterface of interfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        return netInterface.address;
      }
    }
  }
  
  return 'localhost';
}

const localIP = getLocalIPAddress();

console.log('\n=== Rindwa Local Development IP Configuration ===');
console.log(`Your local IP address: ${localIP}`);
console.log(`\nUpdate mobile-app/src/services/api.ts with:`);
console.log(`const API_BASE_URL = 'http://${localIP}:5000/api';`);
console.log('\nWeb Admin Dashboard: http://localhost:5000');
console.log(`Mobile App API endpoint: http://${localIP}:5000/api`);
console.log('=================================================\n');