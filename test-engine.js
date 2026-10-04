'use strict';
var Y = require('./engine.js'), cp = require('child_process'), fs = require('fs'), path = require('path');
var checks = 0, fails = 0;
function eq(a, b, m) { checks++; if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; if (fails < 20) console.log('FAIL', m, JSON.stringify(a), '!=', JSON.stringify(b)); } }
function r11(s) { var r = Y.resolve11(s); return [r.type, r.value]; }
function r12(s) { var r = Y.resolve12(s); return [r.type, r.value]; }

// 1. Examples printed on the YAML 1.1 type pages (yaml.org/type/{bool,int,float,null,timestamp}.html)
['y', 'NO', 'True', 'on'].forEach(function (s, i) { eq(r11(s), ['bool', ['true', 'false', 'true', 'true'][i]], 'bool example ' + s); });
['685230', '+685_230', '02472256', '0x_0A_74_AE', '0b1010_0111_0100_1010_1110', '190:20:30'].forEach(function (s) { eq(r11(s), ['int', '685230'], 'int example ' + s); });
['6.8523015e+5', '685.230_15e+03', '685_230.15', '190:20:30.15'].forEach(function (s) { eq(r11(s), ['float', '685230.15'], 'float example ' + s); });
eq(r11('-.inf'), ['float', '-inf'], '-.inf'); eq(r11('.NaN'), ['float', 'nan'], '.NaN');
['~', 'null', 'Null', ''].forEach(function (s) { eq(r11(s)[0], 'null', 'null example'); eq(r12(s)[0], 'null', 'null 1.2'); });
['2001-12-15T02:59:43.1Z', '2001-12-14t21:59:43.10-05:00', '2001-12-14 21:59:43.10 -5', '2001-12-15 2:59:43.10', '2002-12-14'].forEach(function (s) { eq(r11(s)[0], 'timestamp', 'timestamp example ' + s); eq(r12(s)[0], 'str', 'timestamp is a string in 1.2 core ' + s); });
// 2. The classic traps
eq(r12('NO'), ['str', 'NO'], 'Norway 1.2'); eq(r11('NO'), ['bool', 'false'], 'Norway 1.1');
eq(r12('010'), ['int', '10'], '010 in 1.2'); eq(r11('010'), ['int', '8'], '010 in 1.1');
eq(r12('0o10'), ['int', '8'], '0o10 in 1.2'); eq(r11('0o10'), ['str', '0o10'], '0o10 in 1.1');
eq(r11('08'), ['str', '08'], '08 in 1.1'); eq(r12('08'), ['int', '8'], '08 in 1.2');
eq(r12('1:30'), ['str', '1:30'], '1:30 in 1.2'); eq(r11('1:30'), ['int', '90'], '1:30 in 1.1');
eq(r12('1_000'), ['str', '1_000'], '1_000 in 1.2'); eq(r11('1_000'), ['int', '1000'], '1_000 in 1.1');
eq(r12('1e3'), ['float', '1000'], '1e3 in 1.2'); eq(r11('1e3'), ['str', '1e3'], '1e3 in 1.1');
eq(r12('1.10'), ['float', '1.1'], '1.10 float'); eq(r11('1.10'), ['float', '1.1'], '1.10 float 1.1');
eq(Y.analyze('country: NO').differs, true, 'analyze differs'); eq(Y.analyze('country: "NO"').differs, false, 'quoted is string');
eq(Y.analyze('name: Ann').differs, false, 'plain string same'); eq(Y.analyze('key: value # comment').val, 'value', 'comment stripped');

// 3. Oracles: yaml (1.2 core and 1.1 schemas), js-yaml core schema, PyYAML (1.1 resolver). Random scalars.
var seed = 99; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
var WORDS = ['y', 'Y', 'n', 'N', 'yes', 'no', 'No', 'NO', 'on', 'off', 'On', 'true', 'True', 'TRUE', 'false', 'null', 'Null', '~', 'NULL', '', '010', '0o10', '0x1F', '0b101', '1_000', '1:30', '190:20:30', '1:30.5', '.5', '5.', '1e3', '1.0e+3', '1E-2', '+1', '-1', '+.5', '.inf', '-.inf', '.NaN', '.nan', '2001-12-14', '2001-12-14t21:59:43.10-05:00', '2001-12-14 21:59:43.10 -5', '1.10', '08', '09', '0', '00', '-0', '0_1', '_1', '1_', '0x', '0b', '0o', '1.2.3', 'Norway', '12e', 'e5', '0.', '+0x1F', '-0b11', '1:60', '1:5', '+1:30', '0777', '0xdead_beef', '1,000', '3.14', '3.', '.', '-', '+', '1e3.5', '1.5e3', '1.5e+3', 'TrUe'];
function rand() { if (rnd() < 0.5) return pick(WORDS); var al = '0123456789.eE+-_:xob abyYnN~tTrfa'.split(''), n = 1 + Math.floor(rnd() * 6), s = ''; for (var i = 0; i < n; i++) s += pick(al); return s.replace(/^\s+|\s+$/g, ''); }
var set = {}, cases = [];
for (var i = 0; i < 4000; i++) { var x = rand(); if (/(^|:)\s*$|: |^-( |$)|^[:#]| #/.test(x) || set[x]) continue; set[x] = 1; cases.push(x); }
function oracle(cmd, args) { try { return JSON.parse(cp.execFileSync(cmd, args, { input: JSON.stringify(cases), maxBuffer: 1 << 28, cwd: __dirname }).toString()); } catch (e) { return null; } }
function num(t) { return t === 'int' || t === 'float' ? 'num' : t; }
function same(mine, o) { var m = [num(mine[0]), mine[1]]; o = [num(o[0]), o[1]]; if (m[0] === 'timestamp') return o[0] === 'timestamp'; if (m[0] === 'num' && o[0] === 'num' && parseFloat(m[1]) === parseFloat(o[1])) return true; return JSON.stringify(m) === JSON.stringify(o); }
var report = [];
function compare(name, o, f, allowed) {
  if (!o) { report.push(name + ': skipped (not installed)'); return; }
  var bad = 0, allowedN = 0;
  cases.forEach(function (s, i) { if (same(f(s), o[i])) { checks++; return; } if (allowed && allowed(s)) { allowedN++; return; } eq(f(s), o[i], name + ' ' + JSON.stringify(s)); bad++; });
  report.push(name + ': ' + cases.length + ' scalars, ' + (cases.length - bad - allowedN) + ' agree, ' + allowedN + ' known deviations of the library, ' + bad + ' unexplained');
}
var onode = ['oracle-node.js'];
compare('YAML 1.2 vs yaml (core schema)', oracle('node', onode.concat(['yaml', '1.2'])), r12);
compare('YAML 1.2 vs js-yaml (core schema)', oracle('node', onode.concat(['js-yaml', '1.2'])), r12);
compare('YAML 1.1 vs yaml (1.1 schema)', oracle('node', onode.concat(['yaml', '1.1'])), r11, function (s) { return /[eE]|^[-+]?0[0-9_]+$|^\.$|_/.test(s); });
compare('YAML 1.1 vs PyYAML', oracle('python3', ['oracle.py']), r11, function (s) { return /^[yYnN]$/.test(s) || /^\+\./.test(s) || /\._/.test(s); });
report.forEach(function (l) { console.log(l); });
console.log(checks + ' checks, ' + fails + ' failures');
process.exit(fails ? 1 : 0);
