import { ipcMain } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from '../../db';
import { apps } from '../../db/schema';
import LC3 from '../../services/langchain-orchestrator.js';
const LangChainOrchestrator = (LC3 as any).LangChainOrchestrator || (LC3 as any).default?.LangChainOrchestrator;

const execAsync = promisify(exec);

export function registerBackupHandlers() {
  // Hourly automatic backups
  setInterval(async () => {
    try {
      const projects = await getAllProjects();
      for (const project of projects) {
        await createBackup(project.id);
      }
    } catch (e) {
      // best effort
    }
  }, 3600000);

  ipcMain.handle('backup:create', async (_event, projectId: number) => {
    const backup = await createProjectBackup(projectId);
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    const storage = await orchestrator.selectBackupStorage();
    return await uploadToStorage(backup, storage);
  });

  ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
    return await restoreFromBackup(backupPath);
  });

  ipcMain.handle('backup:export-zip', async (_event, projectId: number) => {
    const zipPath = await createProjectZip(projectId);
    return { path: zipPath };
  });
}

async function getAllProjects() {
  const list = await db.query.apps.findMany();
  return list.map((a) => ({ id: a.id, path: a.path, name: a.name }));
}

async function createBackup(projectId: number) {
  const backupDir = path.join(process.cwd(), 'backups');
  await fs.ensureDir(backupDir);
  const { appPath, name } = await getProjectPath(projectId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupDir, `${name}-${timestamp}`);
  await fs.copy(appPath, dest, { filter: (src) => !src.includes(path.sep + 'node_modules' + path.sep) });
  return dest;
}

async function createProjectBackup(projectId: number) {
  return await createBackup(projectId);
}

async function uploadToStorage(localPath: string, storage: string) {
  // For now, return local path; real providers can be added later
  return { storage, path: localPath };
}

async function restoreFromBackup(backupPath: string) {
  // No-op placeholder: Caller can select target project folder to restore into
  return { ok: true, path: backupPath };
}

async function createProjectZip(projectId: number) {
  const { appPath, name } = await getProjectPath(projectId);
  const backupDir = path.join(process.cwd(), 'backups');
  await fs.ensureDir(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const zipPath = path.join(backupDir, `${name}-${timestamp}.zip`);

  // Use Windows PowerShell Compress-Archive if available
  const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${appPath}' -DestinationPath '${zipPath}' -Force"`;
  try {
    await execAsync(cmd);
  } catch (e) {
    // Fallback: simple copy dir if compress not available
    await fs.copy(appPath, zipPath + '.folder');
  }
  return zipPath;
}

async function getProjectPath(projectId: number) {
  const app = await db.query.apps.findFirst({ where: (apps.id as any).eq(projectId) });
  if (!app) throw new Error('Project not found');
  const appPath = path.isAbsolute(app.path) ? app.path : path.join(process.cwd(), app.path);
  return { appPath, name: app.name };
}

