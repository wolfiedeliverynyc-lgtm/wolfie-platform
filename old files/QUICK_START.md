# 🚀 Quick Start Guide - Wolfie Delivery

**ابدأ خلال 10 دقائق!**

---

## ⚡ **3 خطوات للبداية:**

### 1️⃣ **Setup Locally (5 دقائق)**

```bash
# Install
cd wolfie-complete
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env - add your MAPBOX_TOKEN

# Run
python app.py
```

**Open:** http://localhost:5000 ✅

---

### 2️⃣ **Get Mapbox Token (2 دقيقة)**

1. Go to: https://account.mapbox.com/auth/signup/
2. Sign up (free)
3. Copy your **Default Public Token**
4. Paste in `.env`:
   ```
   MAPBOX_ACCESS_TOKEN=pk.eyJ1abc123...
   ```

---

### 3️⃣ **Test It! (3 دقائق)**

#### **A. Register as Driver:**
```
http://localhost:5000/driver
→ Fill form
→ Submit
→ You're in the dashboard!
```

#### **B. Create Test Order:**
```
http://localhost:5000/test/order
→ Order created
→ Check driver dashboard
→ Accept order
→ Complete delivery
→ See earnings! 💰
```

---

## 🌐 **Deploy to Render (10 دقائق)**

### **Step 1: GitHub**
```bash
git init
git add .
git commit -m "Initial Wolfie Delivery"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### **Step 2: Render**
1. Go to: https://render.com
2. **New** → **Web Service**
3. Connect GitHub repo
4. Settings:
   ```
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn app:app
   ```
5. **Environment Variables:**
   ```
   SECRET_KEY=any-random-string-here
   MAPBOX_ACCESS_TOKEN=pk.your_token
   ```
6. **Deploy**!

### **Step 3: Test Live**
```
https://your-app.onrender.com/
→ Should see homepage ✅
```

---

## 📱 **Complete Features Checklist:**

### **✅ Currently Working:**
- [x] Homepage
- [x] Driver registration
- [x] Restaurant registration
- [x] Driver dashboard
- [x] Restaurant dashboard
- [x] Admin panel
- [x] Pricing engine
- [x] Terms & Policies pages
- [x] Database (JSON)
- [x] Order management
- [x] Test order creation

### **⚠️ Needs Templates (HTML):**
- [ ] `templates/home.html`
- [ ] `templates/driver_register.html`
- [ ] `templates/driver_dashboard.html`
- [ ] `templates/restaurant_register.html`
- [ ] `templates/restaurant_dashboard.html`
- [ ] `templates/admin_dashboard.html`
- [ ] `templates/terms.html`
- [ ] `templates/policies.html`

**نصيحة:** استخدم التصميم من `app.py` القديم أو أنشئ templates بسيطة

### **🎨 Needs Styling:**
- [ ] `static/css/style.css`
- [ ] `static/js/app.js`

---

## 🧪 **Testing Workflow:**

### **Scenario 1: Driver Journey**
```
1. Go to /driver
2. Register (name, phone, address, vehicle)
3. Redirected to /driver/dashboard
4. See "No orders" message
5. Go to /test/order (creates order)
6. Refresh dashboard - see order!
7. Click "Accept"
8. Click "Mark Delivered"
9. See earnings updated ✅
```

### **Scenario 2: Restaurant Journey**
```
1. Go to /restaurant
2. Register with menu photo
3. Redirected to /restaurant/dashboard
4. See stats (0 orders initially)
5. Orders appear when customers place them
```

### **Scenario 3: Admin View**
```
1. Go to /admin
2. See overall stats
3. View all drivers
4. View all restaurants
5. Create test orders
```

---

## 🔧 **Common Issues:**

### **"Template not found"**
**Fix:** Create `templates/` folder with HTML files

### **"Mapbox not working"**
**Fix:** Add MAPBOX_ACCESS_TOKEN to `.env`

### **"Module not found"**
**Fix:** `pip install -r requirements.txt`

### **"Port already in use"**
**Fix:** Kill process: `lsof -ti:5000 | xargs kill` (Mac/Linux)

---

## 📝 **Next Steps:**

### **Priority 1: Create Templates**
Use this structure:
```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Wolfie Delivery</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>
```

### **Priority 2: Add Styling**
```css
/* static/css/style.css */
body {
    font-family: 'Poppins', sans-serif;
    background: #1a1a2e;
    color: white;
}
```

### **Priority 3: Test Everything**
- [ ] Registration flows
- [ ] Order creation
- [ ] Order acceptance
- [ ] Order completion
- [ ] Stats updates

---

## 💡 **Pro Tips:**

1. **Use Flask debug mode locally:**
   ```python
   app.run(debug=True)
   ```

2. **Check logs for errors:**
   ```bash
   # In terminal where app is running
   ```

3. **Test API endpoints:**
   ```bash
   curl http://localhost:5000/test/order
   ```

4. **Backup database:**
   ```bash
   cp delivery_db.json delivery_db.backup.json
   ```

---

## 🎯 **Success Criteria:**

You'll know it's working when:
- ✅ Homepage loads without errors
- ✅ Can register as driver
- ✅ Can see dashboard
- ✅ Can create and accept orders
- ✅ Stats update correctly
- ✅ No 404 or 500 errors

---

## 📞 **Need Help?**

1. Check `README.md` for details
2. Review `config.py` for settings
3. Look at `app.py` routes
4. Test with `/test/order`

---

**You got this! 🐺**
