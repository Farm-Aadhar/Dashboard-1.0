// Simple test to check Supabase connection
// Add this to your browser console to test the connection

import { supabase } from './src/integrations/supabase/client.js';

// Test 1: Check if we can connect to Supabase
console.log('Testing Supabase connection...');
console.log('Supabase URL:', supabase.supabaseUrl);

// Test 2: Try to query an existing table (like user_profiles)
try {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('Existing table test:', { data, error });
} catch (err) {
  console.log('Connection test failed:', err);
}

// Test 3: Try to query current_thresholds table
try {
  const { data, error } = await supabase.from('current_thresholds').select('*');
  console.log('Current thresholds test:', { data, error });
} catch (err) {
  console.log('Current thresholds test failed:', err);
}