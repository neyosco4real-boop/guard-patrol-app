with open('app/components/PatrolLiveFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace coordinates rendering logic to check coordinate or location/gps fields
updated = content.replace("log.coordinates || 'N/A'", "log.coordinates || log.lat_lng || log.gps_coordinates || log.location || 'N/A'")
updated = updated.replace("{log.coordinates || 'N/A'}", "{log.coordinates || log.lat_lng || log.gps_coordinates || log.location || 'N/A'}")

with open('app/components/PatrolLiveFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(updated)

print("Updated PatrolLiveFeed.tsx coordinates successfully!")
