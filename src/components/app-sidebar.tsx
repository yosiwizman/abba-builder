import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppList } from "./AppList";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between p-4">
          <SidebarTrigger />
          <span className="text-sm font-semibold text-sidebar-foreground">
            {state === "expanded" ? "Dyad" : ""}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppList show={true} />
      </SidebarContent>
    </Sidebar>
  );
}
