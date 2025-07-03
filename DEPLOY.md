# دليل النشر على Render

## متطلبات النشر

### 1. إعداد المشروع

تأكد من وجود الملفات التالية:
- `package.json` - ملف تبعيات Node.js
- `server.js` - الخادم الرئيسي (MCP Server)
- `render.yaml` - ملف تكوين Render

### 2. خطوات النشر على Render

#### الطريقة الأولى: من خلال GitHub

1. **رفع المشروع إلى GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/saudi-interactive-map.git
   git push -u origin main
   ```

2. **إنشاء حساب على Render:**
   - اذهب إلى [render.com](https://render.com)
   - سجل دخول باستخدام GitHub

3. **إنشاء خدمة جديدة:**
   - اضغط على "New +"
   - اختر "Web Service"
   - اربط مع مستودع GitHub
   - اختر المستودع الخاص بك

4. **تكوين الخدمة:**
   - **Name:** `saudi-interactive-map`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

#### الطريقة الثانية: النشر المباشر

1. **تثبيت Render CLI:**
   ```bash
   npm install -g @render/cli
   ```

2. **تسجيل الدخول:**
   ```bash
   render login
   ```

3. **النشر:**
   ```bash
   render deploy
   ```

### 3. متغيرات البيئة

أضف المتغيرات التالية في لوحة تحكم Render:

```
NODE_ENV=production
PORT=10000
```

### 4. إعداد قاعدة البيانات (اختياري)

إذا كنت تريد استخدام قاعدة بيانات:

1. **إنشاء قاعدة بيانات PostgreSQL:**
   - في لوحة تحكم Render
   - اضغط "New +" → "PostgreSQL"
   - اختر الخطة المجانية

2. **ربط قاعدة البيانات:**
   - انسخ `DATABASE_URL`
   - أضفها كمتغير بيئة في خدمة الويب

### 5. إعداد التخزين المستمر

لحفظ ملفات JSON:

1. **إنشاء Disk:**
   - في إعدادات الخدمة
   - أضف "Persistent Disk"
   - **Name:** `data`
   - **Mount Path:** `/opt/render/project/src/json`
   - **Size:** `1 GB`

### 6. التحقق من النشر

بعد النشر الناجح:

1. **اختبار الصفحة الرئيسية:**
   ```
   https://your-app-name.onrender.com
   ```

2. **اختبار API:**
   ```
   https://your-app-name.onrender.com/health
   ```

3. **اختبار لوحة التحكم:**
   ```
   https://your-app-name.onrender.com/diseases_dashboard.html
   ```

### 7. إعداد النطاق المخصص (اختياري)

1. في إعدادات الخدمة
2. اذهب إلى "Custom Domains"
3. أضف النطاق الخاص بك
4. اتبع تعليمات DNS

## استكشاف الأخطاء

### مشاكل شائعة:

1. **خطأ في البناء:**
   - تحقق من `package.json`
   - تأكد من وجود جميع التبعيات

2. **خطأ في البدء:**
   - تحقق من `server.js`
   - تأكد من استخدام المنفذ الصحيح

3. **مشاكل في الملفات:**
   - تحقق من مسارات الملفات
   - تأكد من وجود مجلد `json`

### عرض السجلات:

```bash
render logs --service your-service-id
```

## الميزات المتاحة

### APIs المتاحة:

- `GET /health` - فحص حالة الخادم
- `POST /api/save-diseases-data` - حفظ بيانات الأمراض
- `GET /api/diseases-data` - قراءة بيانات الأمراض
- `GET /api/regions` - بيانات المناطق
- `GET /api/cities` - بيانات المدن
- `GET /api/districts` - بيانات المحافظات
- `POST /api/upload-excel` - رفع ملفات Excel

### الصفحات المتاحة:

- `/` - الصفحة الرئيسية (الخريطة التفاعلية)
- `/diseases_dashboard.html` - لوحة تحكم الأمراض

## الدعم

للحصول على المساعدة:
1. راجع سجلات Render
2. تحقق من وثائق [Render](https://render.com/docs)
3. تأكد من تحديث جميع التبعيات

## الأمان

- جميع APIs محمية بـ CORS
- الملفات الحساسة محمية
- استخدام HTTPS تلقائياً
- حماية من XSS و CSRF