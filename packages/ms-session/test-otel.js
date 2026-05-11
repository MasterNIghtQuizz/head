import { initTracing } from "common-monitoring";
initTracing({ serviceName: "test-otel", enabled: true });
console.log("OTel initialized");
process.exit(0);
