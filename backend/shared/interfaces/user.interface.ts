export interface IUser {
  id: string;
  oauthProvider: 'google' | 'kakao';
  oauthId: string;
  email?: string;
  nickname: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface IUserPublic {
  id: string;
  nickname: string;
  avatarUrl?: string;
}
