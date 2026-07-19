import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { HostMetrics } from "@opentelemetry/host-metrics";

// Reads the private IP destination passed down to systemd from our deployment scripts
const monitorIp = process.env.MONITORING_SERVER_PRIVATE_IP || "localhost";
const otlpGrpcUrl = `http://${monitorIp}:4317`;

const sdk = new NodeSDK({
  serviceName: "student-management-app",

  // Tracing routing target
  traceExporter: new OTLPTraceExporter({
    url: otlpGrpcUrl,
  }),

  // Metric packaging configuration reader
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: otlpGrpcUrl,
    }),
    exportIntervalMillis: 5000, // Syncs metrics down to the collector target every 5 seconds
  }),

  // Automatic node component hooks
  instrumentations: [
    getNodeAutoInstrumentations({
      // Hooks directly into Next.js native backend fetch and internal network activities
      "@opentelemetry/instrumentation-http": { enabled: true },
      // Deactivates high-volume file operations logging to prevent volume path saturation
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

// Fire up the collection agents
sdk.start();
console.log("🔭 OpenTelemetry Node SDK initialized successfully for Next.js");

const hostMetrics = new HostMetrics({
  name: "student-management-host-metrics",
});
hostMetrics.start();
console.log("📊 Virtual machine platform host metrics stream activated");

// Intercept system shutdown signals to close data streams smoothly
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OTel telemetry pipeline gracefully closed."))
    .catch((error) => console.error("Error closing OTel pipeline", error))
    .finally(() => process.exit(0));
});
