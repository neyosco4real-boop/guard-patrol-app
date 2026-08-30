with open('app/scan/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the incorrect getCurrentPosition block with the proper callback
old_code = """if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      setGps("""

new_code = """if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true }
    );"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('app/scan/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched app/scan/page.tsx")
else:
    print("Could not find exact match block, checking alternate structure...")
