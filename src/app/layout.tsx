import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { DeepLinkProvider } from "../contexts/DeepLinkContext";
import { Toaster } from "sonner";
import { TitleBar } from "./TitleBar";
import { useEffect } from "react";
import { useRunApp } from "@/hooks/useRunApp";
import { useAtomValue } from "jotai";
import { previewModeAtom } from "@/atoms/appAtoms";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshAppIframe } = useRunApp();
  const previewMode = useAtomValue(previewModeAtom);
  // Global keyboard listener for refresh events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+R (Windows/Linux) or Cmd+R (macOS)
      if (event.key === "r" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); // Prevent default browser refresh
        if (previewMode === "preview") {
          refreshAppIframe(); // Use our custom refresh function instead
        }
      }
    };

    // Add event listener to document
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [refreshAppIframe, previewMode]);

  return (
    <>
      <ThemeProvider>
        <DeepLinkProvider>
          <div className="flex flex-col h-screen overflow-hidden">
            <TitleBar />
            <div className="flex flex-1 overflow-hidden">
              <SidebarProvider defaultOpen={true} open={true}>
                <AppSidebar />
                <main className="flex-1 overflow-auto bg-background flex flex-col relative">
                  {children}
                </main>
              </SidebarProvider>
            </div>
          </div>
          <Toaster richColors />
        </DeepLinkProvider>
      </ThemeProvider>
    </>
  );
}
