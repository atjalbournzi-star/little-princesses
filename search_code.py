import os

targets = ['users WHERE', 'FROM users']

for folder in ['services', '.']:
    for f in os.listdir(folder):
        p = os.path.join(folder, f)
        if os.path.isfile(p) and p.endswith('.py'):
            try:
                with open(p, 'r', encoding='utf-8') as fp:
                    for idx, line in enumerate(fp, 1):
                        for t in targets:
                            if t in line:
                                print(f'{p}:{idx}: {line.strip()}')
            except Exception:
                pass
