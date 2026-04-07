import { IsDateString, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { EventCalendarType, EventType } from '../../../prisma-enums';

export class CreateEventDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsEnum(EventCalendarType)
  calendarType: EventCalendarType;

  @IsEnum(EventType)
  type: EventType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;
}
