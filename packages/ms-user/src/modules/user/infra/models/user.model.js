import { EntitySchema } from "typeorm";

export class UserModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.email = undefined;
    /** @type {string | undefined} */
    this.emailHash = undefined;
    /** @type {string | undefined} */
    this.password = undefined;
    /** @type {string | undefined} */
    this.role = undefined;
    /** @type {Date | undefined} */
    this.createdAt = undefined;
    /** @type {Date | undefined} */
    this.updatedAt = undefined;
  }
}

export const TypeOrmUserModel = new EntitySchema({
  name: "UserModel",
  target: UserModel,
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    email: {
      type: "varchar",
    },
    emailHash: {
      type: "varchar",
      unique: true,
    },
    password: {
      type: "varchar",
    },
    role: {
      type: "varchar",
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true,
    },
  },
});
