import os

for path in ['app/scan/page.tsx', 'app/components/QRScanner.tsx']:
    if os.path.exists(path):
        print(f"=== {path} ===")
        with open(path, 'r', encoding='utf-8') as f:
            for line in f.readlines():
                if any(k in line.lower() for k in ['coord', 'lat', 'lng', 'gps', 'location', 'navigator', 'geolocation']):
                    print("  ", line.strip())
