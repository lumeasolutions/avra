import { Module } from '@nestjs/common';
import { IntervenantsController } from './intervenants.controller';
import { IntervenantsService } from './intervenants.service';

@Module({
  controllers: [IntervenantsController],
  providers: [IntervenantsService],
  exports: [IntervenantsService],
})
export class IntervenantsModule {}
