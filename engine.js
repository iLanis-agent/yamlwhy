(function (root) {
  'use strict';
  // YAML 1.2 core schema (table in the YAML::PP schema comparison; matches the 1.2 spec section 10.3.2)
  var C_NULL = /^(?:~|null|Null|NULL|)$/;
  var C_BOOL = /^(?:true|True|TRUE|false|False|FALSE)$/;
  var C_INT10 = /^[-+]?[0-9]+$/, C_INT8 = /^0o[0-7]+$/, C_INT16 = /^0x[0-9a-fA-F]+$/;
  var C_FLOAT = /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?$/;
  var C_INF = /^[-+]?\.(?:inf|Inf|INF)$/, C_NAN = /^\.(?:nan|NaN|NAN)$/;
  // YAML 1.1 types (yaml.org/type/*.html; the float pattern is from the YAML::PP table)
  var O_BOOL = /^(?:y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/;
  var O_INT2 = /^[-+]?0b[0-1_]+$/, O_INT8 = /^[-+]?0[0-7_]+$/, O_INT10 = /^[-+]?(?:0|[1-9][0-9_]*)$/, O_INT16 = /^[-+]?0x[0-9a-fA-F_]+$/, O_INT60 = /^[-+]?[1-9][0-9_]*(?::[0-5]?[0-9])+$/;
  var O_FLOAT = /^[-+]?(?:[0-9][0-9_]*)?\.[0-9._]*(?:[eE][-+][0-9]+)?$/;
  var O_FLOAT60 = /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_ ]*$/;
  var O_TS = /^(?:[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}-[0-9][0-9]?-[0-9][0-9]?(?:[Tt]|[ \t]+)[0-9][0-9]?:[0-9]{2}:[0-9]{2}(?:\.[0-9]*)?(?:[ \t]*Z|[ \t]*[-+][0-9][0-9]?(?::[0-9]{2})?)?)$/;

  function sign(s) { return s[0] === '-' ? -1 : 1; }
  function unsign(s) { return /^[-+]/.test(s) ? s.slice(1) : s; }
  function show(n, isFloat) { if (Object.is(n, -0)) return isFloat ? '-0' : '0'; return String(n); }
  function sex(s) { var parts = unsign(s).replace(/_/g, '').split(':'), v = 0; parts.forEach(function (p) { v = v * 60 + parseFloat(p); }); return sign(s) * v; }

  function resolve12(s) {
    if (C_NULL.test(s)) return { type: 'null', value: 'null' };
    if (C_BOOL.test(s)) return { type: 'bool', value: /^[tT]/.test(s) ? 'true' : 'false' };
    if (C_INT8.test(s)) return { type: 'int', value: String(parseInt(s.slice(2), 8)), note: 'octal' };
    if (C_INT16.test(s)) return { type: 'int', value: String(parseInt(s.slice(2), 16)), note: 'hex' };
    if (C_INT10.test(s)) return { type: 'int', value: show(parseInt(s, 10)) };
    if (C_INF.test(s)) return { type: 'float', value: (s[0] === '-' ? '-' : '') + 'inf' };
    if (C_NAN.test(s)) return { type: 'float', value: 'nan' };
    if (C_FLOAT.test(s)) return { type: 'float', value: show(parseFloat(s), true) };
    return { type: 'str', value: s };
  }
  function resolve11(s) {
    if (C_NULL.test(s)) return { type: 'null', value: 'null' };
    if (O_BOOL.test(s)) return { type: 'bool', value: /^(?:y|Y|yes|Yes|YES|true|True|TRUE|on|On|ON)$/.test(s) ? 'true' : 'false' };
    if (O_INT2.test(s)) return { type: 'int', value: show(sign(s) * parseInt(unsign(s).slice(2).replace(/_/g, '') || '0', 2)), note: 'binary' };
    if (O_INT16.test(s)) return { type: 'int', value: show(sign(s) * parseInt(unsign(s).slice(2).replace(/_/g, '') || '0', 16)), note: 'hex' };
    if (O_INT10.test(s)) return { type: 'int', value: show(sign(s) * parseInt(unsign(s).replace(/_/g, ''), 10)) };
    if (O_INT8.test(s)) return { type: 'int', value: show(sign(s) * parseInt(unsign(s).replace(/_/g, '') || '0', 8)), note: 'octal' };
    if (O_INT60.test(s)) return { type: 'int', value: show(sex(s)), note: 'base 60' };
    if (C_INF.test(s)) return { type: 'float', value: (s[0] === '-' ? '-' : '') + 'inf' };
    if (C_NAN.test(s)) return { type: 'float', value: 'nan' };
    if (O_FLOAT60.test(s)) return { type: 'float', value: show(sex(s.replace(/ /g, ''))), note: 'base 60' };
    if (O_FLOAT.test(s)) { var t = unsign(s).replace(/_/g, ''); if (/^(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+][0-9]+)?$/.test(t)) return { type: 'float', value: show(sign(s) * parseFloat(t), true) }; }
    if (O_TS.test(s)) return { type: 'timestamp', value: s };
    return { type: 'str', value: s };
  }

  // One input line: a bare value, or "key: value". Quoted values are always strings.
  function analyze(line) {
    var raw = line.replace(/^\s+|\s+$/g, ''), key = null, val = raw;
    var m = /^(?:-\s+)?([^\s:#'"][^:#]*?):(?:\s+(.*))?$/.exec(raw);
    if (m && !/^[-+]?[0-9.:_]+$/.test(raw) && (m[2] !== undefined || /:$/.test(raw))) { key = m[1]; val = m[2] === undefined ? '' : m[2]; }
    var hash = /(^|\s)#/.exec(val); if (hash && !/^["']/.test(val)) val = val.slice(0, hash.index).replace(/\s+$/, '');
    var q = /^(["'])(.*)\1$/.exec(val);
    if (q) { var s = q[2]; return { key: key, raw: raw, quoted: true, v12: { type: 'str', value: s }, v11: { type: 'str', value: s }, differs: false }; }
    var a = resolve12(val), b = resolve11(val);
    return { key: key, raw: raw, val: val, quoted: false, v12: a, v11: b, differs: a.type !== b.type || a.value !== b.value };
  }
  var api = { resolve12: resolve12, resolve11: resolve11, analyze: analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YamlWhy = api;
})(typeof window !== 'undefined' ? window : this);
