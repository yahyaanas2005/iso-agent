
import json

with open('IsolateERP_APIs_Combined_Deduped.json', 'r') as f:
    data = json.load(f)

paths = set()
for endpoint in data['endpoints']:
    paths.add(endpoint['path'])

with open('all_paths.txt', 'w') as f:
    for path in sorted(list(paths)):
        f.write(path + '\n')
