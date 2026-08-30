with open('app/api/alerts/route.ts', 'r', encoding='utf-8') as f:
    code = f.read()

print("--- Alerts API Route ---")
print(code[:1000])
