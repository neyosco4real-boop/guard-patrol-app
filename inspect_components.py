import os
for root, dirs, files in os.walk('app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'location' in content or 'coordinates' in content:
                    print(f"=== {path} ===")
                    print(content)
