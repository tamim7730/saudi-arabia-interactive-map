const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// إعداد multer لرفع الملفات
const upload = multer({ dest: 'uploads/' });

// خدمة الملفات الثابتة
app.use(express.static('.', {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    if (path.endsWith('.geojson')) {
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// API لحفظ بيانات الأمراض (بديل عن save_diseases_data.php)
app.post('/api/save-diseases-data', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة'
      });
    }

    // التأكد من وجود مجلد json
    await fs.ensureDir('json');
    
    // حفظ البيانات في الملف
    const filePath = path.join('json', 'diseases_data.json');
    await fs.writeJson(filePath, data, { spaces: 2, encoding: 'utf8' });
    
    res.json({
      success: true,
      message: 'تم حفظ البيانات بنجاح',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('خطأ في حفظ البيانات:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API لقراءة بيانات الأمراض
app.get('/api/diseases-data', async (req, res) => {
  try {
    const filePath = path.join('json', 'diseases_data.json');
    
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json({
        success: true,
        data: data
      });
    } else {
      res.json({
        success: true,
        data: {}
      });
    }
  } catch (error) {
    console.error('خطأ في قراءة البيانات:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API لرفع ملفات Excel
app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    // معالجة الملف هنا (يمكن إضافة مكتبة xlsx لقراءة Excel)
    res.json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      filename: req.file.originalname
    });
    
  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API للحصول على إحصائيات المناطق
app.get('/api/regions-stats', async (req, res) => {
  try {
    const filePath = path.join('json', 'regions_statistics.json');
    
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json({
        success: true,
        data: data
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('خطأ في قراءة الإحصائيات:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API للحصول على بيانات المناطق
app.get('/api/regions', async (req, res) => {
  try {
    const filePath = path.join('json', 'regions.json');
    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    console.error('خطأ في قراءة بيانات المناطق:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API للحصول على بيانات المدن
app.get('/api/cities', async (req, res) => {
  try {
    const filePath = path.join('json', 'cities.json');
    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    console.error('خطأ في قراءة بيانات المدن:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API للحصول على بيانات المحافظات
app.get('/api/districts', async (req, res) => {
  try {
    const filePath = path.join('json', 'districts.json');
    const data = await fs.readJson(filePath);
    res.json(data);
  } catch (error) {
    console.error('خطأ في قراءة بيانات المحافظات:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// صفحة الصحة للتحقق من حالة الخادم
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error('خطأ في الخادم:', err);
  res.status(500).json({
    success: false,
    message: 'خطأ داخلي في الخادم'
  });
});

// بدء الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log(`📊 لوحة التحكم: http://localhost:${PORT}/diseases_dashboard.html`);
});

// معالجة إغلاق الخادم بشكل صحيح
process.on('SIGTERM', () => {
  console.log('🛑 إيقاف الخادم...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 إيقاف الخادم...');
  process.exit(0);
});

module.exports = app;