// Backend script to update ESP connection status
// This would typically be part of your backend API

const fs = require('fs');
const path = require('path');

const STATUS_FILE_PATH = path.join(__dirname, '../public/esp-connection-status.json');

function updateESPConnectionStatus(enabled) {
  const statusData = {
    esp_connection_enabled: enabled,
    timestamp: new Date().toISOString(),
    message: enabled 
      ? "ESP nodes are allowed to send data" 
      : "ESP nodes should stop sending data"
  };

  try {
    fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(statusData, null, 2));
    console.log('ESP connection status updated:', statusData);
    return true;
  } catch (error) {
    console.error('Failed to update ESP status file:', error);
    return false;
  }
}

// Export for use in other modules
module.exports = { updateESPConnectionStatus };

// If called directly from command line
if (require.main === module) {
  const enabled = process.argv[2] === 'true';
  updateESPConnectionStatus(enabled);
}
