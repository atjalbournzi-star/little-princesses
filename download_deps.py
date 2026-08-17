import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

deps = [
    ('https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js', 'react.production.min.js'),
    ('https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js', 'react-dom.production.min.js'),
    ('https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.10/babel.min.js', 'babel.min.js')
]

for url, filename in deps:
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response, open(filename, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Success: {filename}")
    except Exception as e:
        print(f"Failed: {filename} - {e}")
