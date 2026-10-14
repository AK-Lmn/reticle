/**
 * Compare two of our own version strings. Numeric dotted compare, prerelease tags ignored: both
 * sides are Reticle package versions, so this never sees a range or build metadata. Undefined when
 * either side does not parse, so the caller can decline to guess a direction.
 */
export function compareVersions(a: string | undefined, b: string): number | undefined {
  const parts = (v: string): number[] | undefined => {
    const head = v.split('-')[0];
    if (head === undefined) return undefined;
    const nums = head.split('.').map((n) => parseInt(n, 10));
    return nums.some(isNaN) ? undefined : nums;
  };
  if (a === undefined) return undefined;
  const left = parts(a);
  const right = parts(b);
  if (left === undefined || right === undefined) return undefined;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (0 !== diff) return diff;
  }
  return 0;
}
