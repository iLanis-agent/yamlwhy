// prints JSON array of [type,value] for each input scalar, for a given library and version
const lib = process.argv[2], mode = process.argv[3];
const cases = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const NM = process.env.YAML_LIBS || require('path').join(__dirname, 'node_modules');
const out = cases.map(s => {
  try {
    let v;
    if (lib === 'yaml') { const Y = require(NM + '/yaml'); v = Y.parse('k: ' + s, mode === '1.1' ? { version: '1.1' } : { schema: 'core' }).k; }
    else { const J = require(NM + '/js-yaml'); v = J.load('k: ' + s, { schema: J.CORE_SCHEMA }).k; }
    if (v === null || v === undefined) return ['null', 'null'];
    if (typeof v === 'boolean') return ['bool', String(v)];
    if (typeof v === 'number') return ['num', isNaN(v) ? 'nan' : (v === Infinity ? 'inf' : v === -Infinity ? '-inf' : (Object.is(v, -0) ? '-0' : String(v)))];
    if (v instanceof Date) return ['timestamp', v.toISOString()];
    if (typeof v === 'string') return ['str', v];
    return ['other', JSON.stringify(v)];
  } catch (e) { return ['ERR', String(e.message).slice(0, 40)]; }
});
process.stdout.write(JSON.stringify(out));
