declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface Profile {
    id: string;
    provider: string;
    displayName: string;
    _json: {
      id: number;
      kakao_account?: {
        email?: string;
        profile?: {
          nickname?: string;
          profile_image_url?: string;
          thumbnail_image_url?: string;
        };
      };
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
  }
}
