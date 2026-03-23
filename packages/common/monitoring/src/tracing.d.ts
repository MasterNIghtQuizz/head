import { NodeSDK } from '@opentelemetry/sdk-node';

export interface TracingOptions {
  serviceName: string;
  enabled?: boolean;
  serviceVersion?: string;
  exporterUrl?: string;
  metricExportIntervalMs?: number;
}

export function initTracing(options: TracingOptions): NodeSDK | null;
