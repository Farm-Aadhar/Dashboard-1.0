// ESP Status API - Returns current data collection status for ESP nodes
// This endpoint is polled by ESP nodes to determine whether to send data to database

const checkConnectionStatus = () => {
  try {
    // Try to read from the status file first (updated by the dashboard)
    const statusFile = '../esp-connection-status.json';
    
    // Default status (fallback if file read fails)
    let status = {
      esp_connection_enabled: false,
      data_collection_enabled: false,
      collection_mode: "stopped",
      timestamp: new Date().toISOString(),
      message: "Data collection stopped - ESP nodes should not send data to database"
    };
    
    // In a real server environment, you would read the JSON file here
    // For static serving, the ESP nodes should poll the JSON file directly
    // This script serves as a backup/alternative endpoint
    
    return status;
  } catch (error) {
    return {
      esp_connection_enabled: false,
      data_collection_enabled: false,
      collection_mode: "stopped",
      timestamp: new Date().toISOString(),
      message: "Error checking connection status - defaulting to stopped"
    };
  }
};

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = checkConnectionStatus;
} else {
  // Browser environment - display JSON status
  document.addEventListener('DOMContentLoaded', () => {
    const status = checkConnectionStatus();
    document.body.innerHTML = JSON.stringify(status, null, 2);
    document.body.style.fontFamily = 'monospace';
    document.body.style.whiteSpace = 'pre-wrap';
    document.body.style.backgroundColor = '#f5f5f5';
    document.body.style.padding = '20px';
  });
}
