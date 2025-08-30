import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AppList } from "./AppList";
import { ChatList } from "./ChatList";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import {
  Home,
  MessageSquare,
  Settings,
  Library,
  Database,
  Menu,
} from "lucide-react";

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const currentPath = routerState.location.pathname;

  const navigationItems = [
    {
      icon: Home,
      label: "Apps",
      path: "/",
      isActive: currentPath === "/" || currentPath === "/app-details",
    },
    {
      icon: MessageSquare,
      label: "Chat",
      path: "/chat",
      isActive: currentPath === "/chat",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
      isActive: currentPath.startsWith("/settings"),
    },
    {
      icon: Library,
      label: "Library",
      path: "/library",
      isActive: currentPath === "/library",
    },
    {
      icon: Database,
      label: "Hub",
      path: "/hub",
      isActive: currentPath === "/hub",
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-2">
          <SidebarTrigger className="ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          {state === "expanded" && (
            <span className="text-lg font-semibold">Dyad</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate({ to: item.path as any })}
                    isActive={item.isActive}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Show AppList when on Apps section */}
        {(currentPath === "/" || currentPath === "/app-details") && (
          <AppList show={true} />
        )}

        {/* Show ChatList when on Chat section and an app is selected */}
        {currentPath === "/chat" && selectedAppId && <ChatList show={true} />}
      </SidebarContent>
    </Sidebar>
  );
}
