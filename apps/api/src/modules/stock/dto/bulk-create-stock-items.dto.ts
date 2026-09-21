import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateStockItemDto } from './create-stock-item.dto';

/** Import Excel / CSV du stock : lot de 1 à 100 articles. */
export class BulkCreateStockItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateStockItemDto)
  items: CreateStockItemDto[];
}
