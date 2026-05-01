import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TokenRotationService } from './services/token-rotation.service';
import { AuthEmailService } from './services/auth-email.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // LOW-2 (passe-2): pin HS256 explicitly. Without this, a malicious
        //   token signed with `alg: none` (or HS-with-public-key confusion)
        //   could be accepted by some upstream verifier. NestJS JwtService
        //   defaults to HS256 already; making it explicit is defense-in-depth.
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m'),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenBlacklistService, TokenRotationService, AuthEmailService],
  exports: [AuthService, JwtModule, TokenBlacklistService, TokenRotationService],
})
export class AuthModule {}
