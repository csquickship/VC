import { IUserRepository } from '../repositories/interfaces/user.repository.interface.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, JwtPayload } from '../utils/jwt.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  public async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error('An account with this email already exists');
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    const passwordHash = await hashPassword(input.password);

    const user = await this.userRepository.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const tokenPayload: JwtPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
    };

    const token = signToken(tokenPayload);

    return {
      user: safeUser,
      token,
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, input.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const tokenPayload: JwtPayload = {
      userId: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
    };

    const token = signToken(tokenPayload);

    return {
      user: safeUser,
      token,
    };
  }

  public async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
