const https = require('https');
require('dotenv').config();

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

console.log('🧪 Quick Google Maps API Test');
console.log('==============================');

if (!apiKey) {
  console.log('❌ GOOGLE_MAPS_API_KEY not found in .env file');
  console.log('💡 Please add: GOOGLE_MAPS_API_KEY=your-api-key');
  process.exit(1);
}

console.log(`🔑 API Key detected: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);

// Test coordinates in Kigali
const testUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=-1.9441,30.0619&destinations=-1.9656,30.0441&mode=driving&departure_time=now&units=metric&key=${apiKey}`;

console.log('🌐 Testing Google Distance Matrix API...');

https.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.status === 'OK') {
        const element = result.rows[0]?.elements[0];
        if (element && element.status === 'OK') {
          const distance = element.distance.value / 1000;
          const duration = element.duration.value / 60;
          const trafficDuration = element.duration_in_traffic?.value / 60;
          
          console.log('✅ Google Maps API is working!');
          console.log(`📏 Distance: ${distance.toFixed(1)} km`);
          console.log(`⏱️  Duration: ${duration.toFixed(1)} minutes`);
          console.log(`🚦 With Traffic: ${trafficDuration ? trafficDuration.toFixed(1) + ' minutes' : 'Not available'}`);
          console.log(`🚨 Emergency ETA: ${(duration * 0.7).toFixed(1)} minutes`);
          console.log('');
          console.log('🎉 Enhanced routing is ready!');
          console.log('Your emergency incidents will now use real-world distances and traffic data.');
        } else {
          console.log(`❌ Route error: ${element?.status || 'Unknown'}`);
        }
      } else {
        console.log(`❌ API Error: ${result.status}`);
        if (result.error_message) {
          console.log(`📄 Message: ${result.error_message}`);
        }
      }
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (error) => {
  console.log('❌ Request failed:', error.message);
}); 