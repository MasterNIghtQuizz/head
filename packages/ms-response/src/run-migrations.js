import { initDatabase, db } from "./database.js";
import logger from "./logger.js";

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
        err: error,
        // @ts-ignore
        message: error.message,
        // @ts-ignore
        stack: error.stack,
      },
      "Migrations failed",
    );
    process.exit(1);
  }
};

run();
