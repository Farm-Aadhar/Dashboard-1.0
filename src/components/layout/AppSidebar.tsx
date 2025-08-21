import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Brain, 
  CheckSquare, 
  FileBarChart, 
  Settings,
  Sprout,
  Home
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  // Find current active menu item index
  const currentActiveIndex = menuItems.findIndex(item => isActive(item.url));

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Ctrl + Up/Down arrows
      if (!event.ctrlKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const currentIndex = focusedIndex >= 0 ? focusedIndex : currentActiveIndex;
      let newIndex = currentIndex;

      if (event.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
      } else if (event.key === 'ArrowDown') {
        newIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
      }

      setFocusedIndex(newIndex);
      
      // Navigate to the selected menu item
      if (newIndex >= 0 && newIndex < menuItems.length) {
        navigate(menuItems[newIndex].url);
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex, currentActiveIndex, navigate]);

  // Reset focused index when route changes from other navigation
  useEffect(() => {
    setFocusedIndex(-1);
  }, [currentPath]);

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
            <div className="flex-1">
              <h1 className="text-lg font-bold text-sidebar-foreground">Farm Aadhar</h1>
              <p className="text-xs text-sidebar-foreground/70">Smart Polyhouse</p>
              <p className="text-xs text-sidebar-foreground/50 mt-1">
                <kbd className="px-1 py-0.5 text-xs bg-sidebar-accent rounded">Ctrl</kbd> + 
                <kbd className="px-1 py-0.5 text-xs bg-sidebar-accent rounded ml-1">↑↓</kbd> to navigate
              </p>
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
              {menuItems.map((item, index) => {
                const isItemActive = isActive(item.url);
                const isFocused = focusedIndex === index;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isItemActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md",
                          isFocused && !isItemActive && "ring-2 ring-sidebar-ring bg-sidebar-accent/50"
                        )}
                        title={collapsed ? t(item.title) : item.description}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(-1)}
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