# Storage Upload Troubleshooting — Self-Hosted Supabase

**Error:** `Failed to upload DOCX: Unexpected token '<', "<html> <h"... is not valid JSON`

This means the storage API is returning an HTML error page instead of JSON. Follow these steps in order.

---

## Step 1: Verify the Storage Container Is Running

On the server where Supabase is deployed:

```bash
# List all Supabase containers
docker ps -a --filter "name=supabase"

# Or, if using docker compose from the Supabase repo:
cd /path/to/supabase/docker
docker compose ps
```

**Look for:** `supabase-storage` (or `supabase-storage-api`) in the list with status `Up`.

- **If it's not running:** Start it with `docker compose up -d storage` (or your equivalent).
- **If it keeps restarting:** Check logs with `docker logs supabase-storage` and fix the underlying error (often DB connection or missing env vars).

---

## Step 2: Test Storage Directly (Inside Docker Network)

From the same host, test that the storage service responds with JSON:

```bash
# Replace YOUR_SERVICE_ROLE_KEY with your actual service role key from .env
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  "http://localhost:8000/storage/v1/bucket"
```

- **If you get `200`:** Storage is reachable via Kong. Skip to Step 4.
- **If you get `401`:** Auth is working; Kong might be returning something else for uploads. Continue to Step 4.
- **If you get HTML or connection refused:** Kong or storage routing is broken. Continue to Step 3.

---

## Step 3: Check Kong Routing for Storage

Kong must route `/storage/v1/` to the storage container. The standard config is in `docker/volumes/api/kong.yml`:

```yaml
- name: storage-v1
  url: http://storage:5000/
  routes:
    - name: storage-v1-all
      strip_path: true
      paths:
        - /storage/v1/
```

**Verify:**

1. Open `docker/volumes/api/kong.yml` on your Supabase host.
2. Search for `storage-v1` and confirm the route exists and matches above.
3. If you use a custom Kong config, ensure `/storage/v1/` is routed to the storage service (internal URL `http://storage:5000/`).
4. Restart Kong after any config change: `docker compose restart kong`.

---

## Step 4: Test From Outside (Your Supabase URL)

From your local machine or any machine that can reach `https://supabase.360medical.net`:

```bash
# Replace with your real values from .env.local
SUPABASE_URL="https://supabase.360medical.net"
SERVICE_ROLE_KEY="your-service-role-key-here"

curl -v -X GET \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/bucket"
```

**Expected:** JSON response (e.g. `[]` or a list of buckets) or a 4xx JSON error.

**If you get HTML instead:**

- Your reverse proxy (Caddy, Nginx, Cloudflare, etc.) may be returning an error page for `/storage/v1/`.
- Check:
  1. Reverse proxy config: ensure `/storage/v1` is proxied to Kong (usually port 8000).
  2. No path rewriting that drops or changes `/storage/v1`.
  3. No firewall/WAF blocking the path.

---

## Step 5: Check Reverse Proxy Configuration

If you use Caddy, Nginx, or another reverse proxy in front of Kong:

**Caddy example:**

```caddyfile
supabase.360medical.net {
    reverse_proxy localhost:8000
}
```

**Nginx example:**

```nginx
location / {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Ensure the proxy forwards **all** paths (including `/storage/v1/`) to Kong. Some setups only proxy `/auth`, `/rest`, etc. and return a default HTML page for everything else.

---

## Step 6: Create the `ivr-private` Bucket (If Missing)

Storage may return errors if the bucket does not exist. Create it via Supabase Studio or SQL:

**Option A — Supabase Studio**

1. Open `https://supabase.360medical.net` (or your Studio URL).
2. Go to **Storage**.
3. Click **New bucket**.
4. Name: `ivr-private`.
5. Set to **Private**.
6. Create.

**Option B — SQL (if Studio is unavailable)**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ivr-private', 'ivr-private', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 7: Use `SUPABASE_STORAGE_URL` (Only If Storage Is on a Different URL)

If storage is served from a **different** host or path (e.g. `https://storage.360medical.net` or `https://supabase.360medical.net/api/storage/v1`), set:

```env
SUPABASE_STORAGE_URL=https://your-actual-storage-url/storage/v1
```

- Do **not** add a trailing slash.
- Add this to `.env.local` for local dev and to Vercel Environment Variables for production.
- Redeploy after changing env vars.

---

## Quick Checklist

| Step | Action | Pass? |
|------|--------|-------|
| 1 | `docker ps` shows `supabase-storage` running | ☐ |
| 2 | `curl` to `http://localhost:8000/storage/v1/bucket` returns JSON (or 401) | ☐ |
| 3 | `kong.yml` has `/storage/v1/` route to `http://storage:5000/` | ☐ |
| 4 | `curl` to `https://supabase.360medical.net/storage/v1/bucket` returns JSON | ☐ |
| 5 | Reverse proxy forwards `/storage/v1` to Kong | ☐ |
| 6 | `ivr-private` bucket exists in Storage | ☐ |
| 7 | `SUPABASE_STORAGE_URL` set only if storage is on a different URL | ☐ |

---

## Still Failing?

1. **Capture the actual response:**  
   Use `curl -v` and save the full response (headers + body) when calling the storage URL. Check whether it's HTML (404, 502, 503 page) or JSON.

2. **Check Kong logs:**  
   `docker logs supabase-kong` for routing or upstream errors.

3. **Check storage logs:**  
   `docker logs supabase-storage` for auth or backend errors.

4. **Network:**  
   Ensure Vercel (or your app host) can reach `https://supabase.360medical.net` and that no firewall blocks `/storage/v1`.
