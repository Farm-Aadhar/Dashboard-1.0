/**
 * ESP Data Collection Middleware
 * 
 * This function should be called by ESP nodes before sending data to the database
 * It checks the collection status and returns whether data should be sent
 */

import { supabase } from '@/integrations/supabase/client';

export interface CollectionStatus {
  enabled: boolean;
  mode: 'stopped' | 'collecting' | 'continuous';
  timestamp: string;
  message: string;
}

export class ESPCollectionMiddleware {
  
  /**
   * Check if ESP nodes should send data to the database
   * This should be called before every data insert from ESP nodes
   */
  static async shouldCollectData(): Promise<CollectionStatus> {
    try {
      // Look for the latest collection configuration record
      const { data: configRecords, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .like('node_id', '__CONFIG_COLLECTION_%')
        .eq('air_quality_mq135', -888)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking collection status:', error);
        // Default to enabled if we can't check
        return {
          enabled: true,
          mode: 'continuous',
          timestamp: new Date().toISOString(),
          message: 'Could not check status - defaulting to enabled'
        };
      }

      if (!configRecords || configRecords.length === 0) {
        // No config found, default to enabled
        return {
          enabled: true,
          mode: 'continuous',
          timestamp: new Date().toISOString(),
          message: 'No collection config found - defaulting to enabled'
        };
      }

      const config = configRecords[0];
      const enabled = config.temperature === 1;
      const modeMap = { 0: 'stopped', 1: 'collecting', 2: 'continuous' } as const;
      const mode = modeMap[config.alcohol_mq3 as keyof typeof modeMap] || 'stopped';

      return {
        enabled,
        mode,
        timestamp: config.timestamp,
        message: enabled 
          ? `Collection enabled in ${mode} mode`
          : 'Collection is disabled - do not send data'
      };
    } catch (error) {
      console.error('Error in shouldCollectData:', error);
      // Default to enabled on error
      return {
        enabled: true,
        mode: 'continuous',
        timestamp: new Date().toISOString(),
        message: 'Error checking status - defaulting to enabled'
      };
    }
  }

  /**
   * Wrapper function for ESP data insertion that checks collection status first
   */
  static async insertSensorData(sensorData: any): Promise<{ success: boolean; message: string }> {
    try {
      const status = await this.shouldCollectData();
      
      if (!status.enabled) {
        return {
          success: false,
          message: `Data collection is disabled (${status.mode}). Data not inserted.`
        };
      }

      // Collection is enabled, proceed with insert
      const { error } = await supabase
        .from('sensor_readings')
        .insert([sensorData]);

      if (error) {
        return {
          success: false,
          message: `Database insert failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: `Data inserted successfully in ${status.mode} mode`
      };
    } catch (error) {
      return {
        success: false,
        message: `Insert failed with error: ${error}`
      };
    }
  }

  /**
   * Get the current collection status for display/logging
   */
  static async getCollectionStatus(): Promise<CollectionStatus> {
    return this.shouldCollectData();
  }
}

export default ESPCollectionMiddleware;
