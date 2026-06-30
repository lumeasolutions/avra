import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import { PublicService } from './public.service';

/**
 * Portail public e-facturation : /api/v1/public/document/:token
 * Accès SANS authentification (le token sert de clé). Le client final consulte
 * son devis/facture et peut accepter/refuser un devis.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('document/:token')
  getDocument(@Param('token') token: string) {
    return this.publicService.getByToken(token);
  }

  @Public()
  @SkipCsrf()
  @Post('document/:token/respond')
  respond(
    @Param('token') token: string,
    @Body() body: { action: 'accept' | 'refuse'; signerName?: string },
  ) {
    return this.publicService.respond(token, body);
  }
}
