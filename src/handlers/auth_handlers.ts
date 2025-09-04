import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { AuthService } from '../services/auth-service';
import { RedisService } from '../services/redis-service';
import { db } from '../db/db';
import { users, userProfiles, sessions, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const authService = AuthService.getInstance();
const redisService = RedisService.getInstance();

// Initialize Redis connection
redisService.connect().catch(console.error);

export function registerAuthHandlers() {
   console.log('(auth_handlers) > Registering authentication IPC handlers');

  // Login handler
  ipcMain.handle('auth:login', async (event, { email, password, rememberMe }) => {
    try {
       console.log('(auth_handlers) > Login attempt for:', email);
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return { 
          success: false, 
          error: 'Invalid email or password' 
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return { 
          success: false, 
          error: 'Invalid email or password' 
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return { 
          success: false, 
          error: 'Account is deactivated. Please contact support.' 
        };
      }

      // Generate tokens
      const tokens = await authService.generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role as 'user' | 'admin' | 'developer',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

      // Store refresh token in database if remember me is checked
      if (rememberMe) {
        await db.insert(refreshTokens).values({
          id: crypto.randomUUID(),
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      // Create session
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        sessionToken: crypto.randomBytes(32).toString('hex'),
        ipAddress: event.sender.getIPAddress?.() || 'unknown',
        userAgent: event.sender.getUserAgent?.() || 'unknown',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      });

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Store session in Redis
      await redisService.setSession(sessionId, {
        userId: user.id,
        email: user.email,
        role: user.role
      });

       console.log('(auth_handlers) > Login successful for:', email);
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            emailVerified: user.emailVerified
          },
          ...tokens,
          sessionId
        }
      };
    } catch (error) {
      console.error('(auth_handlers) > Login error:', error);
      return { 
        success: false, 
        error: 'An error occurred during login' 
      };
    }
  });

  // Signup handler
  ipcMain.handle('auth:signup', async (event, { username, email, password }) => {
    try {
       console.log('(auth_handlers) > Signup attempt for:', email);
      
      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return { 
          success: false, 
          error: 'An account with this email already exists' 
        };
      }

      // Check username availability
      const [existingUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername) {
        return { 
          success: false, 
          error: 'This username is already taken' 
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = crypto.randomUUID();
      const newUser = {
        id: userId,
        email,
        username,
        passwordHash,
        role: 'user' as const,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(users).values(newUser);

      // Create user profile
      await db.insert(userProfiles).values({
        id: crypto.randomUUID(),
        userId,
        preferences: JSON.stringify({
          theme: 'system',
          notifications: true
        })
      });

      // Generate tokens
      const tokens = await authService.generateTokens({
        id: userId,
        email,
        username,
        role: 'user',
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      });

      // Create session
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        userId,
        sessionToken: crypto.randomBytes(32).toString('hex'),
        ipAddress: event.sender.getIPAddress?.() || 'unknown',
        userAgent: event.sender.getUserAgent?.() || 'unknown',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      });

      // Store session in Redis
      await redisService.setSession(sessionId, {
        userId,
        email,
        role: 'user'
      });

       console.log('(auth_handlers) > Signup successful for:', email);
      
      return {
        success: true,
        data: {
          user: {
            id: userId,
            email,
            username,
            role: 'user',
            emailVerified: false
          },
          ...tokens,
          sessionId
        }
      };
    } catch (error) {
      console.error('(auth_handlers) > Signup error:', error);
      return { 
        success: false, 
        error: 'An error occurred during signup' 
      };
    }
  });

  // Logout handler
  ipcMain.handle('auth:logout', async (event, { sessionId, refreshToken }) => {
    try {
       console.log('(auth_handlers) > Logout request for session:', sessionId);
      
      // Delete session from database
      if (sessionId) {
        await db
          .delete(sessions)
          .where(eq(sessions.id, sessionId));
        
        // Delete from Redis
        await redisService.deleteSession(sessionId);
      }

      // Revoke refresh token
      if (refreshToken) {
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.token, refreshToken));
        
        // Blacklist the token
        await authService.blacklistToken(refreshToken);
      }

       console.log('(auth_handlers) > Logout successful');
      
      return { success: true };
    } catch (error) {
      console.error('(auth_handlers) > Logout error:', error);
      return { 
        success: false, 
        error: 'An error occurred during logout' 
      };
    }
  });

  // Verify token handler
  ipcMain.handle('auth:verify-token', async (event, { token }) => {
    try {
      const payload = await authService.verifyToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return { 
          success: false, 
          error: 'Token has been revoked' 
        };
      }

      return {
        success: true,
        data: payload
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Invalid token' 
      };
    }
  });

  // Refresh token handler
  ipcMain.handle('auth:refresh-token', async (event, { refreshToken }) => {
    try {
      const payload = await authService.verifyToken(refreshToken);
      
      // Check if token exists and is not revoked
      const [storedToken] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken))
        .limit(1);

      if (!storedToken || storedToken.revokedAt) {
        return { 
          success: false, 
          error: 'Invalid refresh token' 
        };
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      // Generate new tokens
      const tokens = await authService.generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role as 'user' | 'admin' | 'developer',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

      // Revoke old refresh token
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, storedToken.id));

      // Store new refresh token
      await db.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      console.error('(auth_handlers) > Token refresh error:', error);
      return { 
        success: false, 
        error: 'Failed to refresh token' 
      };
    }
  });

  // GitHub OAuth handler (placeholder)
  ipcMain.handle('auth:github-login', async (event) => {
    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = 'http://localhost:5173/auth/callback';
      
      if (!clientId) {
        return {
          success: false,
          error: 'GitHub OAuth is not configured'
        };
      }

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
      
      return {
        success: true,
        data: { authUrl }
      };
    } catch (error) {
      console.error('(auth_handlers) > GitHub OAuth error:', error);
      return {
        success: false,
        error: 'Failed to initialize GitHub login'
      };
    }
  });

   console.log('(auth_handlers) > Authentication IPC handlers registered successfully');
}
