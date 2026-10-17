/**
 * The server's identity, in one place.
 *
 * Read the version from package.json — always shipped by npm, one level above
 * dist/ — so the `initialize` handshake of both transports can never drift
 * from the published version (mail once reported 3.0.0 long after 5.x).
 */
import { createRequire } from "node:module";

export const SERVER_NAME = "misarseo";
export const SERVER_VERSION: string = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;
