import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

/**
 * Module du portail public e-facturation. PrismaModule est @Global, donc
 * PrismaService est injecté sans import explicite.
 */
@Module({
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
