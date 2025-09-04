import { useState, useEffect, useCallback, useRef } from "react";
import { useAtom } from "jotai";
import { appBasePathAtom, appsListAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";

export function useLoadApps() {
  const [apps, setApps] = useAtom(appsListAtom);
  const [, setAppBasePath] = useAtom(appBasePathAtom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const timer = useRef<number | null>(null);

  const refreshApps = useCallback(async () => {
    if (inFlight.current) return; // Prevent concurrent calls
    inFlight.current = true;
    
    console.debug('[useLoadApps] Calling listApps...');
    setLoading(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const appListResponse = await ipcClient.listApps();
      
      if (!mounted.current) return; // Don't update if unmounted
      
      console.debug('[useLoadApps] Got response:', appListResponse);
      setApps(appListResponse.apps);
      setAppBasePath(appListResponse.appBasePath);
      setError(null);
    } catch (error) {
      if (!mounted.current) return;
      console.error("[useLoadApps] Error refreshing apps:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []); // Remove dependencies to prevent re-creation

  useEffect(() => {
    mounted.current = true;
    
    // Initial load
    refreshApps();
    
    // Optional: periodic refresh every 30s
    timer.current = window.setInterval(() => refreshApps(), 30_000);
    
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []); // Empty deps - only run once on mount

  return { apps, loading, error, refreshApps };
}
