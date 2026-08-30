with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    print("--- ADMIN PAGE ---")
    print(f.read()[:2000])

with open('app/api/alerts/route.ts', 'r', encoding='utf-8') as f:
    print("--- ALERTS API ROUTE ---")
    print(f.read()[:2000])
