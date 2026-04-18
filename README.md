# Trip Plan Website (Editable JSON Data)

Web app planning trip with:
- React UI (edit/add/delete events)
- Express API
- Persistent JSON storage in `data/itinerary.json`

## 1) Run locally

```bash
npm install
npm run dev
```

Open:
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api/health`

When you click **Save Itinerary**, data is written to `data/itinerary.json`.

## 2) Build production

```bash
npm run build
npm start
```

Open `http://localhost:4000`.

## 3) Deploy online free (easy way)

### Option A: Render (simple, one service)

1. Push this project to GitHub.
2. Go to [Render](https://render.com) and create account (free).
3. New -> **Blueprint** -> connect GitHub repo.
4. Render will read `render.yaml` automatically.
5. Click **Apply** to deploy.

You will get a free URL like:
`https://your-app-name.onrender.com`

If you do not use Blueprint:
- New -> **Web Service**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### Important note for free hosting

Many free hosts use ephemeral filesystem, so JSON file can reset on restart/redeploy.

If you need stronger persistence, use one of these:
- Render Disk (paid)
- Supabase / Firebase / MongoDB Atlas free tier
- Railway + volume (depending on plan)

For demo or short-term usage, current JSON file approach is enough.

## 4) Free domain options

You already have a free domain/subdomain when deploying:
- Render: `*.onrender.com`
- Vercel: `*.vercel.app`
- Netlify: `*.netlify.app`

If you want custom domain with zero cost:
- Use [DuckDNS](https://www.duckdns.org) (free subdomain, dynamic DNS)
- Or find a free domain campaign provider (availability changes over time)

Most stable no-cost setup: keep the platform free subdomain (`onrender.com`).
