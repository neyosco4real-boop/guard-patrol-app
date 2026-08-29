git add .
git commit -m "Fix schema cache error by adding location_id column and reloading schema"
npx vercel --prod
