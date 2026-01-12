import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('supabase.jwtSecret');
    if (!jwtSecret) {
      // Without this, passport-jwt will validate using an empty secret and you'll only see 401s.
      throw new Error(
        'Missing JWT secret. Set JWT_SECRET in backend/.env to your Supabase project JWT secret (Settings → API → JWT Settings).',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // The payload comes from Supabase JWT
    const user = await this.authService.getUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      userId: user.id,
      email: payload.email,
      role: user.role,
      full_name: user.full_name,
      access_granted: user.access_granted,
    };
  }
}

