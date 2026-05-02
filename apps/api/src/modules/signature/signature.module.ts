import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { YouSignService } from './yousign.service';

@Module({
  imports: [ConfigModule],
  controllers: [SignatureController],
  providers: [SignatureService, YouSignService],
})
export class SignatureModule {}
