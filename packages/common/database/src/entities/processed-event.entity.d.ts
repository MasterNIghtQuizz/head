import { EntitySchema } from "typeorm";

export const ProcessedEventEntity: EntitySchema<{
  id: string;
  topic: string;
  processedAt: Date;
}>;
