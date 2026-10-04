# YamlWhy

Shows what type a YAML plain scalar becomes under YAML 1.2 (core schema) and YAML 1.1, so the Norway problem (`NO` becoming `false`), octal `010`, base-60 `1:30` and surprise dates are visible before they bite.

Open `app.html` (static, client-side, no uploads). Run `npm install && npm test` for the checks.

## What it follows
- YAML 1.1: the type pages on yaml.org/type (bool, int, null, timestamp read directly; the float pattern comes from the YAML::PP schema comparison page, a secondary source, because the float page lost its regexp when fetched).
- YAML 1.2 core: the YAML::PP schema table (secondary source). The official 1.2.2 spec page was truncated in my fetch before section 10.3.2, so the core rules were not read there directly.

## Checks (`test-engine.js`)
- Examples printed on the 1.1 type pages, plus classic traps.
- About 1550 random scalars compared with: `yaml` (core and 1.1 schema), `js-yaml` (core schema), PyYAML (`safe_load`).
- 1.2 core: agrees with `yaml` and `js-yaml` on every scalar tested.
- 1.1: libraries deviate from the spec pages, so these are counted as known deviations, not errors:
  - `yaml` 1.1 mode reads `08`/`09` as ints (spec: strings), `1e3` / `1E-2` as floats (spec needs a sign and a dot), and `.`, `e5` as nan.
  - PyYAML has no `y`/`n` booleans, needs a dot in floats (`+.5` is a string), and uses `+`-signed floats differently.
- Only single-line plain scalars are covered. Quoted values are always strings. This is not a YAML parser.
