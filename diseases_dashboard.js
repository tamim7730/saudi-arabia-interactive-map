// متغيرات عامة
let diseasesData = {};
let currentData = [];

// تحميل البيانات عند بدء الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadDiseasesData();
    setupEventListeners();
});

// تحميل بيانات الأمراض من ملف JSON
async function loadDiseasesData() {
    try {
        const response = await fetch('json/diseases_data.json');
        if (response.ok) {
            diseasesData = await response.json();
            displayData();
            console.log('تم تحميل بيانات الأمراض بنجاح');
        } else {
            console.log('لم يتم العثور على ملف البيانات، سيتم إنشاء بيانات جديدة');
            initializeEmptyData();
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        initializeEmptyData();
    }
}

// تهيئة بيانات فارغة
function initializeEmptyData() {
    diseasesData = {
        diseases: {},
        livestock_types: {
            cattle: { name_ar: "أبقار", name_en: "Cattle" },
            goats: { name_ar: "ماعز", name_en: "Goats" },
            sheep: { name_ar: "ضأن", name_en: "Sheep" },
            camels: { name_ar: "إبل", name_en: "Camels" },
            horses: { name_ar: "خيل", name_en: "Horses" }
        },
        regions_mapping: {
            "1": "منطقة الرياض",
            "2": "منطقة مكة المكرمة",
            "3": "منطقة المدينة المنورة",
            "4": "منطقة القصيم",
            "5": "المنطقة الشرقية",
            "6": "منطقة عسير",
            "7": "منطقة تبوك",
            "8": "منطقة حائل",
            "9": "منطقة الحدود الشمالية",
            "10": "منطقة جازان",
            "11": "منطقة نجران",
            "12": "منطقة الباحة",
            "13": "منطقة الجوف"
        }
    };
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // مستمع تغيير نوع المرض
    document.getElementById('disease-select').addEventListener('change', function() {
        const newDiseaseDiv = document.getElementById('new-disease-name');
        if (this.value === 'new_disease') {
            newDiseaseDiv.style.display = 'block';
        } else {
            newDiseaseDiv.style.display = 'none';
        }
    });
    
    // مستمع إرسال النموذج
    document.getElementById('disease-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveDiseaseData();
    });
}

// حفظ بيانات المرض
function saveDiseaseData() {
    const diseaseSelect = document.getElementById('disease-select').value;
    const diseaseNameAr = document.getElementById('disease-name-ar').value;
    const region = document.getElementById('region-select').value;
    
    // التحقق من البيانات المطلوبة
    if (!region) {
        alert('يرجى اختيار المنطقة');
        return;
    }
    
    let diseaseId;
    let diseaseName;
    
    if (diseaseSelect === 'new_disease') {
        if (!diseaseNameAr) {
            alert('يرجى إدخال اسم المرض');
            return;
        }
        diseaseId = diseaseNameAr.replace(/\s+/g, '_').toLowerCase();
        diseaseName = diseaseNameAr;
    } else if (diseaseSelect === 'rift_valley_fever') {
        diseaseId = 'rift_valley_fever';
        diseaseName = 'حمى الوادي المتصدع';
    } else {
        alert('يرجى اختيار المرض');
        return;
    }
    
    // جمع بيانات الثروة الحيوانية
    const livestockData = {
        cattle: parseInt(document.getElementById('cattle').value) || 0,
        goats: parseInt(document.getElementById('goats').value) || 0,
        sheep: parseInt(document.getElementById('sheep').value) || 0,
        camels: parseInt(document.getElementById('camels').value) || 0,
        horses: parseInt(document.getElementById('horses').value) || 0
    };
    
    const totalLivestock = Object.values(livestockData).reduce((sum, count) => sum + count, 0);
    const positiveFoci = parseInt(document.getElementById('positive-foci').value) || 0;
    const negativeFoci = parseInt(document.getElementById('negative-foci').value) || 0;
    
    // إنشاء أو تحديث بيانات المرض
    if (!diseasesData.diseases[diseaseId]) {
        diseasesData.diseases[diseaseId] = {
            id: diseaseId,
            name_ar: diseaseName,
            name_en: diseaseName, // يمكن تحسينه لاحقاً
            description: 'مرض حيواني',
            regions_data: {}
        };
    }
    
    // إضافة بيانات المنطقة
    diseasesData.diseases[diseaseId].regions_data[region] = {
        region_id: getRegionId(region),
        livestock_count: totalLivestock,
        livestock_details: livestockData,
        positive_foci: positiveFoci,
        negative_foci: negativeFoci,
        last_updated: new Date().toISOString().split('T')[0],
        surveillance_status: positiveFoci > 0 ? 'active' : 'monitoring'
    };
    
    // حفظ البيانات
    saveDataToFile();
    
    // إعادة تعيين النموذج
    document.getElementById('disease-form').reset();
    document.getElementById('new-disease-name').style.display = 'none';
    
    // تحديث العرض
    displayData();
    
    alert('تم حفظ البيانات بنجاح!');
}

// الحصول على معرف المنطقة
function getRegionId(regionName) {
    const regionMapping = {
        "منطقة الرياض": 1,
        "منطقة مكة المكرمة": 2,
        "منطقة المدينة المنورة": 3,
        "منطقة القصيم": 4,
        "المنطقة الشرقية": 5,
        "منطقة عسير": 6,
        "منطقة تبوك": 7,
        "منطقة حائل": 8,
        "منطقة الحدود الشمالية": 9,
        "منطقة جازان": 10,
        "منطقة نجران": 11,
        "منطقة الباحة": 12,
        "منطقة الجوف": 13
    };
    return regionMapping[regionName] || 0;
}

// عرض البيانات في الجدول
function displayData() {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = '';
    
    Object.values(diseasesData.diseases || {}).forEach(disease => {
        Object.entries(disease.regions_data || {}).forEach(([regionName, regionData]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${disease.name_ar}</td>
                <td>${regionName}</td>
                <td>${regionData.livestock_count}</td>
                <td>${regionData.positive_foci}</td>
                <td>${regionData.negative_foci}</td>
                <td class="${regionData.surveillance_status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${regionData.surveillance_status === 'active' ? 'نشط' : 'مراقبة'}
                </td>
                <td>
                    <button class="btn btn-primary" onclick="editData('${disease.id}', '${regionName}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteData('${disease.id}', '${regionName}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// تعديل البيانات
function editData(diseaseId, regionName) {
    const disease = diseasesData.diseases[diseaseId];
    const regionData = disease.regions_data[regionName];
    
    // ملء النموذج بالبيانات الحالية
    document.getElementById('disease-select').value = diseaseId;
    document.getElementById('region-select').value = regionName;
    document.getElementById('cattle').value = regionData.livestock_details.cattle;
    document.getElementById('goats').value = regionData.livestock_details.goats;
    document.getElementById('sheep').value = regionData.livestock_details.sheep;
    document.getElementById('camels').value = regionData.livestock_details.camels;
    document.getElementById('horses').value = regionData.livestock_details.horses;
    document.getElementById('positive-foci').value = regionData.positive_foci;
    document.getElementById('negative-foci').value = regionData.negative_foci;
    
    // التمرير إلى النموذج
    document.getElementById('disease-form').scrollIntoView({ behavior: 'smooth' });
}

// حذف البيانات
function deleteData(diseaseId, regionName) {
    if (confirm('هل أنت متأكد من حذف هذه البيانات؟')) {
        delete diseasesData.diseases[diseaseId].regions_data[regionName];
        
        // حذف المرض إذا لم تعد له بيانات مناطق
        if (Object.keys(diseasesData.diseases[diseaseId].regions_data).length === 0) {
            delete diseasesData.diseases[diseaseId];
        }
        
        saveDataToFile();
        displayData();
        alert('تم حذف البيانات بنجاح!');
    }
}

// حفظ البيانات في ملف
function saveDataToFile() {
    // حفظ في localStorage كنسخة احتياطية
    localStorage.setItem('diseasesData', JSON.stringify(diseasesData));
    
    // محاولة حفظ في ملف JSON (يتطلب خادم)
    fetch('/api/save-diseases-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(diseasesData)
    })
    .then(response => {
        if (response.ok) {
            console.log('تم حفظ البيانات بنجاح في الملف');
            // إشعار النافذة الرئيسية بتحديث البيانات
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'diseasesDataUpdated',
                    data: diseasesData
                }, '*');
            }
        } else {
            throw new Error('فشل في حفظ البيانات');
        }
    })
    .catch(error => {
        console.log('لا يمكن حفظ البيانات في الملف، تم الحفظ محلياً فقط:', error);
    });
}

// مزامنة مع Google Sheets
function syncWithGoogleSheets() {
    const sheetUrl = document.getElementById('google-sheet-url').value;
    if (!sheetUrl) {
        alert('يرجى إدخال رابط Google Sheet');
        return;
    }
    
    // هنا يمكن إضافة كود المزامنة مع Google Sheets API
    alert('ميزة المزامنة مع Google Sheets قيد التطوير');
}

// تصدير للـ API
function exportToAPI() {
    const apiEndpoint = document.getElementById('api-endpoint').value;
    if (!apiEndpoint) {
        alert('يرجى إدخال رابط API');
        return;
    }
    
    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(diseasesData)
    })
    .then(response => response.json())
    .then(data => {
        alert('تم تصدير البيانات بنجاح!');
    })
    .catch(error => {
        alert('خطأ في تصدير البيانات: ' + error.message);
    });
}

// استيراد من API
function importFromAPI() {
    const apiEndpoint = document.getElementById('api-endpoint').value;
    if (!apiEndpoint) {
        alert('يرجى إدخال رابط API');
        return;
    }
    
    fetch(apiEndpoint)
    .then(response => response.json())
    .then(data => {
        diseasesData = data;
        displayData();
        saveDataToFile();
        alert('تم استيراد البيانات بنجاح!');
    })
    .catch(error => {
        alert('خطأ في استيراد البيانات: ' + error.message);
    });
}

// تصدير البيانات كملف JSON
function exportAsJSON() {
    const dataStr = JSON.stringify(diseasesData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diseases_data.json';
    link.click();
    URL.revokeObjectURL(url);
}

// تصدير نموذج Excel فارغ
function exportExcelTemplate() {
    // إنشاء نموذج Excel مع الأعمدة المطلوبة
    const templateData = [
        [
            'المرض',
            'المنطقة', 
            'الأبقار',
            'الماعز',
            'الأغنام',
            'الإبل',
            'الخيول',
            'البؤر الإيجابية',
            'البؤر السلبية'
        ],
        [
            'مثال: الحمى القلاعية',
            'مثال: الرياض',
            '1000',
            '500',
            '2000',
            '100',
            '50',
            '5',
            '10'
        ]
    ];
    
    // إنشاء workbook جديد
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // تنسيق الخلايا
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // تنسيق الصف الأول (العناوين)
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({r: 0, c: col});
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "CCCCCC" } }
        };
    }
    
    // إضافة الورقة إلى الكتاب
    XLSX.utils.book_append_sheet(wb, ws, 'بيانات الأمراض');
    
    // تصدير الملف
    XLSX.writeFile(wb, 'نموذج_بيانات_الأمراض.xlsx');
}

// تحميل البيانات من localStorage عند عدم وجود ملف
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('diseasesData');
    if (savedData) {
        diseasesData = JSON.parse(savedData);
        displayData();
    }
}

// استدعاء تحميل البيانات المحلية إذا فشل تحميل الملف
window.addEventListener('load', function() {
    setTimeout(() => {
        if (Object.keys(diseasesData.diseases || {}).length === 0) {
            loadFromLocalStorage();
        }
    }, 1000);
});

// إضافة وظائف إضافية للتصدير والاستيراد
function addExportImportButtons() {
    const syncDiv = document.querySelector('.external-sync');
    const additionalButtons = document.createElement('div');
    additionalButtons.style.marginTop = '15px';
    additionalButtons.innerHTML = `
        <button class="btn btn-success" onclick="exportAsJSON()">
            <i class="fas fa-file-export"></i> تصدير كملف JSON
        </button>
        <button class="btn btn-info" onclick="exportExcelTemplate()">
            <i class="fas fa-file-excel"></i> تحميل نموذج Excel
        </button>
        <input type="file" id="import-file" accept=".json,.xlsx,.xls" style="display: none;" onchange="importFromFile(event)">
        <button class="btn btn-primary" onclick="document.getElementById('import-file').click()">
            <i class="fas fa-file-import"></i> استيراد من ملف
        </button>
    `;
    syncDiv.appendChild(additionalButtons);
}

// استيراد من ملف
function importFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.json')) {
            // قراءة ملف JSON
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    diseasesData = importedData;
                    displayData();
                    saveDataToFile();
                    alert('تم استيراد البيانات بنجاح!');
                } catch (error) {
                    alert('خطأ في قراءة ملف JSON: ' + error.message);
                }
            };
            reader.readAsText(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // قراءة ملف Excel
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // قراءة الورقة الأولى
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // تحويل إلى JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    // تحويل البيانات إلى تنسيق التطبيق
                    const convertedData = convertExcelToDiseasesData(jsonData);
                    
                    if (convertedData) {
                        diseasesData = convertedData;
                        displayData();
                        saveDataToFile();
                        alert('تم استيراد البيانات من ملف Excel بنجاح!');
                    } else {
                        alert('تنسيق ملف Excel غير صحيح. يرجى التأكد من وجود الأعمدة المطلوبة.');
                    }
                } catch (error) {
                    alert('خطأ في قراءة ملف Excel: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('نوع الملف غير مدعوم. يرجى اختيار ملف JSON أو Excel (.xlsx, .xls)');
        }
    }
}

// تحويل بيانات Excel إلى تنسيق التطبيق
function convertExcelToDiseasesData(excelData) {
    try {
        if (!excelData || excelData.length < 2) {
            return null;
        }
        
        // البحث عن الأعمدة المطلوبة في الصف الأول
        const headers = excelData[0];
        const diseaseCol = findColumnIndex(headers, ['المرض', 'Disease', 'disease']);
        const regionCol = findColumnIndex(headers, ['المنطقة', 'Region', 'region']);
        const cattleCol = findColumnIndex(headers, ['الأبقار', 'Cattle', 'cattle']);
        const goatsCol = findColumnIndex(headers, ['الماعز', 'Goats', 'goats']);
        const sheepCol = findColumnIndex(headers, ['الأغنام', 'Sheep', 'sheep']);
        const camelsCol = findColumnIndex(headers, ['الإبل', 'Camels', 'camels']);
        const horsesCol = findColumnIndex(headers, ['الخيول', 'Horses', 'horses']);
        const positiveFociCol = findColumnIndex(headers, ['البؤر الإيجابية', 'Positive Foci', 'positive_foci']);
        const negativeFociCol = findColumnIndex(headers, ['البؤر السلبية', 'Negative Foci', 'negative_foci']);
        
        if (diseaseCol === -1 || regionCol === -1) {
            alert('لم يتم العثور على أعمدة المرض والمنطقة المطلوبة في ملف Excel');
            return null;
        }
        
        const convertedData = {
            diseases: {},
            last_updated: new Date().toISOString()
        };
        
        // معالجة البيانات من الصف الثاني فما بعد
        for (let i = 1; i < excelData.length; i++) {
            const row = excelData[i];
            if (!row || row.length === 0) continue;
            
            const diseaseName = row[diseaseCol];
            const regionName = row[regionCol];
            
            if (!diseaseName || !regionName) continue;
            
            // إنشاء المرض إذا لم يكن موجوداً
            if (!convertedData.diseases[diseaseName]) {
                convertedData.diseases[diseaseName] = {
                    name: diseaseName,
                    regions_data: {}
                };
            }
            
            // إضافة بيانات المنطقة
            convertedData.diseases[diseaseName].regions_data[regionName] = {
                livestock_details: {
                    cattle: parseInt(row[cattleCol]) || 0,
                    goats: parseInt(row[goatsCol]) || 0,
                    sheep: parseInt(row[sheepCol]) || 0,
                    camels: parseInt(row[camelsCol]) || 0,
                    horses: parseInt(row[horsesCol]) || 0
                },
                positive_foci: parseInt(row[positiveFociCol]) || 0,
                negative_foci: parseInt(row[negativeFociCol]) || 0
            };
        }
        
        return convertedData;
    } catch (error) {
        console.error('خطأ في تحويل بيانات Excel:', error);
        return null;
    }
}

// البحث عن فهرس العمود بناءً على أسماء محتملة
function findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header && typeof header === 'string') {
            const normalizedHeader = header.trim().toLowerCase();
            for (const name of possibleNames) {
                if (normalizedHeader.includes(name.toLowerCase())) {
                    return i;
                }
            }
        }
    }
    return -1;
}

// إضافة الأزرار عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addExportImportButtons, 100);
});