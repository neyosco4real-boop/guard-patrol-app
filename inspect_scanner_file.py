import os
path = 'app/components/QRScanner.tsx'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        print(f.read())
else:
    print("Not found")
