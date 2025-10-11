import { createServer, Server } from "net";

/**
 * Check if a port is available
 * @param port - The port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server: Server = createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // For other errors, assume port is not available
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find an available port starting from the given port
 * @param startPort - The port to start checking from (default: 1234)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns Promise that resolves to an available port number
 * @throws Error if no available port is found within maxAttempts
 */
export async function findAvailablePort(
  startPort = 1234,
  maxAttempts = 100
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `Could not find an available port in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}
