import path from 'node:path';
import os from 'node:os';
import { IS_TEST_BUILD } from '../ipc/utils/test_utils';
import { getElectron } from '../paths/paths';

/**
 * Gets the base path for Dyad apps, resolving environment variables
 * @returns The fully resolved absolute path to the apps directory
 */
export function getAppBasePath(): string {
  // Check for environment variable
  const envPath = process.env.APP_BASE_PATH;
  
  if (envPath && envPath.trim()) {
    // Return the environment path if it's set and not empty
    return path.resolve(envPath.trim());
  }
  
  // Use test build path if in test mode
  if (IS_TEST_BUILD) {
    const electron = getElectron();
    if (electron) {
      return path.join(electron.app.getPath('userData'), 'dyad-apps');
    }
  }
  
  // Default to home directory
  return path.join(os.homedir(), 'dyad-apps');
}
