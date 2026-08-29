import os
for root, dirs, files in os.walk('app'):
    for file in files:
        if 'feed' in file.lower() or 'telemetry' in file.lower() or 'page' in file.lower():
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'location' in content.lower() or 'coordinates' in content.lower():
                    print(f"=== {path} ===")
                    print(content[:1500]) # print first part
