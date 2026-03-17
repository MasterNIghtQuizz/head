import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";

/**
 * @typedef {Object} TracingOptions
 * @property {string} serviceName
 * @property {boolean} [enabled=true]
 * @property {string} [serviceVersion]
 * @property {string} [exporterUrl]
 * @property {number} [metricExportIntervalMs]
 */

/**
 * @param {TracingOptions} options
 * @returns {NodeSDK | null}
 */
export function initTracing(options) {
  if (options.enabled === false) {
    return null;
  }
  console.log(`[OTel] Initializing tracing for ${options.serviceName}...`);

  const exporterUrl =
    options.exporterUrl ??
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ??
    "http://localhost:4317";

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
    [ATTR_SERVICE_VERSION]: options.serviceVersion ?? "0.0.1",
  });

  const traceExporter = new OTLPTraceExporter({ url: exporterUrl });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: exporterUrl }),
    exportIntervalMillis: options.metricExportIntervalMs ?? 15_000,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .catch((err) => {
        console.error("OTel SDK shutdown error", err);
      })
      .finally(() => process.exit(0));
  });

  return sdk;
}
