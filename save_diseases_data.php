<?php
// ملف لحفظ بيانات الأمراض
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// التعامل مع طلبات OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // قراءة البيانات من الطلب
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data === null) {
            throw new Exception('بيانات غير صحيحة');
        }
        
        // مسار ملف البيانات
        $filePath = 'json/diseases_data.json';
        
        // التأكد من وجود مجلد json
        if (!is_dir('json')) {
            mkdir('json', 0755, true);
        }
        
        // حفظ البيانات في الملف
        $result = file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        if ($result === false) {
            throw new Exception('فشل في حفظ البيانات');
        }
        
        // إرسال رد نجح
        echo json_encode([
            'success' => true,
            'message' => 'تم حفظ البيانات بنجاح',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'طريقة الطلب غير مدعومة'
    ]);
}
?>