const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');

// تحديد متغيرات البيئة قبل تحميل الخادم
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;

// تحميل الخادم بعد تحديد متغيرات البيئة
const app = require('../server');

describe('اختبارات الخادم الأساسية', () => {
  beforeAll(async () => {
    // التأكد من وجود الملفات المطلوبة
    const jsonDir = path.join(__dirname, '../json');
    await fs.ensureDir(jsonDir);
    
    const testFiles = {
      'diseases_data.json': { diseases: [], lastUpdated: new Date().toISOString() },
      'regions_statistics.json': { regions: [] },
      'excel_data.json': { data: [], lastUpdated: new Date().toISOString() }
    };
    
    for (const [filename, content] of Object.entries(testFiles)) {
      const filePath = path.join(jsonDir, filename);
      if (!await fs.pathExists(filePath)) {
        await fs.writeJson(filePath, content);
      }
    }
  });

  describe('GET /health', () => {
    it('يجب أن يعيد حالة الخادم', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/diseases-data', () => {
    it('يجب أن يعيد بيانات الأمراض', async () => {
      const response = await request(app)
        .get('/api/diseases-data')
        .expect(200);
      
      expect(response.body).toHaveProperty('diseases');
      expect(Array.isArray(response.body.diseases)).toBe(true);
    });
  });

  describe('GET /api/system-stats', () => {
    it('يجب أن يعيد إحصائيات النظام', async () => {
      const response = await request(app)
        .get('/api/system-stats')
        .expect(200);
      
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('platform');
    });
  });

  describe('GET /api/files-check', () => {
    it('يجب أن يتحقق من وجود الملفات', async () => {
      const response = await request(app)
        .get('/api/files-check')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('files');
      expect(typeof response.body.files).toBe('object');
    });
  });

  describe('POST /api/save-diseases-data', () => {
    it('يجب أن يحفظ بيانات الأمراض', async () => {
      const testData = {
        diseases: [
          {
            id: 1,
            name: 'مرض تجريبي',
            region: 'الرياض',
            cases: 10
          }
        ]
      };

      const response = await request(app)
        .post('/api/save-diseases-data')
        .send(testData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('يجب أن يرفض البيانات غير الصحيحة', async () => {
      const invalidData = {
        invalidField: 'test'
      };

      await request(app)
        .post('/api/save-diseases-data')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('الملفات الثابتة', () => {
    it('يجب أن يخدم الصفحة الرئيسية', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('يجب أن يخدم ملفات CSS', async () => {
      const response = await request(app)
        .get('/style.css')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    it('يجب أن يخدم ملفات JavaScript', async () => {
      const response = await request(app)
        .get('/script.js')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });
  });

  describe('معالجة الأخطاء', () => {
    it('يجب أن يعيد 404 للمسارات غير الموجودة', async () => {
      await request(app)
        .get('/nonexistent-path')
        .expect(404);
    });
  });
});