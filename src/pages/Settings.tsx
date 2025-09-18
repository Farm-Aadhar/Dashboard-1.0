import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { SimulatorControlPanel } from "@/components/dashboard/SimulatorControlPanel";
import { WeatherApiMonitor } from "@/components/dashboard/WeatherApiMonitor";
import { ThresholdSettings } from "@/components/settings/ThresholdSettings";
import GlobalThresholdManager from "@/components/settings/GlobalThresholdManager";
import { Settings as SettingsIcon, User, Palette, Globe, Bell, Shield, LogOut } from "lucide-react";

interface UserProfile {
  user_id: string;
  name?: string;
  email?: string;
  role: string;
  theme: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "farmer"
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: false
  });

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile | null;
    },
    enabled: !!user
  });

  // Fetch latest sensor data for calibration
  const { data: latestSensorData } = useQuery({
    queryKey: ['latest-sensor-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data[0] || null;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Update profile data when profile is loaded
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || "",
        email: profile.email || user?.email || "",
        role: profile.role || "farmer"
      });
    }
  }, [profile, user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: data.name,
            email: data.email,
            role: data.role,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);
        
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            name: data.name,
            email: data.email,
            role: data.role,
            theme: theme,
            preferred_language: language
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: t('Profile updated successfully') });
    },
    onError: (error) => {
      toast({
        title: t('Error updating profile'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update theme and language in profile
  const updatePreferencesMutation = useMutation({
    mutationFn: async ({ theme: newTheme, language: newLanguage }: { theme: string; language: string }) => {
      if (profile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            theme: newTheme,
            preferred_language: newLanguage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    updatePreferencesMutation.mutate({ theme: newTheme, language });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'hi');
    updatePreferencesMutation.mutate({ theme, language: newLanguage });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: t('Signed out successfully') });
    } catch (error) {
      toast({
        title: t('Error signing out'),
        description: 'Please try again',
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('Settings')}</h1>
      </div>

      {/* Consolidated User Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('User Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Information Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">{t('Full Name')}</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder={t('Enter your full name')}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">{t('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder={t('Enter your email')}
                  className="h-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs">{t('Role')}</Label>
              <Select value={profileData.role} onValueChange={(value) => setProfileData({ ...profileData, role: value })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farmer">{t('Farmer')}</SelectItem>
                  <SelectItem value="manager">{t('Farm Manager')}</SelectItem>
                  <SelectItem value="technician">{t('Technician')}</SelectItem>
                  <SelectItem value="admin">{t('Administrator')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Appearance & Language Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance & Language
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{t('Dark Mode')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('Toggle between themes')}
                  </p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={handleThemeToggle} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('Language')}</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{t('Email Alerts')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('Receive alerts via email')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailAlerts: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{t('Push Notifications')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('Receive push notifications in browser')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{t('Weekly Reports')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('Receive weekly summary reports')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyReports}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="w-full">
            {updateProfileMutation.isPending ? t('Saving...') : t('Save All Settings')}
          </Button>
        </CardContent>
      </Card>

      {/* Global Threshold Management */}
      <GlobalThresholdManager latestSensorData={latestSensorData} />

      {/* Legacy Threshold Settings (for backwards compatibility) */}
      <ThresholdSettings />

      {/* Development Tools - Only in Development Mode */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sensor Simulator Controls */}
            <SimulatorControlPanel />
            
            {/* Weather API Usage Monitor */}
            <WeatherApiMonitor />
          </div>
        </>
      )}

      {/* Compact Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('Account')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">{t('Account Status')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Your account is active and verified')}
              </p>
            </div>
            <div className="text-sm text-green-600 font-medium">
              {t('Active')}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-red-600 text-sm">{t('Sign Out')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Sign out of your account')}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50 h-8">
              <LogOut className="h-3 w-3 mr-2" />
              {t('Sign Out')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}