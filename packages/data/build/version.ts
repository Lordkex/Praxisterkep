export function versionFor(month: string, patch: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Bad month "${month}", expected YYYY-MM`);
  const mm = Number(m[2]);
  if (mm < 1 || mm > 12) throw new Error(`Bad month "${month}": month out of range`);
  if (!Number.isInteger(patch) || patch < 0) throw new Error(`Bad patch ${patch}`);
  return `${m[1]}.${mm}.${patch}`;
}
