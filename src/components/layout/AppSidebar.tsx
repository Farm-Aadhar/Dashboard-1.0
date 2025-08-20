import { useState } from "react";
import { 
  BarChart3, 
  Brain, 
  CheckSquare, 
  FileBarChart, 
  Settings,
  Sprout,
  Home
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const menuItems = [
  { 
    title: 'dashboard', 
    url: '/', 
    icon: Home,
    description: 'Real-time sensor data and overview'
  },
  { 
    title: 'aiAnalysis', 
    url: '/ai', 
    icon: Brain,
    description: 'AI-powered plant analysis'
  },
  { 
    title: 'tasks', 
    url: '/tasks', 
    icon: CheckSquare,
    description: 'Farm tasks and planning'
  },
  { 
    title: 'reports', 
    url: '/reports', 
    icon: FileBarChart,
    description: 'Historical data and reports'
  },
  { 
    title: 'settings', 
    url: '/settings', 
    icon: Settings,
    description: 'Account and system settings'
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { t } = useLanguage();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-primary text-primary-foreground">
            <Sprout className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Farm Aadhar</h1>
              <p className="text-xs text-sidebar-foreground/70">Smart Polyhouse</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isItemActive = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isItemActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        )}
                        title={collapsed ? t(item.title) : item.description}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          isItemActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground"
                        )} />
                        {!collapsed && (
                          <span className="font-medium">{t(item.title)}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}