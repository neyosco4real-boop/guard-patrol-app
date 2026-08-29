import os

for root, dirs, files in os.walk('app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'checkpoint' in content.lower() and ('scanner' in content.lower() or 'scan' in content.lower() or 'qr' in content.lower()):
                    print(path)
