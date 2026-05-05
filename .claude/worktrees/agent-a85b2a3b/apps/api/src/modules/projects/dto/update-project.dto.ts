import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional } from 'class-validator';
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
}
