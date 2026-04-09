import { initDatabase, db } from "./database.js";
import logger from "common-logger";

const run = async () => {
  try {
    await initDatabase();
    logger.info("Running migrations...");
    await db.runMigrations();
    logger.info("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error(
      {
        message: error.message,
        stack: error.stack,
        details: error,
      },
      "Migrations failed",
    );
    process.exit(1);
  }
};

run();
