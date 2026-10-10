function parse(version) {
  const [core, pre] = version.split('+')[0].split(/-(.*)/s);
  return { nums: core.split('.').map(Number), pre: pre === undefined ? [] : pre.split('.') };
}

function compareIdent(a, b) {
  const na = /^\d+$/.test(a);
  const nb = /^\d+$/.test(b);
  if (na && nb) return Number(a) - Number(b);
  if (na) return -1;
  if (nb) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compare(a, b) {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i];
  if (!pa.pre.length || !pb.pre.length) return pb.pre.length - pa.pre.length;
  for (let i = 0; i < Math.min(pa.pre.length, pb.pre.length); i++) {
    const c = compareIdent(pa.pre[i], pb.pre[i]);
    if (c) return c;
  }
  return pa.pre.length - pb.pre.length;
}

export function sortVersions(list) {
  return [...list].sort(compare);
}
