export interface IJwtPayload {
  sub: string; // userId
  nickname: string;
  iat?: number;
  exp?: number;
}
