import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SensorReading {
  id: string;
  timestamp: string;
  air_temperature: number;
  air_humidity: number;
  air_air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
}

export function PastRecordsTable() {
  const [records, setRecords] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data) {
        // Map old format to new format if needed
        const mapped = data.map((rec: any) => ({
          id: rec.id,
          timestamp: rec.timestamp,
          air_temperature: rec.air_temperature ?? rec.temperature ?? null,
          air_humidity: rec.air_humidity ?? rec.humidity ?? null,
          air_air_quality_mq135: rec.air_air_quality_mq135 ?? rec.air_quality_mq135 ?? null,
          air_alcohol_mq3: rec.air_alcohol_mq3 ?? rec.alcohol_mq3 ?? null,
          air_smoke_mq2: rec.air_smoke_mq2 ?? rec.smoke_mq2 ?? null,
          soil_temperature: rec.soil_temperature ?? null,
          soil_humidity: rec.soil_humidity ?? null,
          soil_moisture: rec.soil_moisture ?? null,
        }));
        setRecords(mapped);
      }
      setLoading(false);
    };
    fetchRecords();
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Past Sensor Records</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            <span className="ml-2">Loading records...</span>
          </div>
        ) : (
          <Table>
            <TableCaption>All sensor readings from the database</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Air Temp (°C)</TableHead>
                <TableHead>Air Humidity (%)</TableHead>
                <TableHead>Air Quality (ppm)</TableHead>
                <TableHead>Alcohol (ppm)</TableHead>
                <TableHead>Smoke (ppm)</TableHead>
                <TableHead>Soil Temp (°C)</TableHead>
                <TableHead>Soil Humidity (%)</TableHead>
                <TableHead>Soil Moisture (%)</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{rec.id}</TableCell>
                  <TableCell>{rec.air_temperature?.toFixed(1)}</TableCell>
                  <TableCell>{rec.air_humidity?.toFixed(1)}</TableCell>
                  <TableCell>{rec.air_air_quality_mq135}</TableCell>
                  <TableCell>{rec.air_alcohol_mq3}</TableCell>
                  <TableCell>{rec.air_smoke_mq2}</TableCell>
                  <TableCell>{rec.soil_temperature?.toFixed(1)}</TableCell>
                  <TableCell>{rec.soil_humidity?.toFixed(1)}</TableCell>
                  <TableCell>{rec.soil_moisture?.toFixed(1)}</TableCell>
                  <TableCell>{new Date(rec.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
