// Import necessary libraries.
// 'axios' for making HTTP requests. Run 'npm install axios' to get this.
import axios from 'axios';

// --- IMPORTANT: REPLACE THESE PLACEHOLDERS WITH YOUR ACTUAL SUPABASE CREDENTIALS ---
// You can find these in your Supabase project settings under 'API'.
const SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co"; 
// The Service Role Key bypasses RLS, allowing the script to write data.
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";

const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/sensor_readings`;
const API_HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_ROLE_KEY, // Use the service role key for backend communication
};

// Function to generate a random number within a range
const getRandomNumber = (min, max, decimalPlaces = 1) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.floor(Math.random() * (max - min + 1) * factor + min * factor) / factor;
};

// Function to generate mock data for a single node with a trend
const generateMockDataWithTrend = (nodeId, timeInSeconds) => {
    // Generate a smooth, sinusoidal trend for a more realistic graph
    const trendFactor = Math.sin(timeInSeconds / 10) * 2;

    let data = {
        node_id: nodeId,
        air_quality_mq135: getRandomNumber(120, 180, 0),
        alcohol_mq3: getRandomNumber(350, 450, 0),
        smoke_mq2: getRandomNumber(1100, 1300, 0),
        timestamp: new Date().toISOString(),
    };

    if (nodeId.includes('soil')) {
        // Soil node: slightly different temp/humidity
        data.temperature = getRandomNumber(22 + trendFactor, 25 + trendFactor);
        data.humidity = getRandomNumber(55 - trendFactor, 62 - trendFactor);
        // Soil moisture: never allow 0%
        let moisture = getRandomNumber(40 + trendFactor * 1.5, 50 + trendFactor * 1.5);
        data.soil_moisture = moisture < 5 ? 5 : moisture; // minimum 5%
    } else {
        // Air node: slightly different temp/humidity
        data.temperature = getRandomNumber(24 + trendFactor, 27 + trendFactor);
        data.humidity = getRandomNumber(58 - trendFactor, 65 - trendFactor);
        // Explicitly set soil_moisture to null for air nodes to match the schema
        data.soil_moisture = null;
    }

    // Introduce a sudden spike for anomaly detection demo
    if (timeInSeconds === 30 || timeInSeconds === 45) {
        data.temperature += 5;
        data.air_quality_mq135 += 100;
        console.warn(`[ANOMALY] Generating a data spike for ${nodeId} at second ${timeInSeconds}`);
    }

    return data;
};

// Function to send data for a single node
const sendData = async (nodeId, timeInSeconds) => {
    const mockData = generateMockDataWithTrend(nodeId, timeInSeconds);
    console.log(`Sending data for ${nodeId} at second ${timeInSeconds}:`, mockData);

    try {
        await axios.post(API_ENDPOINT, mockData, { headers: API_HEADERS });
        console.log(`Successfully sent data for ${nodeId} at second ${timeInSeconds}`);
    } catch (error) {
        console.error(`Failed to send data for ${nodeId}:`, error.message);
    }
};

// Main loop to send data for both nodes every second until manually stopped
const startSimulation = () => {
    console.log("Starting continuous data simulation... Press Ctrl+C to stop.");
        let timeInSeconds = 0;
        // Store previous soil moisture value
        let prevSoilMoisture = 45;

        setInterval(async () => {
            // Send data for air node
            await sendData('air_node', timeInSeconds);

            // Generate soil node data
            let soilData = generateMockDataWithTrend('soil_node', timeInSeconds);
            // If soil_moisture is null or less than 5%, use previous non-zero value
            if (soilData.soil_moisture == null || soilData.soil_moisture < 5) {
                soilData.soil_moisture = prevSoilMoisture;
            } else {
                prevSoilMoisture = soilData.soil_moisture;
            }
            // Send data for soil node
            try {
                await axios.post(API_ENDPOINT, soilData, { headers: API_HEADERS });
                console.log(`Successfully sent data for soil_node at second ${timeInSeconds}`);
            } catch (error) {
                console.error(`Failed to send data for soil_node:`, error.message);
            }

            timeInSeconds++;
        }, 2000); // Send data every 2 seconds
};

startSimulation();
