import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { OAuthProfile } from './google.strategy';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  private readonly logger = new Logger(KakaoStrategy.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID', '');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET', '');
    const callbackURL = configService.get<string>('KAKAO_CALLBACK_URL', '');

    // Use placeholder if not configured to prevent startup crash
    const isConfigured = Boolean(clientID && !clientID.startsWith('your-'));

    super({
      clientID: isConfigured ? clientID : 'placeholder-client-id',
      clientSecret: isConfigured ? clientSecret : 'placeholder-secret',
      callbackURL: isConfigured ? callbackURL : 'http://localhost:3001/auth/kakao/callback',
    });

    this.isConfigured = isConfigured;

    if (!isConfigured) {
      this.logger.warn('Kakao OAuth is not configured. Kakao login will be disabled.');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: OAuthProfile) => void,
  ): Promise<void> {
    const kakaoAccount = profile._json?.kakao_account;

    const oauthProfile: OAuthProfile = {
      provider: 'kakao',
      id: profile.id.toString(),
      email: kakaoAccount?.email || null,
      displayName: profile.displayName || kakaoAccount?.profile?.nickname || 'User',
      avatarUrl: kakaoAccount?.profile?.profile_image_url || null,
    };

    done(null, oauthProfile);
  }
}
