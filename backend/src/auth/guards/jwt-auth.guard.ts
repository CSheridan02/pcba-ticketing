import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const header: unknown = req.headers?.authorization ?? req.headers?.Authorization;
    const authHeader = typeof header === 'string' ? header : '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization Bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Authorization Bearer token');
    }

    // Validate via Supabase (avoids relying on local JWT secret config and handles key rotation).
    const user = await this.authService.validateUser(token);
    req.user = user;
    return true;
  }
}

