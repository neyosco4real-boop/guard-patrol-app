import os
for root, dirs, files in os.walk('app'):
    for f in files:
        print(os.path.join(root, f))
