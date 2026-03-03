import { EntitySchema } from "typeorm";

export const ProcessedEventEntity = new EntitySchema({
  name: "ProcessedEvent",
  tableName: "processed_events",
  columns: {
    id: {
      type: "varchar",
      primary: true,
    },
    topic: {
      type: "varchar",
      nullable: false,
    },
    processedAt: {
      type: "timestamp",
      createDate: true,
    },
  },
});
