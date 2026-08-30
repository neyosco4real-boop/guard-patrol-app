import os

# 1. Fix app/scan/page.tsx to properly parse JSON QR codes and resolve human-readable checkpoint names
scan_path = 'app/scan/page.tsx'
if os.path.exists(scan_path):
    with open(scan_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_scan_func = """  const handleScanSuccess = async (decodedText: string) => {
    setCheckpointId(decodedText);
    setShowScanner(false);
    
    try {
      const res = await fetch('/api/checkpoints');
      if (res.ok) {
        const data = await res.json();
        const found = data.find((cp: any) => cp.id === decodedText || cp.qr_code === decodedText || cp.name === decodedText);
        if (found) {
          setCheckpointName(found.name);
        } else {
          setCheckpointName(decodedText);
        }
      } else {
        setCheckpointName(decodedText);
      }
    } catch (err) {
      setCheckpointName(decodedText);
    }
  };"""

    new_scan_func = """  const handleScanSuccess = async (decodedText: string) => {
    let extractedId = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.checkpoint_id) {
        extractedId = parsed.checkpoint_id;
      } else if (parsed.id) {
        extractedId = parsed.id;
      }
    } catch (e) {
      // Not a JSON string, keep raw text
    }

    setCheckpointId(extractedId);
    setShowScanner(false);
    
    try {
      const res = await fetch('/api/checkpoints');
      if (res.ok) {
        const data = await res.json();
        const found = data.find((cp: any) => 
          cp.id === extractedId || 
          cp.qr_code === extractedId || 
          cp.name.toLowerCase() === extractedId.toLowerCase()
        );
        if (found) {
          setCheckpointName(found.name);
        } else {
          setCheckpointName(extractedId);
        }
      } else {
        setCheckpointName(extractedId);
      }
    } catch (err) {
      setCheckpointName(extractedId);
    }
  };"""

    if old_scan_func in content:
        content = content.replace(old_scan_func, new_scan_func)
        with open(scan_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated app/scan/page.tsx successfully!")
    else:
        print("Could not find exact old_scan_func match, checking file contents...")

