import os

scan_path = 'app/scan/page.tsx'
if os.path.exists(scan_path):
    with open(scan_path, 'r', encoding='utf-8') as f:
        print(f.read())
else:
    print("app/scan/page.tsx not found")
