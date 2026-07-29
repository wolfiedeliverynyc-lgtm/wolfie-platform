# 📋 Deployment Instructions for Antigravity

**من:** Claude (Technical Auditor)
**إلى:** Antigravity (Developer)
**التاريخ:** 28 يوليو 2026
**الأولوية:** 🔴 **HIGH** — 4 Critical Bugs Fixed

---

## 🎯 المهمة

تطبيق 4 fixes على الـ codebase ونشرها على Render.

### ✅ Files Modified:
1. `wolfie_backend/routes/auth.py` — Registration validation
2. `wolfie_backend/app.py` — Uploads static route
3. `wolfie_backend/routes/admin_support.py` — AI agent endpoint
4. `wolfie_backend/database/repositories/user.py` — Double-booking fix

---

## 📥 Step 1: Get the Fixed Files

### Option A: Copy from patches
**Files available in /outputs:**
- `auth.py.FIXED`
- `app.py.FIXED`
- `admin_support.py.FIXED`
- `user.py.FIXED`

### Option B: Apply unified patch
```bash
cd wolfie-platform
git apply wolfie.fixes.patch
```

### Option C: Manual merge (if conflicts)
```bash
# Replace the 4 files manually
# Use the FIXED versions as reference
```

---

## 🔧 Step 2: Apply Changes

### A. Update `wolfie_backend/routes/auth.py`
**Lines 89-120:** Replace the `/register` endpoint

**Key changes:**
- Accept both `name` and `full_name`
- Default `role` to `"customer"` if not provided
- Validate flexibly

**Verify:**
```bash
# Should have these lines:
grep "full_name = data.get" wolfie_backend/routes/auth.py
grep "role = (data.get" wolfie_backend/routes/auth.py
```

### B. Update `wolfie_backend/app.py`
**After `init_db(app)` line (~70):** Add uploads serving

**Code block:**
```python
# ── Static Files / Uploads ─────────────────
from flask import send_from_directory
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
os.makedirs(uploads_dir, exist_ok=True)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    try:
        return send_from_directory(uploads_dir, filename, as_attachment=False)
    except Exception as e:
        app.logger.warning(f"Upload file not found: {filename} — {e}")
        return jsonify({"error": "File not found"}), 404

app.logger.info(f"✅ Uploads serving at /uploads/ (dir: {uploads_dir})")
```

**Verify:**
```bash
grep -n "serve_upload" wolfie_backend/app.py
# Should output line number
```

### C. Update `wolfie_backend/routes/admin_support.py`
**Add new AI endpoint:** Add lines 74-164

**Imports at top:**
```python
import os
import logging
import json
from flask import current_app  # ADD THIS
```

**New endpoint:**
```python
@admin_support_bp.route("/support/ai", methods=["POST"])
@require_auth()
def ai_support_chat():
    # ... (see BUG_FIXES_JULY_28_2026.md for full code)
```

**Verify:**
```bash
grep -n "def ai_support_chat" wolfie_backend/routes/admin_support.py
```

### D. Update `wolfie_backend/database/repositories/user.py`
**Imports:** Change line 10
```python
from sqlalchemy import select, and_
from database.schemas import Order  # ADD THIS
```

**Replace `find_available_drivers()` method (lines 34-41)**

**Key changes:**
- Subquery for drivers with active orders
- `NOT IN` subquery filter
- `with_for_update()` with try/except

**Verify:**
```bash
grep -A 10 "def find_available_drivers" wolfie_backend/database/repositories/user.py
# Should have "drivers_with_active_orders" and "with_for_update"
```

---

## 📦 Step 3: Dependencies

### Check requirements.txt
```bash
# Verify google-generativeai is present:
grep "google-generativeai" requirements.txt

# If missing, add:
pip install google-generativeai
pip freeze | grep generativeai >> requirements.txt
```

---

## 🧪 Step 4: Local Testing

### Test 1: Registration endpoint
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+1234567890"
  }'

# Expected: 201 with user_id and tokens
# Note: No "full_name" required, no "role" required
```

### Test 2: Uploads endpoint
```bash
# 1. Create a test file
echo "test" > /tmp/test.txt

# 2. Upload it
curl -X POST http://localhost:5000/api/v1/drivers/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/tmp/test.txt"

# 3. Serve it
curl http://localhost:5000/uploads/abc123def456.txt
# Expected: 200 with file content (or 404 if not found)
```

### Test 3: AI support endpoint
```bash
curl -X POST http://localhost:5000/api/v1/admin/support/ai \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My order is urgent",
    "order_id": "order_123"
  }'

# Expected: 200 with reply + confidence + escalate flag
# If GEMINI_API_KEY missing: 503 with error message
```

### Test 4: Double-booking prevention
```bash
# Get available drivers
curl http://localhost:5000/api/v1/drivers/available \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should NOT include drivers with active orders
# (Verify in DB: driver has status=assigned or picked_up)
```

---

## 🚀 Step 5: Deployment to Render

### Push to GitHub
```bash
git add .
git commit -m "Fix: registration validation, uploads, AI agent, double-booking prevention"
git push origin main
```

### Render Deployment
1. Go to Render dashboard
2. Select `wolfie-backend-pt9u`
3. Click "Deploy latest commit"
4. Wait for deployment (2-3 minutes)
5. Check logs for `✅ Uploads serving at /uploads/`

### Verify Deployment
```bash
# Check health endpoint
curl https://wolfie-backend-pt9u.onrender.com/health

# Should return 200 with status: "ok"
```

---

## 🔐 Step 6: Render Environment Variables

### Verify these are set in Render dashboard:
```
GEMINI_API_KEY=<actual_key>
BASE_URL=https://wolfie-backend-pt9u.onrender.com
```

### Add if missing:
1. Go to Render dashboard
2. Select wolfie-backend-pt9u
3. Go to "Environment"
4. Add/update:
   - `GEMINI_API_KEY=your_key_here`
   - `BASE_URL=https://wolfie-backend-pt9u.onrender.com`
5. Click "Deploy" (will trigger redeploy)

---

## ✅ Step 7: Verification Checklist

After deployment, verify each fix:

### Fix #1: Registration
- [ ] POST `/api/v1/auth/register` accepts `name` (not just `full_name`)
- [ ] POST `/api/v1/auth/register` doesn't require `role` (defaults to `customer`)
- [ ] Valid response: 201 with user_id and tokens

### Fix #2: Uploads
- [ ] GET `/uploads/<filename>` returns the file
- [ ] GET `/uploads/<invalid>` returns 404
- [ ] Render logs show "✅ Uploads serving at /uploads/"

### Fix #3: AI Agent
- [ ] POST `/api/v1/admin/support/ai` exists
- [ ] Requires Authorization header
- [ ] Returns `{"reply": "...", "confidence": 0.95, "escalate": bool}`
- [ ] Handles missing GEMINI_API_KEY gracefully (503)

### Fix #4: Double-booking
- [ ] Database: User with role="driver" and active order NOT returned by `find_available_drivers()`
- [ ] Order repository: Drivers with status=assigned/picked_up excluded from matching
- [ ] PostgreSQL: `with_for_update()` works (try `SELECT ... FOR UPDATE`)
- [ ] SQLite: No errors even though `with_for_update()` is no-op

---

## 🐛 Troubleshooting

### Issue: "TemplateNotFound" error after deployment
**Solution:** Make sure `serve_upload()` route is inside `create_app()` function, not at module level.

### Issue: AI endpoint returns 503
**Check:**
```bash
# In Render dashboard, check build logs
# Verify GEMINI_API_KEY is set
# Verify google-generativeai is in requirements.txt
```

### Issue: Registration still requires `full_name`
**Check:**
```bash
# Line 93-95 in auth.py should have:
full_name = data.get("full_name") or data.get("name") or ""
role = (data.get("role") or "customer").strip()
```

### Issue: Uploads return 404 even after upload
**Check:**
```bash
# 1. Flask app.py line ~81 has @app.route('/uploads/<path:filename>')
# 2. uploads_dir exists and is writable
# 3. File was actually saved there
```

---

## 📞 Questions?

Ask in Slack or create a GitHub issue with:
- What endpoint you tested
- What you sent
- What you got
- Server logs (Render dashboard → "Logs")

---

## 📊 Success Metrics

After successful deployment:
- ✅ 4 bugs fixed
- ✅ 0 new bugs introduced
- ✅ All endpoints return correct status codes
- ✅ No 500 errors in logs
- ✅ Ready for first cash pilot with customer

---

**Status:** 🟢 Ready to Deploy

**Files to review:**
- `BUG_FIXES_JULY_28_2026.md` (detailed fixes)
- `AI_AGENT_TROUBLESHOOTING.md` (AI agent analysis)
- `*.FIXED` files (patched code)
- `wolfie.fixes.patch` (unified patch)

---

**Total time estimate:** 15-30 minutes (including testing)
**Difficulty:** 🟢 Medium (straightforward changes, good error handling)
