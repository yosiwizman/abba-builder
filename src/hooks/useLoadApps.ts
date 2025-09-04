import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { appBasePathAtom, appsListAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";

export function useLoadApps() {
  const [apps, setApps] = useAtom(appsListAtom);
  const [, setAppBasePath] = useAtom(appBasePathAtom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshApps = useCallback(async () => {
//     console.log('[useLoadApps] Starting to refresh apps...');
    setLoading(true);
    try {
      const ipcClient = IpcClient.getInstance();
//       console.log('[useLoadApps] Calling listApps...');
      const appListResponse = await ipcClient.listApps();
//       console.log('[useLoadApps] Got response:', appListResponse);
      setApps(appListResponse.apps);
      setAppBasePath(appListResponse.appBasePath);
      setError(null);
    } catch (error) {
      console.error("[useLoadApps] Error refreshing apps:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [setApps, setAppBasePath, setError, setLoading]);

  useEffect(() => {
    refreshApps();
  }, [refreshApps]);

  return { apps, loading, error, refreshApps };
}
