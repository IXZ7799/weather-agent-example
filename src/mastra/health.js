
/**
 * Health check endpoint for Mastra platform
 * This file provides a simple health check endpoint that the Mastra platform can use
 * to verify that the application is running correctly
 */

/**
 * Simple health check function that returns a 200 OK response
 * @returns A simple health status object
 */
export async function healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'InfoSec AI Buddy',
    version: '1.0.0'
  };
}

// Export the health check function for Mastra platform
export default healthCheck;
