import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth.service.js';
import { IUserRepository } from '../src/repositories/interfaces/user.repository.interface.js';
import { User, Prisma } from '@prisma/client';
import { verifyToken } from '../src/utils/jwt.js';

class MockUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  public async create(data: Prisma.UserCreateInput): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}-${Math.random()}`,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  public async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const u = this.users.get(id);
    if (!u) throw new Error('Not found');
    const updated = { ...u, ...data } as User;
    this.users.set(id, updated);
    return updated;
  }
}

describe('AuthService', () => {
  let userRepo: MockUserRepository;
  let authService: AuthService;

  beforeEach(() => {
    userRepo = new MockUserRepository();
    authService = new AuthService(userRepo);
  });

  it('should register a new user with normalized email and return a valid JWT token', async () => {
    const result = await authService.register({
      name: 'Alice Smith',
      email: ' Alice@Example.COM ',
      password: 'password123',
    });

    expect(result.user).toBeDefined();
    expect(result.user.name).toBe('Alice Smith');
    expect(result.user.email).toBe('alice@example.com');
    expect((result.user as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();

    // Verify token
    const decoded = verifyToken(result.token);
    expect(decoded.userId).toBe(result.user.id);
    expect(decoded.email).toBe('alice@example.com');
  });

  it('should reject registration if email already exists', async () => {
    await authService.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });

    await expect(
      authService.register({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'anotherpassword',
      })
    ).rejects.toThrow('An account with this email already exists');
  });

  it('should login an existing user with correct credentials', async () => {
    await authService.register({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'mypassword123',
    });

    const loginResult = await authService.login({
      email: 'bob@example.com',
      password: 'mypassword123',
    });

    expect(loginResult.user.name).toBe('Bob');
    expect(loginResult.token).toBeDefined();
  });

  it('should reject login with invalid password', async () => {
    await authService.register({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'mypassword123',
    });

    await expect(
      authService.login({
        email: 'bob@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('Invalid email or password');
  });
});
