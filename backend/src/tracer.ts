import { config } from 'dotenv';
config(); // Load .env before tracer init so DD_SERVICE, DD_ENV, DD_VERSION are available

import tracer from 'dd-trace';

// Initialize the tracer
tracer.init({
  // Service name, version, and env are automatically picked up from environment variables
  // DD_SERVICE, DD_VERSION, DD_ENV
  logInjection: true, // Enables automatic injection of trace IDs into logs
  profiling: true,    // Enables the profiler
  runtimeMetrics: true, // Enables runtime metrics
  // Explicitly point to the agent running in Docker
  // Since the backend is running on the host (npm run start:dev), it needs to talk to localhost:8126
  // If the backend was in Docker, it would need to talk to the agent container name
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: 8126
});

export default tracer;
