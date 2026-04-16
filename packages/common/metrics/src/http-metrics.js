import { Histogram, Counter, Gauge } from "prom-client";
import { registry } from "./registry.js";

/**
 * Histogram — HTTP request duration in seconds.
 * Labels: method, route, status_code, service
 */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code", "service"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/**
 * Counter — total number of completed HTTP requests.
 * Labels: method, route, status_code, service
 */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests completed",
  labelNames: ["method", "route", "status_code", "service"],
  registers: [registry],
});

/**
 * Gauge — number of in-flight HTTP requests right now.
 * Labels: service
 */
export const httpActiveRequests = new Gauge({
  name: "http_active_requests",
  help: "Number of HTTP requests currently being processed",
  labelNames: ["service"],
  registers: [registry],
});

/**
 * Gauge — 1 if the service is up, 0 if shutting down.
 * Labels: service
 */
export const serviceUp = new Gauge({
  name: "service_up",
  help: "Service availability: 1 = up, 0 = down",
  labelNames: ["service"],
  registers: [registry],
});

/**
 * Gauge — Unix timestamp (seconds) when the service process started.
 * Labels: service
 */
export const serviceStartTimestamp = new Gauge({
  name: "service_start_timestamp_seconds",
  help: "Unix timestamp when the service process started",
  labelNames: ["service"],
  registers: [registry],
});
