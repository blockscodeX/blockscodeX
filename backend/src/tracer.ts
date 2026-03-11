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

  // Filter out noisy BullMQ polling commands (BZPOPMIN, EVALSHA) from traces
  // This helps reduce volume in serverless Redis environments
  resourceFilters: [
    /BZPOPMIN/i,
    /EVALSHA/i
  ],

  // Explicitly point to the agent running in Docker
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: 8126
});

export default tracer;
