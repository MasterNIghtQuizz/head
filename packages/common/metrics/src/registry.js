import { Registry, collectDefaultMetrics } from "prom-client";

/**
 * Singleton Prometheus registry shared across the entire process.
 * Default Node.js runtime metrics are collected automatically with the "nodejs_" prefix.
 */
const registry = new Registry();

collectDefaultMetrics({ register: registry });

export { registry };
