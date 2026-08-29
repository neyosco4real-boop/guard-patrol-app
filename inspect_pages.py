for path in ['app/page.tsx', 'app/scan/page.tsx', 'app/components/QRScanner.tsx']:
    print(f"--- {path} ---")
    try:
        with open(path, 'r', encoding='utf-8') as f:
            print(f.read()[:1000]) # Print first 1000 chars
    except Exception as e:
        print(e)
