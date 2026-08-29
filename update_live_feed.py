with open('app/components/PatrolLiveFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace N/A with actual database fields
updated = content.replace("log.location || 'N/A'", "log.location || log.checkpoint_name || 'N/A'")
updated = updated.replace("{log.location || 'N/A'}", "{log.location || log.checkpoint_name || 'N/A'}")
updated = updated.replace("log.coordinates || 'N/A'", "log.coordinates || log.scanned_location || 'N/A'")
updated = updated.replace("{log.coordinates || 'N/A'}", "{log.coordinates || log.scanned_location || 'N/A'}")

with open('app/components/PatrolLiveFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(updated)

print("Updated PatrolLiveFeed.tsx successfully!")
