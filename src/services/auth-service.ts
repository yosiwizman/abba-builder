import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'developer';
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private static instance: AuthService;
  private readonly JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-change-in-production'
  );
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  async generateTokens(user: User): Promise<AuthTokens> {
    const accessToken = await new SignJWT({ 
      sub: user.id,
      email: user.email,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(this.JWT_SECRET);
    
    const refreshToken = await new SignJWT({ 
      sub: user.id 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.JWT_SECRET);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 7200 // 2 hours in seconds
    };
  }
  
  async verifyToken(token: string): Promise<any> {
    try {
      const { payload } = await jwtVerify(token, this.JWT_SECRET);
      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  async login(email: string, password: string): Promise<AuthTokens> {
    // TODO: Implement database lookup
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    return this.generateTokens(user);
  }
  
  async signup(email: string, username: string, password: string): Promise<AuthTokens> {
    // Check if user exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Create new user
    const passwordHash = await this.hashPassword(password);
    const user = await this.createUser({
      email,
      username,
      passwordHash,
      role: 'user'
    });
    
    return this.generateTokens(user);
  }
  
  async logout(refreshToken: string): Promise<void> {
    // TODO: Invalidate refresh token in database/Redis
    await this.invalidateToken(refreshToken);
  }
  
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyToken(refreshToken);
    const user = await this.getUserById(payload.sub);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return this.generateTokens(user);
  }
  
  // Database methods (to be implemented with your ORM)
  private async getUserByEmail(email: string): Promise<any> {
    // TODO: Implement database query
    throw new Error('Not implemented');
  }
  
  private async getUserById(id: string): Promise<User | null> {
    // TODO: Implement database query
    throw new Error('Not implemented');
  }
  
  private async createUser(userData: any): Promise<User> {
    // TODO: Implement database insert
    throw new Error('Not implemented');
  }
  
  private async invalidateToken(token: string): Promise<void> {
    // TODO: Add token to blacklist in Redis
    throw new Error('Not implemented');
  }
}
