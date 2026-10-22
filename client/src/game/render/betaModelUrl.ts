/**
 * The deployed backend's public storage proxy. Capacitor uses capacitor://localhost
 * for the bundled shell, where /manus-storage is intentionally unavailable.
 * This is a public, unsigned proxy URL; no credentials or signed URL material is
 * embedded in the native bundle.
 */
export const BETA_MODEL_PUBLIC_ORIGIN = "https://polyclone-n6b64njm.manus.space";

const CANONICAL_MODEL_PATH = /^\/manus-storage\/[A-Za-z0-9][A-Za-z0-9._-]*\.glb$/;

/**
 * Resolves a canonical registry model path for the current host.
 *
 * Browser builds retain the relative storage path. Native builds must use the
 * explicit public proxy because a Capacitor app is served from
 * capacitor://localhost, not the backend, and therefore has no local
 * /manus-storage route. The origin is deliberately allow-listed so a caller
 * cannot turn a model path into an arbitrary-host request.
 */
export function resolveBetaModelUrl(
  path: string,
  native: boolean,
  publicOrigin = BETA_MODEL_PUBLIC_ORIGIN,
): string {
  if (!CANONICAL_MODEL_PATH.test(path)) {
    throw new Error(`Beta model URL must be a canonical /manus-storage/*.glb path: ${path}`);
  }
  if (!native) return path;

  let origin: string;
  try {
    origin = new URL(publicOrigin).origin;
  } catch {
    throw new Error("Beta model public origin must be a valid HTTPS origin.");
  }
  if (origin !== BETA_MODEL_PUBLIC_ORIGIN) {
    throw new Error("Beta model public origin is not allow-listed.");
  }

  return `${origin}${path}`;
}
