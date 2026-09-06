import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectLifecycleStatus, ProjectPriority, PipelineStatus } from '../../../prisma-enums';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(ProjectLifecycleStatus)
  lifecycleStatus?: ProjectLifecycleStatus;

  @IsOptional()
  @IsEnum(PipelineStatus)
  pipelineStatus?: PipelineStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  /** Raison de la perte, saisie librement au moment de marquer le dossier perdu. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}
