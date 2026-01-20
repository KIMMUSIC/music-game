import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('auth');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('OAuth Flow', () => {
    it('GET /auth/google should redirect to Google OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('GET /auth/kakao should redirect to Kakao OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/kakao')
        .expect(302);

      expect(response.headers.location).toContain('kauth.kakao.com');
    });
  });

  describe('User Profile', () => {
    it('GET /auth/me should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('PUT /auth/me/nickname should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .put('/auth/me/nickname')
        .send({ nickname: 'newnickname' })
        .expect(401);
    });
  });

  describe('Logout', () => {
    it('POST /auth/logout should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Internal Endpoints', () => {
    it('POST /auth/internal/validate-token should return 401 without internal key', async () => {
      await request(app.getHttpServer())
        .post('/auth/internal/validate-token')
        .send({ token: 'some-token' })
        .expect(401);
    });
  });
});
