import { useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";
const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/sensor_readings`;
const API_HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
};

const getRandomNumber = (min: number, max: number, decimalPlaces = 1) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.floor(Math.random() * (max - min + 1) * factor + min * factor) / factor;
};

const generateMockDataWithTrend = (timeInSeconds: number) => {
    const trendFactor = Math.sin(timeInSeconds / 10) * 2;
    // Air data
    const air_temperature = getRandomNumber(24 + trendFactor, 27 + trendFactor);
    const air_humidity = getRandomNumber(58 - trendFactor, 65 - trendFactor);
    const air_air_quality_mq135 = getRandomNumber(120, 180, 0);
    const air_alcohol_mq3 = getRandomNumber(350, 450, 0);
    const air_smoke_mq2 = getRandomNumber(1100, 1300, 0);
    // Soil data
    const soil_temperature = getRandomNumber(22 + trendFactor, 25 + trendFactor);
    const soil_humidity = getRandomNumber(55 - trendFactor, 62 - trendFactor);
    let soil_moisture = getRandomNumber(40 + trendFactor * 1.5, 50 + trendFactor * 1.5);
    if (soil_moisture < 5) soil_moisture = 5;
    // Simulate spikes
    let final_air_temperature = air_temperature;
    let final_air_air_quality_mq135 = air_air_quality_mq135;
    if (timeInSeconds === 30 || timeInSeconds === 45) {
        final_air_temperature += 5;
        final_air_air_quality_mq135 += 100;
    }
    return {
        timestamp: new Date().toISOString(),
        air_temperature: final_air_temperature,
        air_humidity,
        air_air_quality_mq135: final_air_air_quality_mq135,
        air_alcohol_mq3,
        air_smoke_mq2,
        soil_temperature,
        soil_humidity,
        soil_moisture,
    };
};


export function SimulationController() {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [running, setRunning] = useState(false);
    const timeRef = useRef(0);

    const sendData = async (timeInSeconds: number) => {
        const mockData = generateMockDataWithTrend(timeInSeconds);
        try {
            await axios.post(API_ENDPOINT, mockData, { headers: API_HEADERS });
        } catch (error: any) {
            // Optionally handle error
        }
    };

    const toggleSimulation = () => {
        if (!running) {
            setRunning(true);
            intervalRef.current = setInterval(async () => {
                await sendData(timeRef.current);
                timeRef.current++;
            }, 2000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setRunning(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={toggleSimulation}>
            {running ? 'Stop Simulation' : 'Start Simulation'}
        </Button>
    );
}
