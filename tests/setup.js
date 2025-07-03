// إعداد الاختبارات
const fs = require('fs-extra');
const path = require('path');

// إعداد متغيرات البيئة للاختبار
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.LOG_LEVEL = 'error';

// إنشاء مجلدات الاختبار إذا لم تكن موجودة
const testDirs = [
  path.join(__dirname, '../json'),
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../logs')
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// إنشاء ملفات JSON الأساسية للاختبار
const testData = {
  diseases_data: { diseases: [], lastUpdated: new Date().toISOString() },
  regions_statistics: { regions: [] },
  excel_data: { data: [], lastUpdated: new Date().toISOString() }
};

Object.keys(testData).forEach(filename => {
  const filePath = path.join(__dirname, '../json', `${filename}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(testData[filename], null, 2));
  }
});

// تنظيف بعد الاختبارات
process.on('exit', () => {
  // يمكن إضافة تنظيف إضافي هنا إذا لزم الأمر
});