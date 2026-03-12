import { EntitySchema } from "typeorm";

/**
 * @typedef {Object} UserEntity
 * @property {string} id
 * @property {string} email
 * @property {string} emailHash
 * @property {string} password
 * @property {string} role
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

export const UserEntity = new EntitySchema({
  name: "User",
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
