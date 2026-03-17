import { NodeSDK } from '@opentelemetry/sdk-node';

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  exporterUrl?: string;
  metricExportIntervalMs?: number;
}

export function initTracing(options: TracingOptions): NodeSDK;
