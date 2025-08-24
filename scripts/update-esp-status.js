// ESP Status Update Script - Controls actual ESP data collection
// Run this script whenever the frontend changes the data collection mode

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_FILE = path.join(__dirname, '../public/esp-connection-status.json');

function updateESPStatus(mode) {
  if (!['stopped', 'collecting', 'continuous'].includes(mode)) {
    console.error('Invalid mode. Must be one of: stopped, collecting, continuous');
    return false;
  }

  const status = {
    esp_connection_enabled: mode !== 'stopped',
    data_collection_enabled: mode !== 'stopped',
    collection_mode: mode,
    timestamp: new Date().toISOString(),
    message: mode === 'stopped' 
      ? "Data collection stopped - ESP nodes should not send data to database"
      : mode === 'collecting'
      ? "Data collection active - ESP nodes should send data to database"
      : "Continuous data collection - ESP nodes should continuously send data to database"
  };

  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    console.log(`ESP data collection mode updated to: ${mode}`);
    console.log('ESP nodes will check this status within 30 seconds');
    return true;
  } catch (error) {
    console.error('Failed to update ESP status:', error);
    return false;
  }
}

// Legacy function for backward compatibility
function updateESPConnection(enabled) {
  const mode = enabled ? 'continuous' : 'stopped';
  return updateESPStatus(mode);
}

// Command line usage: node scripts/update-esp-status.js <mode>
// Where <mode> is: stopped, collecting, or continuous
if (process.argv[2]) {
  const input = process.argv[2].toLowerCase();
  
  // Handle legacy true/false inputs
  if (input === 'true') {
    updateESPStatus('continuous');
  } else if (input === 'false') {
    updateESPStatus('stopped');
  } else {
    updateESPStatus(input);
  }
}

export { updateESPStatus, updateESPConnection };
