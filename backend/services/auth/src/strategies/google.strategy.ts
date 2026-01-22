import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface OAuthProfile {
  provider: 'google' | 'kakao';
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID', '');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET', '');
    const callbackURL = configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3001/auth/google/callback',
    );

    const isConfigured = Boolean(
      clientID && clientSecret && !clientID.startsWith('your-'),
    );

    super({
      clientID: isConfigured ? clientID : 'placeholder-client-id',
      clientSecret: isConfigured ? clientSecret : 'placeholder-client-secret',
      callbackURL: callbackURL,
      scope: ['email', 'profile'],
    });

    if (!isConfigured) {
      this.logger.warn(
        'Google OAuth is not configured. Google login will be disabled.',
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const oauthProfile: OAuthProfile = {
      provider: 'google',
      id: profile.id,
      email: profile.emails?.[0]?.value || null,
      displayName: profile.displayName || 'User',
      avatarUrl: profile.photos?.[0]?.value || null,
    };

    done(null, oauthProfile);
  }
}
