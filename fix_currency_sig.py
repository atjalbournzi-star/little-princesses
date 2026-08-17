import os

broken_pattern = 'currency = {display: currency.display'

for root, dirs, files in os.walk('src/features'):
    for fname in files:
        if fname.endswith('.jsx'):
            path = os.path.join(root, fname)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if broken_pattern in content:
                # Find the broken default and remove it, leaving just 'currency'
                import re
                fixed = re.sub(
                    r'currency = \{display: currency\.display, code: "[^"]+", symbol: "[^"]+"\}',
                    'currency',
                    content
                )
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                print(f'FIXED: {path}')
            else:
                print(f'OK: {path}')

print('Done fixing signatures!')
