// Simple Node.js script to update ESP connection status
// Run this script whenever the frontend changes the ESP connection state

const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '../public/esp-connection-status.json');

function updateESPStatus(enabled) {
  const status = {
    esp_connection_enabled: enabled,
    timestamp: new Date().toISOString(),
    message: enabled 
      ? "ESP nodes are allowed to send data" 
      : "ESP nodes should stop sending data"
  };

  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    console.log('ESP status updated:', status);
    return true;
  } catch (error) {
    console.error('Failed to update ESP status:', error);
    return false;
  }
}

// If called from command line: node update-esp-status.js true/false
if (process.argv[2]) {
  const enabled = process.argv[2].toLowerCase() === 'true';
  updateESPStatus(enabled);
}

module.exports = { updateESPStatus };
