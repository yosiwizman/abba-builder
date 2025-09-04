/**
 * IPC Handlers Test Suite
 * Testing critical IPC communication paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  app: {
    getPath: vi.fn(() => '/test/path'),
    getName: vi.fn(() => 'test-app'),
    getVersion: vi.fn(() => '1.0.0'),
    isPackaged: false,
  },
  dialog: {
    showErrorBox: vi.fn(),
  },
}));

// Mock database
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

// Mock logger
vi.mock('electron-log', () => ({
  default: {
    scope: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

describe('IPC Handlers', () => {
  let mockEvent: Partial<IpcMainInvokeEvent>;

  beforeEach(() => {
    mockEvent = {
      sender: {
        send: vi.fn(),
      } as any,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('App Handlers', () => {
    it('should list apps successfully', async () => {
      const mockApps = [
        { id: 1, name: 'App1', path: '/path/to/app1' },
        { id: 2, name: 'App2', path: '/path/to/app2' },
      ];

      // Mock the database response
      const { db } = await import('../db');
      vi.mocked(db.select).mockResolvedValueOnce(mockApps);

      // Import and test handler
      const handlers = await import('../ipc/handlers/app_handlers');
      const listAppsHandler = handlers.listApps;

      const result = await listAppsHandler(mockEvent as IpcMainInvokeEvent);
      expect(result).toEqual(mockApps);
    });

    it('should handle app creation with validation', async () => {
      const newApp = {
        name: 'TestApp',
        path: '/test/path',
      };

      const { db } = await import('../db');
      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockReturnThis();
      vi.mocked(db.returning).mockResolvedValueOnce([{ id: 1, ...newApp }]);

      const handlers = await import('../ipc/handlers/app_handlers');
      const createAppHandler = handlers.createApp;

      const result = await createAppHandler(
        mockEvent as IpcMainInvokeEvent,
        newApp
      );

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(newApp.name);
    });

    it('should validate app name uniqueness', async () => {
      const duplicateApp = {
        name: 'ExistingApp',
        path: '/test/path',
      };

      const { db } = await import('../db');
      vi.mocked(db.select).mockResolvedValueOnce([{ id: 1, name: 'ExistingApp' }]);

      const handlers = await import('../ipc/handlers/app_handlers');
      const validateAppName = handlers.checkAppNameAvailability;

      const result = await validateAppName(
        mockEvent as IpcMainInvokeEvent,
        duplicateApp.name
      );

      expect(result).toBe(false);
    });
  });

  describe('Chat Handlers', () => {
    it('should handle chat message streaming', async () => {
      const mockMessage = {
        chatId: 1,
        content: 'Test message',
        role: 'user' as const,
      };

      const handlers = await import('../ipc/handlers/chat_handlers');
      const sendMessageHandler = handlers.sendChatMessage;

      // Mock the AI response
      vi.mock('../services/ai-service', () => ({
        streamChatResponse: vi.fn().mockResolvedValueOnce({
          content: 'AI response',
          role: 'assistant',
        }),
      }));

      await sendMessageHandler(mockEvent as IpcMainInvokeEvent, mockMessage);

      expect(mockEvent.sender?.send).toHaveBeenCalledWith(
        'chat:stream',
        expect.objectContaining({
          chatId: mockMessage.chatId,
        })
      );
    });

    it('should handle chat cancellation', async () => {
      const chatId = 1;

      const handlers = await import('../ipc/handlers/chat_handlers');
      const cancelChatHandler = handlers.cancelChat;

      const result = await cancelChatHandler(
        mockEvent as IpcMainInvokeEvent,
        chatId
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('Security Handlers', () => {
    it('should validate IPC channel whitelist', async () => {
      const invalidChannel = 'unauthorized:channel';

      const security = await import('../ipc/security/channel-validator');
      const isValid = security.isValidChannel(invalidChannel);

      expect(isValid).toBe(false);
    });

    it('should sanitize file paths', async () => {
      const maliciousPath = '../../../etc/passwd';

      const security = await import('../ipc/security/path-validator');
      const sanitized = security.sanitizePath(maliciousPath);

      expect(sanitized).not.toContain('..');
    });

    it('should validate external URLs', async () => {
      const maliciousUrl = 'javascript:alert(1)';

      const security = await import('../ipc/security/url-validator');
      const isValid = security.isValidExternalUrl(maliciousUrl);

      expect(isValid).toBe(false);
    });
  });

  describe('GitHub Handlers', () => {
    it('should require GitHub client ID from environment', async () => {
      delete process.env.GITHUB_CLIENT_ID;

      const handlers = await import('../ipc/handlers/github_handlers');
      const startFlow = handlers.startGitHubFlow;

      await expect(
        startFlow(mockEvent as IpcMainInvokeEvent)
      ).rejects.toThrow('GitHub client ID not configured');
    });

    it('should handle GitHub authentication flow', async () => {
      process.env.GITHUB_CLIENT_ID = 'test-client-id';

      vi.mock('node-fetch', () => ({
        default: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            device_code: 'test-device-code',
            user_code: 'TEST-CODE',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
          }),
        }),
      }));

      const handlers = await import('../ipc/handlers/github_handlers');
      const startFlow = handlers.startGitHubFlow;

      const result = await startFlow(mockEvent as IpcMainInvokeEvent);

      expect(result).toHaveProperty('userCode');
      expect(result).toHaveProperty('verificationUri');
    });
  });

  describe('File System Handlers', () => {
    it('should restrict file access to app directory', async () => {
      const restrictedPath = '/etc/passwd';

      const handlers = await import('../ipc/handlers/file_handlers');
      const readFile = handlers.readAppFile;

      await expect(
        readFile(mockEvent as IpcMainInvokeEvent, 1, restrictedPath)
      ).rejects.toThrow('Access denied');
    });

    it('should handle file editing with validation', async () => {
      const fileEdit = {
        appId: 1,
        path: 'src/index.ts',
        content: 'console.log("test");',
      };

      vi.mock('fs', () => ({
        promises: {
          writeFile: vi.fn().mockResolvedValueOnce(undefined),
          readFile: vi.fn().mockResolvedValueOnce('old content'),
        },
      }));

      const handlers = await import('../ipc/handlers/file_handlers');
      const editFile = handlers.editAppFile;

      const result = await editFile(
        mockEvent as IpcMainInvokeEvent,
        fileEdit.appId,
        fileEdit.path,
        fileEdit.content
      );

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Database Handlers', () => {
    it('should handle database transactions', async () => {
      const { db } = await import('../db');
      const transaction = vi.fn();
      db.transaction = transaction;

      const handlers = await import('../ipc/handlers/database_handlers');
      const performTransaction = handlers.performDatabaseTransaction;

      await performTransaction(mockEvent as IpcMainInvokeEvent, async () => {
        // Transaction logic
      });

      expect(transaction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../db');
      vi.mocked(db.select).mockRejectedValueOnce(new Error('Database error'));

      const handlers = await import('../ipc/handlers/app_handlers');
      const listApps = handlers.listApps;

      await expect(
        listApps(mockEvent as IpcMainInvokeEvent)
      ).rejects.toThrow('Database error');
    });
  });

  describe('Process Management', () => {
    it('should manage child processes safely', async () => {
      const handlers = await import('../ipc/handlers/process_handlers');
      const startProcess = handlers.startAppProcess;

      const result = await startProcess(mockEvent as IpcMainInvokeEvent, {
        appId: 1,
        command: 'npm',
        args: ['start'],
      });

      expect(result).toHaveProperty('pid');
    });

    it('should prevent command injection', async () => {
      const maliciousCommand = 'rm -rf / && echo';

      const handlers = await import('../ipc/handlers/process_handlers');
      const startProcess = handlers.startAppProcess;

      await expect(
        startProcess(mockEvent as IpcMainInvokeEvent, {
          appId: 1,
          command: maliciousCommand,
          args: [],
        })
      ).rejects.toThrow('Invalid command');
    });
  });
});

describe('IPC Channel Security', () => {
  it('should only allow whitelisted channels', () => {
    const validChannels = [
      'get-app',
      'create-app',
      'chat:message',
      'github:start-flow',
    ];

    const invalidChannels = [
      'eval:code',
      'system:execute',
      'fs:delete',
      'process:exit',
    ];

    const security = require('../ipc/security/channel-validator');

    validChannels.forEach(channel => {
      expect(security.isValidChannel(channel)).toBe(true);
    });

    invalidChannels.forEach(channel => {
      expect(security.isValidChannel(channel)).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  it('should handle and log errors appropriately', async () => {
    const mockError = new Error('Test error');
    const logger = await import('electron-log');
    const logSpy = vi.spyOn(logger.default.scope('test'), 'error');

    const handlers = await import('../ipc/handlers/error_handler');
    handlers.handleError(mockError, 'test-context');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test error'),
      expect.objectContaining({
        context: 'test-context',
      })
    );
  });

  it('should sanitize error messages for user display', async () => {
    const sensitiveError = new Error('Database connection failed: password=secret123');

    const handlers = await import('../ipc/handlers/error_handler');
    const sanitized = handlers.sanitizeErrorForUser(sensitiveError);

    expect(sanitized).not.toContain('secret123');
    expect(sanitized).toContain('Database operation failed');
  });
});
