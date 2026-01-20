import { Injectable } from '@nestjs/common';
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
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
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
