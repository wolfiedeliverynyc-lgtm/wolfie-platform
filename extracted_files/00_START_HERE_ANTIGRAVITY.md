# 🚀 START HERE - Deployment Guide for Antigravity

**From:** Iheb (CEO/Founder)  
**To:** Antigravity (Developer)  
**Date:** 28 July 2026  
**Priority:** 🔴 **HIGH** — Deploy TODAY  
**ETA:** ~30 minutes

---

## ⚡ Quick Summary

**4 critical bugs are fixed. Deploy them now.**

- ✅ Registration validation (auth.py)
- ✅ Profile pictures serving (app.py)
- ✅ **AI support agent** (admin_support.py) ← **The main issue**
- ✅ Double-booking prevention (user.py)

---

## 📋 What You Need to Do

### **Step 1: Get the Fixed Files**

Download these 4 files from the outputs folder:

```
✅ auth.py.FIXED              → Replace wolfie_backend/routes/auth.py
✅ app.py.FIXED               → Replace wolfie_backend/app.py
✅ admin_support.py.FIXED     → Replace wolfie_backend/routes/admin_support.py
✅ user.py.FIXED              → Replace wolfie_backend/database/repositories/user.py
```

**OR use the unified patch:**
```bash
git apply wolfie.fixes.patch
```

---

### **Step 2: Add Missing Dependency**

The AI agent needs this library:

```bash
# Install
pip install google-generativeai

# Add to requirements.txt
pip freeze | grep generativeai >> requirements.txt

# Verify it's there
grep "google-generativeai" requirements.txt
# Should output: google-generativeai==0.x.x
```

---

### **Step 3: Commit & Push**

```bash
cd wolfie-platform
git add .
git commit -m "Fix: registration validation, uploads serving, AI agent endpoint, double-booking prevention"
git push origin main
```

---

### **Step 4: Deploy on Render**

1. Go to Render dashboard
2. Select `wolfie-backend-pt9u`
3. Click "Deploy latest commit" (or wait for auto-deploy)
4. Watch logs for: `✅ Uploads serving at /uploads/`
5. Wait ~2-3 minutes for deployment

---

### **Step 5: Verify Deployment (Test Commands)**

Open your terminal and run these curl commands:

#### **Test 1: Registration (accepts "name" field)**
```bash
curl -X POST https://wolfie-backend-pt9u.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+12345678900"
  }'

# Expected: 201 status with user_id and tokens
```

#### **Test 2: AI Support Agent (the main fix)**
```bash
# First, get an admin token (replace with real token)
ADMIN_TOKEN="your_admin_jwt_token_here"

curl -X POST https://wolfie-backend-pt9u.onrender.com/api/v1/admin/support/ai \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I track my order?",
    "order_id": "order_123"
  }'

# Expected: 200 status with JSON response
# {
#   "reply": "...",
#   "confidence": 0.95,
#   "escalate": false
# }
```

#### **Test 3: AI Agent with Urgent Keywords (auto-escalate)**
```bash
curl -X POST https://wolfie-backend-pt9u.onrender.com/api/v1/admin/support/ai \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is URGENT! My order is missing and I need it ASAP!",
    "order_id": "order_456"
  }'

# Expected: 200 status with escalate: true
# {
#   "reply": "...",
#   "confidence": 0.95,
#   "escalate": true  ← Should be true because of "URGENT" and "ASAP"
# }
```

#### **Test 4: Missing API Key Error (should return 503)**
```bash
# If GEMINI_API_KEY is not set in Render, this will return 503
curl -X POST https://wolfie-backend-pt9u.onrender.com/api/v1/admin/support/ai \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Help!"}'

# Expected: 503 status with error message
# ONLY if GEMINI_API_KEY is missing
# (It shouldn't be - Iheb said it's already set)
```

#### **Test 5: Uploads Serving**
```bash
# If you uploaded a profile picture, test if it's served:
curl -i https://wolfie-backend-pt9u.onrender.com/uploads/sample_filename.jpg

# Expected: 200 status (or 404 if file doesn't exist)
```

---

## ✅ Verification Checklist

After deployment, verify ALL of these:

- [ ] **Git:** `git log --oneline -1` shows your fix commit
- [ ] **Render Logs:** No error messages, deployment successful
- [ ] **Render Logs:** Shows "✅ Uploads serving at /uploads/"
- [ ] **Registration Test:** Returns 201 with user_id
- [ ] **AI Agent Test:** Returns 200 with reply + confidence + escalate
- [ ] **Auto-escalation:** Returns escalate=true for urgent keywords
- [ ] **Health Check:** GET /health returns 200

---

## 🔴 If Any Test Fails

**Don't panic. Here's what to do:**

1. **Take a screenshot** of the error
2. **Check Render logs** for full error message
3. **Send to Iheb** with:
   - Screenshot of curl output
   - Render logs excerpt
   - Which test failed

**Common issues:**

| Issue | Solution |
|-------|----------|
| AI endpoint returns 503 | Check GEMINI_API_KEY in Render env |
| AI endpoint not found (404) | Verify admin_support.py.FIXED was applied |
| google-generativeai import error | Verify library is in requirements.txt |
| Render deployment fails | Check git commit, check for syntax errors |

---

## 📧 Report Back to Iheb

When deployment is complete, send:

```
✅ Deployment done
✅ All tests passing
✅ No errors in logs

Screenshots:
- Registration test result
- AI agent test result
- Render deployment success message
- Render logs showing "✅ Uploads serving"

Deployment time: X minutes
Notes: [any issues/observations]
```

---

## 📚 Full Documentation (If You Need Details)

These files have EVERYTHING explained:

- **DEPLOYMENT_INSTRUCTIONS_FOR_ANTIGRAVITY.md** ← Full step-by-step
- **BUG_FIXES_JULY_28_2026.md** ← What each bug was & how it's fixed
- **AI_AGENT_TROUBLESHOOTING.md** ← Deep dive into AI agent issue
- **EXEC_SUMMARY_AR.md** ← Executive summary in Arabic
- **wolfie_status_report_july_28_2026.md** ← Full project status

---

## ⏰ Timeline

```
Now:          You start deployment
+5 min:       Files applied to repo
+10 min:      Pushed to GitHub
+15 min:      Render deploying
+20 min:      Running tests
+25 min:      Verifying results
+30 min:      Report back to Iheb
```

---

## 🎯 Key Points to Remember

1. **The AI agent was broken because:**
   - ✅ API key existed in Render env
   - ❌ BUT there was NO endpoint to call it
   - I added: `POST /api/v1/admin/support/ai`

2. **After deployment, customers will get:**
   - Instant AI responses to support questions
   - Auto-escalation for urgent cases
   - Better customer experience

3. **This is HIGH priority because:**
   - Blocking first restaurant signup
   - Cash pilot launching tomorrow
   - Need AI support ready

---

## 🚨 IMPORTANT: Environment Variables

**Verify these are set in Render Dashboard:**

```
✅ GEMINI_API_KEY=your_key_here  (Iheb said this is already set)
✅ BASE_URL=https://wolfie-backend-pt9u.onrender.com
✅ REDIS_URL=redis://...
✅ DATABASE_URL=postgresql://...
```

If GEMINI_API_KEY is missing → AI endpoint will return 503

---

## 💬 Questions?

Ask Iheb or check the detailed docs:
- **How do I apply fixes?** → See DEPLOYMENT_INSTRUCTIONS_FOR_ANTIGRAVITY.md
- **What's the AI agent issue?** → See AI_AGENT_TROUBLESHOOTING.md
- **Why was this broken?** → See BUG_FIXES_JULY_28_2026.md

---

## ✨ Success Looks Like

After deployment:
```
✅ Registration accepts "name" field
✅ Profile pictures display correctly  
✅ POST /api/v1/admin/support/ai returns AI response
✅ Urgent messages auto-escalate
✅ No driver double-booking possible
✅ Render logs are clean
✅ All tests pass
```

---

**Ready? Go. Deploy. Report back.**

**Thank you!**

---

*Last updated: 28 July 2026, 03:50 UTC*
