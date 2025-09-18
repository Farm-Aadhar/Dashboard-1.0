import { supabase } from '@/integrations/supabase/client';

export interface DataCollectionStatus {
  id: number;
  collection_enabled: boolean;
  collection_mode: string;
  updated_at: string;
  updated_by: string;
}

export class DatabaseCollectionController {
  
  /**
   * Check if data collection is currently enabled in the database
   */
  static async isCollectionEnabled(): Promise<boolean> {
    try {
      // Use direct SQL query since the table might not be in TypeScript types yet
      const { data, error } = await supabase
        .rpc('check_data_collection_enabled');
      
      if (error) {
        console.error('Error checking collection status:', error);
        return true; // Default to enabled if can't check
      }
      
      return data ?? true;
    } catch (error) {
      console.error('Error in isCollectionEnabled:', error);
      return true; // Default to enabled on error
    }
  }
  
  /**
   * Get the current collection status using direct SQL
   */
  static async getCollectionStatus(): Promise<DataCollectionStatus | null> {
    try {
      const { data, error } = await supabase
        .from('data_collection_status' as any)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error getting collection status:', error);
        return null;
      }
      
      return data as DataCollectionStatus;
    } catch (error) {
      console.error('Error in getCollectionStatus:', error);
      return null;
    }
  }
  
  /**
   * Update the database collection status
   */
  static async updateCollectionStatus(
    enabled: boolean, 
    mode: 'stopped' | 'collecting' | 'continuous' = 'continuous'
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_data_collection_status' as any, {
        enabled,
        mode
      });
      
      if (error) {
        console.error('Error updating collection status:', error);
        return false;
      }
      
      console.log(`Database collection ${enabled ? 'enabled' : 'disabled'} with mode: ${mode}`);
      return true;
    } catch (error) {
      console.error('Error in updateCollectionStatus:', error);
      return false;
    }
  }
  
  /**
   * Enable data collection
   */
  static async enableCollection(mode: 'collecting' | 'continuous' = 'continuous'): Promise<boolean> {
    return this.updateCollectionStatus(true, mode);
  }
  
  /**
   * Disable data collection
   */
  static async disableCollection(): Promise<boolean> {
    return this.updateCollectionStatus(false, 'stopped');
  }
  
  /**
   * Test if the database trigger is working by attempting an insert
   */
  static async testDatabaseTrigger(): Promise<{ success: boolean; message: string }> {
    try {
      const testData = {
        node_id: 'test-node',
        temperature: 25.0,
        humidity: 60.0,
        air_quality_mq135: 2500,
        alcohol_mq3: 1000,
        smoke_mq2: 1800,
        timestamp: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('sensor_readings')
        .insert([testData]);
      
      if (error) {
        if (error.message.includes('Data collection is currently disabled')) {
          return {
            success: true,
            message: 'Database trigger is working - insert blocked as expected'
          };
        } else {
          return {
            success: false,
            message: `Unexpected error: ${error.message}`
          };
        }
      } else {
        return {
          success: true,
          message: 'Insert successful - data collection is enabled'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error}`
      };
    }
  }
}

export default DatabaseCollectionController;
