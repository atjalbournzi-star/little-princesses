import os
for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or '.gemini' in root:
        continue
    for f in files:
        if f.endswith('.py'):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8') as fp:
                    c = fp.read()
                    if 'job-card/approve' in c or 'job_card/approve' in c:
                        print('Found approve in:', p)
                    if 'users WHERE' in c and 'OR name' in c:
                        print('Found user query in:', p)
            except Exception:
                pass
