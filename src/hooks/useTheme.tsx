import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Fetch user's preferred theme from database
      const fetchTheme = async () => {
        const { data } = await supabase
          .from('user_profiles')
          .select('theme')
          .eq('user_id', user.id)
          .single();
        
        if (data?.theme) {
          setThemeState(data.theme as 'light' | 'dark');
        }
      };
      
      fetchTheme();
    }
  }, [user]);

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    
    if (user) {
      // Update user's preferred theme in database
      await supabase
        .from('user_profiles')
        .update({ theme: newTheme })
        .eq('user_id', user.id);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};