# إعداد سريع للنشر على Render

## الخطوات السريعة:

### 1. رفع المشروع إلى GitHub
```bash
git init
git add .
git commit -m "إعداد MCP Server للنشر على Render"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/saudi-interactive-map.git
git push -u origin main
```

### 2. إنشاء خدمة على Render
1. اذهب إلى [render.com](https://render.com)
2. سجل دخول بـ GitHub
3. اضغط "New +" → "Web Service"
4. اختر المستودع
5. استخدم الإعدادات:
   - **Name:** `saudi-interactive-map`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

### 3. الملفات المطلوبة (✅ جاهزة):
- ✅ `package.json` - تبعيات Node.js
- ✅ `server.js` - MCP Server الرئيسي
- ✅ `render.yaml` - تكوين Render
- ✅ APIs جاهزة لبديل PHP

### 4. الميزات المتاحة:
- 🌐 خريطة تفاعلية: `/`
- 📊 لوحة التحكم: `/diseases_dashboard.html`
- 🔌 APIs:
  - `POST /api/save-diseases-data`
  - `GET /api/diseases-data`
  - `GET /api/regions`
  - `GET /health`

### 5. اختبار محلي:
```bash
npm start
# الموقع: http://localhost:3000
```

### 6. بعد النشر:
- الموقع سيكون متاح على: `https://your-app-name.onrender.com`
- اختبر: `https://your-app-name.onrender.com/health`

## ملاحظات مهمة:
- ✅ تم تحويل PHP إلى Node.js APIs
- ✅ دعم CORS للتطبيقات الخارجية
- ✅ حفظ البيانات في JSON
- ✅ رفع ملفات Excel
- ✅ خطة مجانية تدعم المشروع

## استكشاف الأخطاء:
إذا فشل النشر، تحقق من:
1. ملف `package.json` صحيح
2. `server.js` يعمل محلياً
3. متغير `PORT` محدد في Render