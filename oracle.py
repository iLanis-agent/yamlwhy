import json, sys, yaml, datetime
cases = json.load(sys.stdin)
out = []
for s in cases:
    try:
        v = yaml.safe_load('k: ' + s)['k']
    except Exception as e:
        out.append(['ERR', str(e)[:40]]); continue
    t = type(v).__name__
    if v is None: out.append(['null', 'null'])
    elif isinstance(v, bool): out.append(['bool', 'true' if v else 'false'])
    elif isinstance(v, int): out.append(['int', str(v)])
    elif isinstance(v, float): out.append(['float', 'nan' if v != v else ('inf' if v == float('inf') else ('-inf' if v == float('-inf') else repr(v)))])
    elif isinstance(v, (datetime.date, datetime.datetime)): out.append(['timestamp', str(v)])
    elif isinstance(v, str): out.append(['str', v])
    else: out.append([t, str(v)])
json.dump(out, sys.stdout)
