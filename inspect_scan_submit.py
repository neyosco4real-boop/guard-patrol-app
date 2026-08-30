import os

for root, dirs, files in os.walk('app'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'handleSubmit' in content or 'supabase.from' in content or 'coordinates' in content:
                    print(f"=== {path} ===")
                    for line in content.splitlines():
                        if any(k in line.lower() for k in ['coordinates', 'lat', 'lng', 'gps', 'insert', 'scanned_at']):
                            print("  ", line.strip())
