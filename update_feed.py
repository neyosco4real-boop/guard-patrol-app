import os

path = 'app/components/PatrolLiveFeed.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect how it queries patrol_logs and joins checkpoints
print("File length:", len(content))
