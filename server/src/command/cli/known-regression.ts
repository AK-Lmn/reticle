/**
 * The flows the linked project's platform says passed before and are broken now — what
 * `reticle runs regression` prints, read here so `reticle gate` can fail on it too.
 *
 * Its own module, not a call into `cloud-cli.ts`: the gate is on the library's import path, and the
 * cloud CLI reaches the install-time surface the library must never load.
 */
import { homedir } from 'node:os';
import { z } from 'zod';
import { resolveProjectCloud } from '@/memory/cloud/cloud-config.js';
import { createNodeFileSystem } from '@/memory/project/fs/fs-port.js';
import { api } from './cloud-kit.js';

const REGRESSION_PATH = '/v1/project/regression';

/** The `broken` list of a regression report, or undefined when the report has none. */
export function brokenOf(report: unknown): unknown[] | undefined {
  const parsed = z.object({ broken: z.array(z.unknown()) }).safeParse(report);
  return parsed.success ? parsed.data.broken : undefined;
}

/** Undefined when `reticleRoot` is not linked or the platform did not answer: best-effort, never a failure. */
export async function knownRegression(reticleRoot: string): Promise<unknown[] | undefined> {
  try {
    const cloud = await resolveProjectCloud(
      createNodeFileSystem(),
      reticleRoot,
      homedir(),
      process.env,
    );
    if (null === cloud.config) return undefined;
    return brokenOf(await api('GET', `${cloud.config.url}${REGRESSION_PATH}`, cloud.config.apiKey));
  } catch {
    return undefined;
  }
}
