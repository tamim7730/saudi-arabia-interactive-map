document.addEventListener('DOMContentLoaded', function () {
    // تحميل بيانات الأمراض وحفظها في localStorage
    fetch('./json/diseases_data.json')
        .then(response => response.json())
        .then(data => {
            localStorage.setItem('diseases_data_cache', JSON.stringify(data));
            console.log('تم تحميل بيانات الأمراض بنجاح');
        })
        .catch(error => {
            console.warn('خطأ في تحميل بيانات الأمراض:', error);
        });
    console.log('تم تحميل الصفحة، بدء تهيئة الخريطة...');
    
    // التحقق من وجود عنصر الخريطة
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('عنصر الخريطة غير موجود!');
        return;
    }
    
    console.log('عنصر الخريطة موجود، بدء إنشاء الخريطة...');
    
    let map;
     try {
         map = L.map('map').setView([24.7136, 46.6753], 6);
         console.log('تم إنشاء الخريطة بنجاح');
         
         L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
         }).addTo(map);
         console.log('تم إضافة طبقة الخريطة الأساسية');
      } catch (error) {
          console.error('خطأ في إنشاء الخريطة:', error);
          return;
      }

    const layers = {};
    window.layers = layers; // جعل المتغير متاحاً عالمياً
    let regionsLayerRef = null; // مرجع لطبقة المناطق للاستخدام في العرض الكامل
    const baseLayers = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    };
    const layerControl = L.control.layers(baseLayers, {}, { 
        collapsed: true, 
        position: 'topright',
        sortLayers: false
    }).addTo(map);

    async function fetchJSON(url) {
        console.log(`بدء تحميل: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`تم تحميل ${url} بنجاح`);
            return data;
        } catch (error) {
            console.error(`خطأ في تحميل ${url}:`, error);
            throw error;
        }
    }

    function createGeoJsonLayer(data, style, onEachFeature) {
        return L.geoJSON(data, { style, onEachFeature });
    }

    console.log('بدء تحميل جميع ملفات البيانات...');
    
    Promise.all([
        fetchJSON('geojson/regions.geojson'),
        fetchJSON('json/regions_lite.json'),
        fetchJSON('json/cities.json'),
        fetchJSON('geojson/cities.geojson'),
        fetchJSON('geojson/districts.geojson'),
        fetchJSON('geojson/governorates.geojson'),
        fetchJSON('geojson/governorates.json')
    ]).then(([regionsData, regionsLiteData, citiesData, citiesGeoData, districtsGeoData, governoratesGeo, governoratesData]) => {
        console.log('تم تحميل جميع ملفات البيانات بنجاح، بدء إنشاء الطبقات...');
        
        // Regions Layer
        const cityCenters = citiesData.reduce((acc, city) => {
            acc[city.city_id] = city.center;
            return acc;
        }, {});

        const regionPins = [];
        const regionsLayer = createGeoJsonLayer(regionsData,
            (feature) => ({ 
                fillColor: feature.properties.color || '#09764c', 
                color: '#ffffff', 
                weight: 2, 
                opacity: 1, 
                fillOpacity: 0.5 
            }),
            (feature, layer) => {
                const regionLite = regionsLiteData.find(r => r.region_id === feature.properties.region_id);
                const capitalCityId = regionLite ? regionLite.capital_city_id : null;
                const center = capitalCityId ? cityCenters[capitalCityId] : null;

                // إنشاء محتوى النافذة المنبثقة مع بيانات الأمراض
                const popupContent = createRegionPopupContent(feature.properties);
                layer.bindPopup(popupContent, { maxWidth: 400, className: 'region-popup' });
                layers[feature.properties.name_ar] = layer;

                layer.on({
                    click: function (e) {
                        map.fitBounds(e.target.getBounds());
                        // إظهار النافذة المنبثقة مباشرة
                        const regionName = feature.properties.name_ar;
                        const regionNameEn = feature.properties.name_en;
                        const population = feature.properties.population || 'غير متوفر';
                        showFullscreenPopup(regionName, regionNameEn, population);
                    }
                });

                if (center) {
                    const pin = L.marker(center, {
                        icon: L.divIcon({
                            className: 'region-label',
                            html: `<div>${feature.properties.name_ar}</div>`,
                            iconSize: [100, 40]
                        })
                    }).addTo(map);
                    regionPins.push(pin);
                }
            }
        );
        regionsLayer.addTo(map);
        regionsLayerRef = regionsLayer; // حفظ مرجع لطبقة المناطق
        layerControl.addOverlay(regionsLayer, 'المناطق');
        console.log('تم إضافة طبقة المناطق إلى الخريطة');
        console.log('تم إنشاء طبقة المناطق بنجاح');
        
        // ضبط الخريطة لتظهر المملكة العربية السعودية بالكامل
        map.fitBounds(regionsLayer.getBounds(), {
            padding: [20, 20] // إضافة مساحة حول الحدود
        });
        console.log('تم ضبط الخريطة لتظهر المملكة بالكامل');
        




        // Cities Layer
        const citiesLayer = createGeoJsonLayer(citiesGeoData,
            () => ({ color: '#e74c3c', weight: 2 }),
            (feature, layer) => {
                layer.bindPopup(`<h3>${feature.properties.name_ar}</h3><b>Name:</b> ${feature.properties.name_en}`);
                layers[feature.properties.name_ar] = layer;
            }
        );
        // لا نضيف طبقة المدن افتراضياً
        layerControl.addOverlay(citiesLayer, 'المدن');
        console.log('تم إعداد طبقة المدن (غير مفعلة افتراضياً)');





        // Districts Layer
        const districtsLayer = createGeoJsonLayer(districtsGeoData,
            () => ({ fillColor: '#2ecc71', color: '#27ae60', weight: 1, opacity: 1, fillOpacity: 0.7 }),
            (feature, layer) => {
                layer.bindPopup(`<h4>${feature.properties.name_ar}</h4><b>Name:</b> ${feature.properties.name_en}<br><b>المدينة:</b> ${feature.properties.city_name_ar}<br><b>المنطقة:</b> ${feature.properties.region_name_ar}`);
                layers[feature.properties.name_ar] = layer;
            }
        );
        // لا نضيف طبقة الأحياء افتراضياً
        layerControl.addOverlay(districtsLayer, 'الأحياء');

        // Governorates Layer
        const governoratesLayer = createGeoJsonLayer(governoratesGeo,
            (feature) => {
                const regionName = feature.properties.region_name_ar;
                const governorateName = feature.properties.name_ar;
                if (governoratesData[regionName] && governoratesData[regionName].includes(governorateName)) {
                    return { fillColor: '#d4b996', color: '#a05d56', weight: 1, opacity: 1, fillOpacity: 0.7 };
                } else {
                    return { fillColor: '#fff', color: '#ccc', weight: 1, opacity: 1, fillOpacity: 0.5 };
                }
            },
            (feature, layer) => {
                layer.bindPopup(`<h4>محافظة ${feature.properties.name_ar}</h4><b>Name:</b> ${feature.properties.name_en}<br><b>المنطقة:</b> ${feature.properties.region_name_ar}`);
                layers[`محافظة ${feature.properties.name_ar}`] = layer;


            }
        );
        // لا نضيف طبقة المحافظات افتراضياً
        layerControl.addOverlay(governoratesLayer, 'المحافظات');






        
        // حفظ مراجع الطبقات للتحكم في الألوان
        window.saveLayerReferences(regionsLayer, citiesLayer, districtsLayer, governoratesLayer);
        
        console.log('تم تحميل الخريطة التفاعلية بنجاح! 🎉');
        console.log('جميع الطبقات متاحة والخريطة جاهزة للاستخدام.');
        console.log('تم حفظ مراجع الطبقات للتحكم في الألوان');



    }).catch(error => console.error('Error loading data:', error));

    // متغيرات للبحث التفاعلي
    let currentSearchResults = [];
    window.currentSearchResults = currentSearchResults; // جعل المتغير متاحاً عالمياً
    let currentSearchIndex = -1;
    
    // إنشاء قائمة الاقتراحات
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'search-suggestions';
    suggestionsContainer.className = 'search-suggestions';
    document.querySelector('.search-container').appendChild(suggestionsContainer);
    
    // وظيفة البحث التفاعلي
    function performSearch(searchTerm) {
        if (!searchTerm.trim()) {
            suggestionsContainer.style.display = 'none';
            currentSearchResults = [];
            window.currentSearchResults = currentSearchResults;
            return;
        }
        
        // البحث في جميع الطبقات
        const results = Object.keys(layers).filter(name => 
            name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        currentSearchResults = results;
        window.currentSearchResults = currentSearchResults; // تحديث المتغير العالمي
        displaySuggestions(results);
    }
    
    // عرض الاقتراحات
    function displaySuggestions(results) {
        suggestionsContainer.innerHTML = '';
        
        if (results.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        results.slice(0, 8).forEach((result, index) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.textContent = result;
            suggestion.addEventListener('click', () => selectLocation(result));
            suggestionsContainer.appendChild(suggestion);
        });
        
        suggestionsContainer.style.display = 'block';
    }
    
    // اختيار موقع من الاقتراحات
    function selectLocation(locationName) {
        const layer = layers[locationName];
        if (layer) {
            map.fitBounds(layer.getBounds());
            layer.openPopup();
            document.getElementById('search-input').value = locationName;
            suggestionsContainer.style.display = 'none';
        }
    }
    
    // إضافة مستمع للبحث أثناء الكتابة
    document.getElementById('search-input').addEventListener('input', function(e) {
        performSearch(e.target.value);
    });
    
    // إضافة مستمع للتنقل بالأسهم
    document.getElementById('search-input').addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSearchIndex = Math.min(currentSearchIndex + 1, suggestions.length - 1);
            updateSelectedSuggestion(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSearchIndex = Math.max(currentSearchIndex - 1, -1);
            updateSelectedSuggestion(suggestions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSearchIndex >= 0 && suggestions[currentSearchIndex]) {
                selectLocation(suggestions[currentSearchIndex].textContent);
            } else {
                // البحث المباشر
                const searchTerm = e.target.value;
                const layer = layers[searchTerm];
                if (layer) {
                    selectLocation(searchTerm);
                } else if (currentSearchResults.length > 0) {
                    selectLocation(currentSearchResults[0]);
                }
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.style.display = 'none';
            currentSearchIndex = -1;
        }
    });
    
    // تحديث الاقتراح المحدد
    function updateSelectedSuggestion(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('selected', index === currentSearchIndex);
        });
    }
    
    // إغلاق الاقتراحات عند النقر خارجها
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            suggestionsContainer.style.display = 'none';
            currentSearchIndex = -1;
        }
    });
    
    // الاحتفاظ بوظيفة زر البحث الأصلية
    document.getElementById('search-button').addEventListener('click', function () {
        const searchTerm = document.getElementById('search-input').value;
        const layer = layers[searchTerm];
        if (layer) {
            selectLocation(searchTerm);
        } else if (currentSearchResults.length > 0) {
            selectLocation(currentSearchResults[0]);
        } else {
            alert('الموقع غير موجود');
        }
    });
    
    // متغير عالمي لطبقة المناطق
    let globalRegionsLayer = null;
    
    // إضافة وظيفة زر العرض الكامل
    document.getElementById('reset-view-button').addEventListener('click', function () {
        // العودة للعرض الكامل للمملكة العربية السعودية
        if (globalRegionsLayer) {
            map.fitBounds(globalRegionsLayer.getBounds(), {
                padding: [20, 20]
            });
            console.log('تم إعادة ضبط الخريطة للعرض الكامل');
        } else {
            console.log('طبقة المناطق غير متاحة بعد');
        }
    });
    
    // متغيرات للتحكم في ألوان الخريطة
    let currentTileLayer = null;
    window.regionsLayerRef = null;
    window.citiesLayerRef = null;
    window.districtsLayerRef = null;
    window.governoratesLayerRef = null;
    
    // متغيرات الأحزمة الوبائية
    let currentEpidemicBelt = null;
    const epidemicBelts = {
        red: {
            regions: ['جازان'],
            governorates: ['الطوال', 'الحرث', 'العارضة', 'فيفا', 'الدائر', 'العيدابي', 'الريث'],
            color: '#e74c3c',
            name: 'الحزام الأحمر',
            description: 'حزام السيطرة على المرض ومنع انتشاره إلى بقية مناطق المملكة ويتميز بارتفاع مخاطر الإصابة بالمرض. يشمل سبع محافظات في منطقة جازان بعضها حدودية مع دولة اليمن ويتم فيه تطبيق إجراءات المكافحة والسيطرة بصورة مكثفة.',
            regionCount: 1
        },
        orange: {
            regions: ['جازان', 'عسير', 'مكة المكرمة'],
            governorates: {
                'جازان': ['جيزان', 'ضمد', 'صبيا', 'هروب', 'بيش', 'الدرب', 'أبو عريش', 'أحد المسارحة'],
                'عسير': ['محايل عسير', 'رجال ألمع', 'المجاردة', 'الحريضة', 'قناة والبحر', 'السعيدة', 'تهامة أبها'],
                'مكة المكرمة': ['القنفذة']
            },
            color: '#f39c12',
            name: 'الحزام البرتقالي',
            description: 'محافظات قد سبق أن سُجلت الإصابة فيها تاريخياً منذ الاندلاعة الأولى في 1421هـ وهي محافظات مجاورة لمحافظات الحزام الأحمر وليست لها حدود برية مع أي دولة. مخاطر الإصابة بالمرض أقل من الحزام الأحمر ويمكن اعتباره كحاجز مناعي بين الحزام الأحمر والأصفر.',
            regionCount: 3
        },
        yellow: {
            regions: ['مكة المكرمة', 'عسير', 'نجران', 'الباحة'],
            governorates: {
                'مكة المكرمة': ['الليث', 'العرضيات'],
                'عسير': ['العرضيات', 'النماص', 'تنومة', 'خميس مشيط', 'أحد رفيدة', 'أبها', 'سراة عبيدة', 'ظهران الجنوب'],
                'الباحة': ['المخواة', 'قلوة'],
                'نجران': ['جميع محافظات المنطقة']
            },
            color: '#f1c40f',
            name: 'الحزام الأصفر',
            description: 'حزام مراقبة وبائية، حيث لم يسبق أن سُجلت الإصابة فيها تاريخياً منذ الاندلاعة الأولى في 1421هـ وتوجد لها حدود برية مع محافظات الحزام البرتقالي.',
            regionCount: 4
        },
        green: {
            regions: ['الرياض', 'المنطقة الشرقية', 'القصيم', 'حائل', 'تبوك', 'الحدود الشمالية', 'الجوف', 'المدينة المنورة'],
            color: '#27ae60',
            name: 'الحزام الأخضر',
            description: 'حزام خال من المرض السريري والعدوى معاً، ويشمل جميع مناطق المملكة عدا المناطق المذكورة في الأحزمة السابقة، ولا يتطلب إجراء أية عمليات فيه سوى المراقبة والتي يتم إجراؤها عن طريق التقصي الوبائي الدوري كل عامين.',
            regionCount: 8
        }
    };
    
    // حفظ مراجع الطبقات
    window.saveLayerReferences = function(regions, cities, districts, governorates) {
        window.regionsLayerRef = regions;
        window.citiesLayerRef = cities;
        window.districtsLayerRef = districts;
        window.governoratesLayerRef = governorates;
        globalRegionsLayer = regions; // حفظ مرجع عالمي لطبقة المناطق
    };
    
    // ألوان مختلفة للطبقات
    const colorSchemes = {
        regions: {
            blue: { fillColor: '#09764c', color: '#ffffff' },
            green: { fillColor: '#2ecc71', color: '#27ae60' },
            purple: { fillColor: '#9b59b6', color: '#8e44ad' },
            orange: { fillColor: '#e67e22', color: '#d35400' }
        },
        cities: {
            red: { color: '#e74c3c', weight: 2 },
            teal: { color: '#1abc9c', weight: 2 },
            yellow: { color: '#f1c40f', weight: 2 },
            pink: { color: '#e91e63', weight: 2 }
        },
        districts: {
            emerald: { fillColor: '#2ecc71', color: '#27ae60' },
            cyan: { fillColor: '#00bcd4', color: '#00acc1' },
            lime: { fillColor: '#8bc34a', color: '#689f38' },
            indigo: { fillColor: '#3f51b5', color: '#303f9f' }
        },
        governorates: {
            brown: { fillColor: '#d4b996', color: '#a05d56' },
            slate: { fillColor: '#64748b', color: '#475569' },
            amber: { fillColor: '#f59e0b', color: '#d97706' },
            rose: { fillColor: '#f43f5e', color: '#e11d48' }
        }
    };
    
    // خرائط الخلفية المختلفة
    const mapStyles = {
        light: {
            url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
    };
    
    // وظيفة تغيير نمط الخريطة
    function changeMapStyle(style) {
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }
        
        const styleConfig = mapStyles[style];
        currentTileLayer = L.tileLayer(styleConfig.url, {
            attribution: styleConfig.attribution,
            maxZoom: 19
        }).addTo(map);
        
        // تحديث الأزرار النشطة
        document.querySelectorAll('[data-map-style]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-map-style="${style}"]`).classList.add('active');
        
        console.log(`تم تغيير نمط الخريطة إلى: ${style}`);
    }
    
    // وظيفة تغيير ألوان الطبقات
    function changeLayerColors(layerType, colorScheme) {
        const colors = colorSchemes[layerType][colorScheme];
        let targetLayer = null;
        
        switch(layerType) {
            case 'regions':
                targetLayer = window.regionsLayerRef;
                break;
            case 'cities':
                targetLayer = window.citiesLayerRef;
                break;
            case 'districts':
                targetLayer = window.districtsLayerRef;
                break;
            case 'governorates':
                targetLayer = window.governoratesLayerRef;
                break;
        }
        
        if (targetLayer) {
            targetLayer.eachLayer(function(layer) {
                const newStyle = {
                    ...colors,
                    weight: colors.weight || 1,
                    opacity: 1,
                    fillOpacity: layerType === 'cities' ? 0 : 0.7
                };
                layer.setStyle(newStyle);
                // حفظ النمط كنمط دائم
                layer._permanentStyle = newStyle;
            });
            
            // تحديث الأزرار النشطة
            document.querySelectorAll(`[data-${layerType.slice(0, -1)}-color]`).forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-${layerType.slice(0, -1)}-color="${colorScheme}"]`).classList.add('active');
            
            console.log(`تم تغيير ألوان ${layerType} إلى: ${colorScheme}`);
        }
    }
    
    // وظائف الأحزمة الوبائية المحسنة
    function showEpidemicBelt(beltType) {
        if (!window.regionsLayerRef) {
            console.log('طبقة المناطق غير متاحة بعد');
            return;
        }
        
        const belt = epidemicBelts[beltType];
        if (!belt) {
            console.log('نوع الحزام غير صحيح');
            return;
        }

        // إخفاء الحزام الحالي أولاً
        clearEpidemicBelts();
        
        let affectedRegions = [];
        let totalRegionsInBelt = 0;
        
        // تطبيق ألوان الحزام الجديد مع تأثيرات بصرية محسنة
        window.regionsLayerRef.eachLayer(function(layer) {
            const regionName = layer.feature.properties.name_ar;
            
            if (belt.regions.includes(regionName)) {
                totalRegionsInBelt++;
                
                // تأثير بصري مميز للمناطق الرئيسية في كل حزام
                let isMainRegion = false;
                let beltStyle;
                
                // تحديد المناطق الرئيسية لكل حزام
                if ((beltType === 'red' && regionName === 'جازان') ||
                    (beltType === 'green' && regionName === 'المنطقة الشرقية') ||
                    (beltType === 'orange' && regionName === 'جازان') ||
                    (beltType === 'yellow' && regionName === 'عسير')) {
                    isMainRegion = true;
                }
                
                if (isMainRegion) {
                    // تأثير بصري قوي للمناطق الرئيسية
                    beltStyle = {
                        fillColor: belt.color,
                        color: '#ffffff',
                        weight: 6,
                        opacity: 1,
                        fillOpacity: 0.95,
                        dashArray: '10, 5',
                        className: 'main-region-highlight'
                    };
                } else {
                    // تأثير بصري عادي للمناطق الأخرى في نفس الحزام
                    beltStyle = {
                        fillColor: belt.color,
                        color: '#ffffff',
                        weight: 4,
                        opacity: 1,
                        fillOpacity: 0.85,
                        dashArray: '5, 5'
                    };
                }
                
                layer.setStyle(beltStyle);
                layer._epidemicBeltStyle = beltStyle;
                layer._isMainRegion = isMainRegion;
                layer._beltType = beltType;
                affectedRegions.push(regionName);
                
                // إضافة تأثير نبضة للمناطق المتأثرة
                layer.on('mouseover', function() {
                    if (this._isMainRegion) {
                        this.setStyle({
                            fillOpacity: 1.0,
                            weight: 8,
                            dashArray: '15, 3'
                        });
                    } else {
                        this.setStyle({
                            fillOpacity: 0.95,
                            weight: 5
                        });
                    }
                });
                
                layer.on('mouseout', function() {
                    this.setStyle(beltStyle);
                });
                
            } else {
                // إظهار المناطق غير المختارة بشفافية منخفضة
                const neutralStyle = {
                    fillColor: '#cccccc',
                    color: '#999999',
                    weight: 1,
                    opacity: 0.3,
                    fillOpacity: 0.1
                };
                layer.setStyle(neutralStyle);
                layer._epidemicBeltStyle = neutralStyle;
                
                // إزالة أحداث التمرير للمناطق غير المتأثرة
                layer.off('mouseover mouseout');
            }
        });
        
        currentEpidemicBelt = beltType;
        
        // التحقق من عدد المناطق المعروضة
        if (totalRegionsInBelt !== belt.regionCount) {
            console.warn(`تحذير: عدد المناطق المعروضة (${totalRegionsInBelt}) لا يطابق العدد المتوقع (${belt.regionCount}) للحزام ${belt.name}`);
        }
        
        // عرض معلومات الحزام
        showBeltInfo(belt, beltType);
        
        console.log(`تم عرض ${belt.name} - المناطق المتأثرة: ${affectedRegions.join(', ')} (${totalRegionsInBelt}/${belt.regionCount})`);
    }
    
    function clearEpidemicBelts() {
        if (!window.regionsLayerRef) return;
        
        // إعادة تعيين جميع المناطق للألوان الافتراضية
        window.regionsLayerRef.eachLayer(function(layer) {
            // إزالة جميع أحداث التمرير المضافة
            layer.off('mouseover mouseout');
            
            if (layer._permanentStyle) {
                layer.setStyle(layer._permanentStyle);
            } else if (layer._originalStyle) {
                layer.setStyle(layer._originalStyle);
            } else {
                // الألوان الافتراضية الأصلية
                const defaultStyle = {
                    fillColor: layer.feature.properties.color || '#09764c',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.5,
                    dashArray: null
                };
                layer.setStyle(defaultStyle);
            }
            delete layer._epidemicBeltStyle;
        });
        
        currentEpidemicBelt = null;
        
        // إخفاء معلومات الحزام
        hideBeltInfo();
        
        console.log('تم إخفاء جميع الأحزمة الوبائية وإعادة تعيين التفاعلات');
    }
    
    // وظائف مساعدة للأحزمة الوبائية
    function showBeltInfo(belt, beltType) {
        // إنشاء أو تحديث عنصر معلومات الحزام
        let infoElement = document.getElementById('belt-info');
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'belt-info';
            infoElement.className = 'belt-info-panel';
            document.body.appendChild(infoElement);
        }
        
        let governoratesHtml = '';
        if (belt.governorates) {
            governoratesHtml = '<h4>المحافظات المشمولة:</h4>';
            
            if (Array.isArray(belt.governorates)) {
                // للحزام الأحمر - قائمة بسيطة
                governoratesHtml += '<ul>' + belt.governorates.map(gov => `<li>${gov}</li>`).join('') + '</ul>';
            } else {
                // للأحزمة الأخرى - مجموعة حسب المنطقة
                Object.keys(belt.governorates).forEach(region => {
                    governoratesHtml += `
                        <div style="margin-bottom: 15px;">
                            <h5 style="color: ${belt.color}; margin-bottom: 5px;">منطقة ${region}:</h5>
                            <ul style="margin-left: 20px;">
                                ${belt.governorates[region].map(gov => `<li>${gov}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                });
            }
        }
        
        infoElement.innerHTML = `
            <div class="belt-info-header">
                <h4>${belt.name}</h4>
                <button onclick="hideBeltInfo()" class="close-info-btn">×</button>
            </div>
            <div class="belt-info-content">
                <p><strong>الوصف:</strong> ${belt.description}</p>
                <p><strong>المناطق المتأثرة:</strong></p>
                <ul>
                    ${belt.regions.map(region => `<li>${region}</li>`).join('')}
                </ul>
                ${governoratesHtml}
                <p><strong>عدد المناطق:</strong> ${belt.regionCount || belt.regions.length}</p>
            </div>
        `;
        
        infoElement.style.display = 'block';
        
        // إضافة تأثير الظهور
        setTimeout(() => {
            infoElement.classList.add('show');
        }, 100);
    }
    
    function hideBeltInfo() {
        const infoElement = document.getElementById('belt-info');
        if (infoElement) {
            infoElement.classList.remove('show');
            setTimeout(() => {
                infoElement.style.display = 'none';
            }, 300);
        }
    }
    
    // وظيفة تطبيق لون مخصص
    function applyCustomColor(layerType, fillColor, borderColor = null) {
        let targetLayer = null;
        
        switch(layerType) {
            case 'regions':
                targetLayer = window.regionsLayerRef;
                break;
            case 'cities':
                targetLayer = window.citiesLayerRef;
                break;
            case 'districts':
                targetLayer = window.districtsLayerRef;
                break;
            case 'governorates':
                targetLayer = window.governoratesLayerRef;
                break;
        }
        
        if (targetLayer) {
            // إنشاء لون الحدود تلقائياً إذا لم يتم تحديده
            if (!borderColor) {
                borderColor = darkenColor(fillColor, 20);
            }
            
            targetLayer.eachLayer(function(layer) {
                const autoGeneratedBorderColor = borderColor || darkenColor(fillColor);
                const newStyle = {
                    fillColor: fillColor,
                    color: autoGeneratedBorderColor,
                    weight: 2,
                    opacity: 1,
                    fillOpacity: layerType === 'cities' ? 0 : 0.7
                };
                layer.setStyle(newStyle);
                // حفظ النمط كنمط دائم
                layer._permanentStyle = newStyle;
            });
            
            // إزالة التحديد من الأزرار المحددة مسبقاً
            document.querySelectorAll(`[data-${layerType.slice(0, -1)}-color]`).forEach(btn => {
                btn.classList.remove('active');
            });
            
            console.log(`تم تطبيق لون مخصص على ${layerType}: ${fillColor}`);
        }
    }
    
    // وظيفة لتغميق اللون
    function darkenColor(color, percent = 20) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    // وظيفة إعادة تعيين الألوان الافتراضية
    window.resetToDefaultColors = function() {
        // إعادة تعيين نمط الخريطة
        changeMapStyle('light');
        
        // إعادة تعيين ألوان المناطق
        if (window.regionsLayerRef) {
            window.regionsLayerRef.eachLayer(function(layer) {
                const feature = layer.feature;
                const defaultStyle = {
                    fillColor: feature.properties.color || '#09764c',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.7
                };
                layer.setStyle(defaultStyle);
                // حفظ النمط الافتراضي كنمط دائم
                layer._permanentStyle = defaultStyle;
                // إزالة أي نمط حزام وبائي
                delete layer._epidemicBeltStyle;
            });
        }
        
        // إعادة تعيين ألوان المدن
        if (window.citiesLayerRef) {
            window.citiesLayerRef.eachLayer(function(layer) {
                const defaultStyle = {
                    color: '#e74c3c',
                    weight: 2
                };
                layer.setStyle(defaultStyle);
                layer._permanentStyle = defaultStyle;
            });
        }
        
        // إعادة تعيين ألوان الأحياء
        if (window.districtsLayerRef) {
            window.districtsLayerRef.eachLayer(function(layer) {
                const defaultStyle = {
                    fillColor: '#2ecc71',
                    color: '#27ae60',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                };
                layer.setStyle(defaultStyle);
                layer._permanentStyle = defaultStyle;
            });
        }
        
        // إعادة تعيين ألوان المحافظات
        if (window.governoratesLayerRef) {
            window.governoratesLayerRef.eachLayer(function(layer) {
                const feature = layer.feature;
                const regionName = feature.properties.region_name_ar;
                const governorateName = feature.properties.name_ar;
                let defaultStyle;
                if (governoratesData[regionName] && governoratesData[regionName].includes(governorateName)) {
                    defaultStyle = {
                        fillColor: '#d4b996',
                        color: '#a05d56',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.7
                    };
                } else {
                    defaultStyle = {
                        fillColor: '#fff',
                        color: '#ccc',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.5
                    };
                }
                layer.setStyle(defaultStyle);
                layer._permanentStyle = defaultStyle;
            });
        }
        
        // إزالة الأحزمة الوبائية
        clearEpidemicBelts();
        
        // إزالة الفئات النشطة من جميع الأزرار
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        console.log('تم إعادة تعيين جميع الألوان إلى الافتراضية');
    }
    
    // إعداد أحداث لوحة التحكم في الألوان
    document.getElementById('color-control-button').addEventListener('click', function() {
        document.getElementById('color-control-panel').classList.add('active');
    });
    
    document.getElementById('close-color-panel').addEventListener('click', function() {
        document.getElementById('color-control-panel').classList.remove('active');
    });
    
    // إغلاق اللوحة عند النقر خارجها
    document.getElementById('color-control-panel').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
    
    // أحداث تغيير نمط الخريطة
    document.querySelectorAll('[data-map-style]').forEach(button => {
        button.addEventListener('click', function() {
            const style = this.getAttribute('data-map-style');
            changeMapStyle(style);
        });
    });
    
    // أحداث تغيير ألوان المناطق
    document.querySelectorAll('[data-region-color]').forEach(button => {
        button.addEventListener('click', function() {
            const color = this.getAttribute('data-region-color');
            changeLayerColors('regions', color);
        });
    });
    
    // أحداث تغيير ألوان المدن
    document.querySelectorAll('[data-city-color]').forEach(button => {
        button.addEventListener('click', function() {
            const color = this.getAttribute('data-city-color');
            changeLayerColors('cities', color);
        });
    });
    
    // أحداث تغيير ألوان الأحياء
    document.querySelectorAll('[data-district-color]').forEach(button => {
        button.addEventListener('click', function() {
            const color = this.getAttribute('data-district-color');
            changeLayerColors('districts', color);
        });
    });
    
    // حدث إعادة تعيين الألوان
    document.getElementById('reset-colors-btn').addEventListener('click', function() {
        resetToDefaultColors();
    });
    
    // أحداث اللون المخصص للمناطق
    const customColorInput = document.getElementById('custom-region-color');
    const customColorText = document.getElementById('custom-region-color-text');
    const applyCustomColorBtn = document.getElementById('apply-custom-region-color');
    
    // تحديث النص عند تغيير اللون من المنتقي
    customColorInput.addEventListener('input', function() {
        customColorText.value = this.value.toUpperCase();
    });
    
    // تحديث المنتقي عند تغيير النص
    customColorText.addEventListener('input', function() {
        let colorValue = this.value;
        if (colorValue.startsWith('#') && colorValue.length === 7) {
            customColorInput.value = colorValue;
        }
    });
    
    // تطبيق اللون المخصص
    applyCustomColorBtn.addEventListener('click', function() {
        const colorValue = customColorText.value || customColorInput.value;
        if (isValidColor(colorValue)) {
            applyCustomColor('regions', colorValue);
        } else {
            alert('يرجى إدخال كود لون صحيح (مثل: #09764c)');
        }
    });
    
    // تطبيق اللون عند الضغط على Enter
    customColorText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyCustomColorBtn.click();
        }
    });
    
    // وظيفة للتحقق من صحة كود اللون
    function isValidColor(color) {
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexPattern.test(color);
    }
    
    // حفظ الطبقة الحالية للخريطة
    currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    });
    
    // أحداث الأحزمة الوبائية المحسنة
    document.getElementById('epidemic-belts-button').addEventListener('click', function() {
        document.getElementById('epidemic-belts-panel').classList.add('active');
    });
    
    document.getElementById('close-epidemic-belts-panel').addEventListener('click', function() {
        document.getElementById('epidemic-belts-panel').classList.remove('active');
        // إخفاء معلومات الحزام عند إغلاق اللوحة
        hideBeltInfo();
    });
    
    // إغلاق لوحة الأحزمة عند النقر خارجها
    document.getElementById('epidemic-belts-panel').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            hideBeltInfo();
        }
    });
    
    // أحداث أزرار الأحزمة الوبائية المحسنة
    document.querySelectorAll('.belt-button').forEach(button => {
        button.addEventListener('click', function() {
            const beltType = this.getAttribute('data-belt');
            
            // التحقق من حالة الزر الحالية
            const isActive = this.classList.contains('active');
            
            if (isActive) {
                // إذا كان الزر نشطاً، قم بإلغاء تفعيل الحزام
                clearEpidemicBelts();
                document.querySelectorAll('.belt-button').forEach(btn => {
                    btn.classList.remove('active');
                });
            } else {
                // تفعيل الحزام الجديد
                showEpidemicBelt(beltType);
                
                // تحديث حالة الأزرار
                document.querySelectorAll('.belt-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
        
        // إضافة تأثيرات بصرية للتفاعل
        button.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            }
        });
    });
    
    // حدث زر إخفاء جميع الأحزمة المحسن
    document.getElementById('clear-belts-button').addEventListener('click', function() {
        clearEpidemicBelts();
        
        // إزالة التحديد من جميع الأزرار مع تأثير بصري
        document.querySelectorAll('.belt-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '';
        });
        
        // تأثير بصري لزر المسح
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
    
    // إضافة معالج للنقر خارج لوحة معلومات الحزام لإغلاقها
    document.addEventListener('click', function(e) {
        const beltInfo = document.getElementById('belt-info');
        const epidemicPanel = document.getElementById('epidemic-belts-panel');
        
        if (beltInfo && beltInfo.style.display === 'block') {
            if (!beltInfo.contains(e.target) && !epidemicPanel.contains(e.target)) {
                hideBeltInfo();
            }
        }
    });
    
    // تعيين الزر الافتراضي كنشط
    document.querySelector('[data-map-style="light"]').classList.add('active');
    
    // جعل hideBeltInfo متاحة عالمياً
    window.hideBeltInfo = hideBeltInfo;
    
    // متغير لتخزين بيانات الأمراض
    let diseasesData = {};
    
    // تحميل بيانات الأمراض
    async function loadDiseasesData() {
        try {
            const response = await fetch('json/diseases_data.json');
            if (response.ok) {
                diseasesData = await response.json();
                console.log('تم تحميل بيانات الأمراض بنجاح');
            } else {
                console.log('لم يتم العثور على ملف بيانات الأمراض');
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات الأمراض:', error);
        }
    }
    
    // إنشاء محتوى النافذة المنبثقة للمنطقة
    function createRegionPopupContent(regionProperties) {
        const regionName = regionProperties.name_ar;
        const regionNameEn = regionProperties.name_en;
        const population = regionProperties.population || 'غير متوفر';
        
        // إرجاع محتوى محسن للنافذة الصغيرة
        return `
            <div class="popup-content-wrapper">
                <div class="popup-header">
                    <h4 class="popup-region-name">${regionName}</h4>
                    <p class="popup-region-name-en">${regionNameEn}</p>
                </div>
                
                <div class="popup-info">
                    <div class="popup-population">
                        <i class="fas fa-users popup-icon"></i>
                        <span class="popup-population-text">عدد السكان: ${population}</span>
                    </div>
                </div>
                
                <div class="popup-actions">
                    <button onclick="showFullscreenPopup('${regionName}', '${regionNameEn}', '${population}')" 
                            class="popup-details-btn">
                        <i class="fas fa-expand popup-btn-icon"></i>
                        <span>عرض التفاصيل الكاملة</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    // دالة إظهار النافذة المنبثقة بملء الشاشة
    function showFullscreenPopup(regionName, regionNameEn, population) {
        // الحصول على بيانات المنطقة المفصلة
        const regionData = getDetailedRegionData(regionName);
        
        // إنشاء عنصر النافذة المنبثقة
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-popup-overlay';
        overlay.innerHTML = `
            <div class="fullscreen-popup">
                <div class="fullscreen-popup-header">
                    <button class="fullscreen-popup-close" onclick="closeFullscreenPopup()">
                        ×
                    </button>
                    <h2 class="fullscreen-popup-title">تفاصيل منطقة ${regionName}</h2>
                </div>
                
                <div class="fullscreen-popup-content">
                    <!-- قسم معلومات المنطقة -->
                    <div class="region-info-section">
                        <div class="region-header">
                            <h1 class="region-name">${regionName}</h1>
                            <p class="region-name-en">${regionNameEn}</p>
                            <div class="region-population">
                                <i class="fas fa-users" style="margin-left: 8px;"></i>
                                عدد السكان: ${population}
                            </div>
                        </div>
                    </div>
                    
                    <!-- قسم الثروة الحيوانية -->
                    <div class="livestock-section">
                        <h2 class="section-title">
                            <i class="fas fa-chart-bar" style="margin-left: 10px;"></i>
                            إجمالي الثروة الحيوانية
                        </h2>
                        
                        <div class="livestock-grid">
                            <div class="livestock-item">
                                <span class="livestock-icon">🐄</span>
                                <h3 class="livestock-type">الأبقار</h3>
                                <p class="livestock-count">${regionData.totalLivestock.cattle.toLocaleString()}</p>
                            </div>
                            
                            <div class="livestock-item">
                                <span class="livestock-icon">🐐</span>
                                <h3 class="livestock-type">الماعز</h3>
                                <p class="livestock-count">${regionData.totalLivestock.goats.toLocaleString()}</p>
                            </div>
                            
                            <div class="livestock-item">
                                <span class="livestock-icon">🐑</span>
                                <h3 class="livestock-type">الضأن</h3>
                                <p class="livestock-count">${regionData.totalLivestock.sheep.toLocaleString()}</p>
                            </div>
                            
                            <div class="livestock-item">
                                <span class="livestock-icon">🐪</span>
                                <h3 class="livestock-type">الإبل</h3>
                                <p class="livestock-count">${regionData.totalLivestock.camels.toLocaleString()}</p>
                            </div>
                            
                            <div class="livestock-item">
                                <span class="livestock-icon">🐎</span>
                                <h3 class="livestock-type">الخيل</h3>
                                <p class="livestock-count">${regionData.totalLivestock.horses.toLocaleString()}</p>
                            </div>
                            
                            <div class="livestock-item total-livestock">
                                <span class="livestock-icon"><i class="fas fa-chart-bar" style="color: white;"></i></span>
                                <h3 class="livestock-type">الإجمالي العام</h3>
                                <p class="livestock-count">${regionData.totalLivestock.total.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- قسم المسوحات -->
                    <div class="surveys-section">
                        <h2 class="section-title">
                            <i class="fas fa-search" style="margin-left: 10px;"></i>
                            المسوحات والتقصي الشامل
                        </h2>
                        
                        <div class="surveys-grid">
                            ${regionData.surveys.map((survey, index) => {
                                const surveyNumber = index + 1;
                                const statusClass = survey.status === 'completed' ? 'status-completed' : 
                                                  survey.status === 'in_progress' ? 'status-pending' : 'status-cancelled';
                                const statusText = survey.status === 'completed' ? 'مكتمل' : 
                                                 survey.status === 'in_progress' ? 'جاري' : 'مجدول';
                                const prevalenceClass = survey.prevalence_rate > 5 ? 'prevalence-high' : 
                                                      survey.prevalence_rate > 2 ? 'prevalence-medium' : 'prevalence-low';
                                
                                return `
                                    <div class="survey-card">
                                        <div class="survey-header">
                                            <h3 class="survey-title">المسح ${surveyNumber}</h3>
                                            <span class="survey-status ${statusClass}">${statusText}</span>
                                        </div>
                                        
                                        <div class="survey-details">
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">التاريخ</p>
                                                <p class="survey-detail-value">${survey.date}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">العينات المفحوصة</p>
                                                <p class="survey-detail-value">${survey.samples_tested.toLocaleString()}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">عدد الحيوانات</p>
                                                <p class="survey-detail-value">${survey.animals_count.toLocaleString()}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">النتائج الإيجابية</p>
                                                <p class="survey-detail-value">${survey.positive_results}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">النتائج السلبية</p>
                                                <p class="survey-detail-value">${survey.negative_results}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">كود العينة</p>
                                                <p class="survey-detail-value">${survey.sample_code}</p>
                                            </div>
                                            
                                            <div class="survey-detail">
                                                <p class="survey-detail-label">نسبة الانتشار</p>
                                                <p class="survey-detail-value ${prevalenceClass}">${survey.prevalence_rate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- قسم مسح الحشرات -->
                    ${regionData.insectSurvey && regionData.insectSurvey.length > 0 ? `
                        <div class="insects-section">
                            <h2 class="section-title">
                                <i class="fas fa-bug" style="margin-left: 10px;"></i>
                                تقصي الحشرات
                            </h2>
                            
                            <div class="insects-grid">
                                ${regionData.insectSurvey.map(insect => `
                                    <div class="insect-card">
                                        <span class="insect-icon">🦟</span>
                                        <h3 class="insect-type">${insect.type}</h3>
                                        <p class="insect-count">${insect.count} عينة</p>
                                        <span class="insect-status ${insect.status === 'active' ? 'status-pending' : 'status-completed'}">
                                            ${insect.status === 'active' ? 'نشط' : 'مراقبة'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // إضافة النافذة إلى الصفحة
        document.body.appendChild(overlay);
        
        // إظهار النافذة مع تأثير الانتقال
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        // إضافة مستمع للنقر خارج النافذة لإغلاقها
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeFullscreenPopup();
            }
        });
        
        // إضافة مستمع لمفتاح Escape لإغلاق النافذة
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeFullscreenPopup();
            }
        });
    }
    
    // دالة إغلاق النافذة المنبثقة بملء الشاشة
    function closeFullscreenPopup() {
        const overlay = document.querySelector('.fullscreen-popup-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
            }, 400);
        }
    }
    
    // جعل الدوال متاحة عالمياً
    window.showFullscreenPopup = showFullscreenPopup;
    window.closeFullscreenPopup = closeFullscreenPopup;
    
    // البحث عن بيانات الأمراض للمنطقة
    function getRegionDiseases(regionName) {
        const diseases = [];
        
        if (diseasesData.diseases) {
            Object.values(diseasesData.diseases).forEach(disease => {
                if (disease.regions_data && disease.regions_data[regionName]) {
                    const regionData = disease.regions_data[regionName];
                    diseases.push({
                        name: disease.name_ar,
                        livestock_count: regionData.livestock_count,
                        livestock_details: regionData.livestock_details,
                        positive_foci: regionData.positive_foci,
                        negative_foci: regionData.negative_foci,
                        surveillance_status: regionData.surveillance_status,
                        last_updated: regionData.last_updated
                    });
                }
            });
        }
        
        return diseases;
    }
    
    // الحصول على البيانات المفصلة للمنطقة
    function getDetailedRegionData(regionName) {
        // محاولة الحصول على البيانات الحقيقية من diseases_data.json
        let realLivestockData = null;
        
        // تحميل البيانات بشكل متزامن من localStorage إذا كانت متوفرة
        const cachedDiseasesData = localStorage.getItem('diseases_data_cache');
        if (cachedDiseasesData) {
            try {
                const data = JSON.parse(cachedDiseasesData);
                if (data.diseases && data.diseases.rift_valley_fever && data.diseases.rift_valley_fever.regions_data) {
                    realLivestockData = data.diseases.rift_valley_fever.regions_data[regionName];
                }
            } catch (error) {
                console.warn('خطأ في تحليل البيانات المحفوظة:', error);
            }
        }
        
        // دالة مساعدة لضمان أن القيمة رقم صحيح
        const ensureNumber = (value, defaultValue = 0) => {
            if (typeof value === 'number' && !isNaN(value)) {
                return Math.floor(value);
            }
            if (typeof value === 'string' && !isNaN(parseInt(value))) {
                return parseInt(value);
            }
            return defaultValue;
        };
        
        // بيانات افتراضية للمنطقة
        const defaultData = {
            totalLivestock: realLivestockData ? {
                cattle: ensureNumber(realLivestockData.livestock_details?.cattle, Math.floor(Math.random() * 50000) + 10000),
                goats: ensureNumber(realLivestockData.livestock_details?.goats, Math.floor(Math.random() * 80000) + 20000),
                sheep: ensureNumber(realLivestockData.livestock_details?.sheep, Math.floor(Math.random() * 100000) + 30000),
                camels: ensureNumber(realLivestockData.livestock_details?.camels, Math.floor(Math.random() * 15000) + 5000),
                horses: ensureNumber(realLivestockData.livestock_details?.horses, Math.floor(Math.random() * 8000) + 2000),
                total: ensureNumber(realLivestockData.livestock_count, 0)
            } : {
                cattle: Math.floor(Math.random() * 50000) + 10000,
                goats: Math.floor(Math.random() * 80000) + 20000,
                sheep: Math.floor(Math.random() * 100000) + 30000,
                camels: Math.floor(Math.random() * 15000) + 5000,
                horses: Math.floor(Math.random() * 8000) + 2000,
                total: 0
            },
            surveys: [
                {
                    date: '2024-01-15',
                    status: 'completed',
                    samples_tested: ensureNumber(Math.floor(Math.random() * 500) + 100),
                    animals_count: ensureNumber(Math.floor(Math.random() * 2000) + 500),
                    positive_results: ensureNumber(Math.floor(Math.random() * 20) + 2),
                    negative_results: 0,
                    sample_code: 'RYD-2024-001',
                    prevalence_rate: 0
                },
                {
                    date: '2024-06-20',
                    status: 'completed',
                    samples_tested: ensureNumber(Math.floor(Math.random() * 600) + 150),
                    animals_count: ensureNumber(Math.floor(Math.random() * 2500) + 600),
                    positive_results: ensureNumber(Math.floor(Math.random() * 15) + 1),
                    negative_results: 0,
                    sample_code: 'RYD-2024-002',
                    prevalence_rate: 0
                },
                {
                    date: '2024-11-10',
                    status: 'in_progress',
                    samples_tested: ensureNumber(Math.floor(Math.random() * 400) + 80),
                    animals_count: ensureNumber(Math.floor(Math.random() * 1800) + 400),
                    positive_results: ensureNumber(Math.floor(Math.random() * 10) + 1),
                    negative_results: 0,
                    sample_code: 'RYD-2024-003',
                    prevalence_rate: 0
                }
            ],
            insectSurvey: [
                {
                    type: 'البعوض الناقل',
                    count: ensureNumber(Math.floor(Math.random() * 200) + 50),
                    status: 'active'
                },
                {
                    type: 'القراد',
                    count: ensureNumber(Math.floor(Math.random() * 150) + 30),
                    status: 'monitoring'
                },
                {
                    type: 'الذباب الناقل',
                    count: ensureNumber(Math.floor(Math.random() * 100) + 20),
                    status: 'monitoring'
                },
                {
                    type: 'البراغيث',
                    count: ensureNumber(Math.floor(Math.random() * 80) + 15),
                    status: 'active'
                }
            ]
        };
        
        // حساب الإجمالي إذا لم يكن محدد مسبقاً
        if (!realLivestockData) {
            defaultData.totalLivestock.total = 
                defaultData.totalLivestock.cattle +
                defaultData.totalLivestock.goats +
                defaultData.totalLivestock.sheep +
                defaultData.totalLivestock.camels +
                defaultData.totalLivestock.horses;
        }
        
        // حساب النتائج السلبية ونسبة الانتشار لكل مسح
        defaultData.surveys.forEach(survey => {
            // ضمان أن جميع القيم أرقام صحيحة
            survey.samples_tested = ensureNumber(survey.samples_tested);
            survey.positive_results = ensureNumber(survey.positive_results);
            survey.animals_count = ensureNumber(survey.animals_count);
            
            // حساب النتائج السلبية
            survey.negative_results = survey.samples_tested - survey.positive_results;
            
            // حساب نسبة الانتشار مع التأكد من عدم القسمة على صفر
            if (survey.samples_tested > 0) {
                survey.prevalence_rate = parseFloat(((survey.positive_results / survey.samples_tested) * 100).toFixed(2));
            } else {
                survey.prevalence_rate = 0;
            }
        });
        
        // محاولة الحصول على البيانات من التخزين المحلي أو قاعدة البيانات
        const storedData = localStorage.getItem(`regionData_${regionName}`);
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                return { ...defaultData, ...parsedData };
            } catch (e) {
                console.warn('خطأ في تحليل البيانات المحفوظة للمنطقة:', regionName);
            }
        }
        
        // حفظ البيانات الافتراضية في التخزين المحلي
        localStorage.setItem(`regionData_${regionName}`, JSON.stringify(defaultData));
        
        return defaultData;
    }
    
    // فتح لوحة تحكم الأمراض
    function openDiseasesDashboard() {
        window.open('diseases_dashboard.html', '_blank');
    }
    
    // فتح العرض التفصيلي للمنطقة
    function openDetailedView(regionName) {
        // إنشاء نافذة منبثقة للعرض التفصيلي
        const detailedWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        const regionData = getDetailedRegionData(regionName);
        
        let detailedHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>العرض التفصيلي - ${regionName}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 15px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #2c3e50, #3498db);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        padding: 30px;
                    }
                    .section {
                        margin-bottom: 30px;
                        background: #f8f9fa;
                        border-radius: 10px;
                        padding: 20px;
                        border: 1px solid #e9ecef;
                    }
                    .section h3 {
                        color: #2c3e50;
                        margin-bottom: 15px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 10px;
                    }
                    .livestock-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .livestock-card {
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        border: 1px solid #dee2e6;
                        transition: transform 0.3s ease;
                    }
                    .livestock-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    }
                    .survey-card {
                        background: white;
                        border-radius: 10px;
                        padding: 20px;
                        margin-bottom: 20px;
                        border-right: 5px solid #3498db;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    }
                    .survey-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    .status-badge {
                        padding: 5px 15px;
                        border-radius: 20px;
                        color: white;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .stat-item {
                        background: #f8f9fa;
                        padding: 10px;
                        border-radius: 6px;
                        text-align: center;
                    }
                    .insect-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                    }
                    .insect-card {
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #ffeaa7;
                    }
                    .print-btn {
                        background: #27ae60;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 10px;
                        font-size: 14px;
                    }
                    @media print {
                        body { background: white; }
                        .print-btn { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1><i class="fas fa-map-marker-alt"></i> العرض التفصيلي لمنطقة ${regionName}</h1>
                        <p>تقرير شامل عن الثروة الحيوانية والمسوحات البيطرية</p>
                        <button class="print-btn" onclick="window.print()"><i class="fas fa-print"></i> طباعة التقرير</button>
                    </div>
                    
                    <div class="content">
                        <div class="section">
                            <h3><i class="fas fa-chart-bar"></i> إجمالي الثروة الحيوانية</h3>
                            <div class="livestock-grid">
                                <div class="livestock-card">
                                    <div style="font-size: 40px; margin-bottom: 10px;">🐄</div>
                                    <h4>أبقار</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: #3498db;">${regionData.totalLivestock.cattle.toLocaleString()}</p>
                                </div>
                                <div class="livestock-card">
                                    <div style="font-size: 40px; margin-bottom: 10px;">🐐</div>
                                    <h4>ماعز</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: #3498db;">${regionData.totalLivestock.goats.toLocaleString()}</p>
                                </div>
                                <div class="livestock-card">
                                    <div style="font-size: 40px; margin-bottom: 10px;">🐑</div>
                                    <h4>ضأن</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: #3498db;">${regionData.totalLivestock.sheep.toLocaleString()}</p>
                                </div>
                                <div class="livestock-card">
                                    <div style="font-size: 40px; margin-bottom: 10px;">🐪</div>
                                    <h4>إبل</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: #3498db;">${regionData.totalLivestock.camels.toLocaleString()}</p>
                                </div>
                                <div class="livestock-card">
                                    <div style="font-size: 40px; margin-bottom: 10px;">🐎</div>
                                    <h4>خيل</h4>
                                    <p style="font-size: 24px; font-weight: bold; color: #3498db;">${regionData.totalLivestock.horses.toLocaleString()}</p>
                                </div>
                                <div class="livestock-card" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;">
                                    <div style="font-size: 40px; margin-bottom: 10px;"><i class="fas fa-chart-bar" style="color: white;"></i></div>
                                    <h4>الإجمالي</h4>
                                    <p style="font-size: 24px; font-weight: bold;">${regionData.totalLivestock.total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3><i class="fas fa-search"></i> المسوحات والتقصي الشامل</h3>
        `;
        
        regionData.surveys.forEach((survey, index) => {
            const surveyNumber = index + 1;
            const statusColor = survey.status === 'completed' ? '#27ae60' : survey.status === 'in_progress' ? '#f39c12' : '#95a5a6';
            const statusText = survey.status === 'completed' ? 'مكتمل' : survey.status === 'in_progress' ? 'جاري' : 'مجدول';
            
            detailedHTML += `
                <div class="survey-card">
                    <div class="survey-header">
                        <h4><i class="fas fa-clipboard-list"></i> المسح ${surveyNumber} (التقصي الشامل)</h4>
                        <span class="status-badge" style="background: ${statusColor};">${statusText}</span>
                    </div>
                    <p><i class="fas fa-calendar"></i> التاريخ: ${survey.date}</p>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <strong>العينات المفحوصة</strong>
                            <p style="font-size: 18px; color: #3498db; font-weight: bold;">${survey.samples_tested.toLocaleString()}</p>
                        </div>
                        <div class="stat-item">
                            <strong>عدد الحيوانات</strong>
                            <p style="font-size: 18px; color: #9b59b6; font-weight: bold;">${survey.animals_count.toLocaleString()}</p>
                        </div>
                        <div class="stat-item">
                            <strong>النتائج الإيجابية</strong>
                            <p style="font-size: 18px; color: #e74c3c; font-weight: bold;">${survey.positive_results}</p>
                        </div>
                        <div class="stat-item">
                            <strong>النتائج السلبية</strong>
                            <p style="font-size: 18px; color: #27ae60; font-weight: bold;">${survey.negative_results}</p>
                        </div>
                        <div class="stat-item">
                            <strong>كود العينة</strong>
                            <p style="font-size: 14px; color: #6c757d; font-weight: bold;">${survey.sample_code}</p>
                        </div>
                        <div class="stat-item">
                            <strong>نسبة الانتشار</strong>
                            <p style="font-size: 18px; color: ${survey.prevalence_rate > 5 ? '#e74c3c' : survey.prevalence_rate > 2 ? '#f39c12' : '#27ae60'}; font-weight: bold;">${survey.prevalence_rate}%</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        detailedHTML += `
                        </div>
                        
                        <div class="section">
                            <h3><i class="fas fa-bug"></i> تقصي الحشرات</h3>
                            <div class="insect-grid">
        `;
        
        regionData.insectSurvey.forEach(insect => {
            detailedHTML += `
                <div class="insect-card">
                    <h4 style="color: #856404; margin-bottom: 10px;">${insect.type}</h4>
                    <p><strong>العدد:</strong> ${insect.count}</p>
                    <p><strong>الحالة:</strong> <span style="color: ${insect.status === 'active' ? '#e74c3c' : '#27ae60'}; font-weight: bold;">${insect.status === 'active' ? 'نشط' : 'مراقبة'}</span></p>
                </div>
            `;
        });
        
        detailedHTML += `
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        detailedWindow.document.write(detailedHTML);
        detailedWindow.document.close();
    }
    
    // جعل الوظائف متاحة عالمياً
    window.createRegionPopupContent = createRegionPopupContent;
    window.openDiseasesDashboard = openDiseasesDashboard;
    window.openDetailedView = openDetailedView;
    
    // تحميل بيانات الأمراض عند بدء التطبيق
    loadDiseasesData();
    
    // مستمع للرسائل من لوحة تحكم الأمراض
    window.addEventListener('message', function(event) {
        if (event.data.type === 'diseasesDataUpdated') {
            // تحديث البيانات المحلية
            diseasesData = event.data.data;
            console.log('تم تحديث بيانات الأمراض من لوحة التحكم');
            
            // إعادة تحميل البيانات من الملف للتأكد من التزامن
            setTimeout(() => {
                loadDiseasesData();
            }, 500);
        }
    });
    
    // ========================================
    // وظائف أزرار الهيدر
    // ========================================
    
    // وظيفة الشاشة الكاملة
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`خطأ في تفعيل الشاشة الكاملة: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    // وظيفة إظهار نافذة المساعدة
    function showHelpModal() {
        const modalHTML = `
            <div class="help-modal-overlay" id="helpModalOverlay">
                <div class="help-modal">
                    <div class="help-modal-header">
                        <h3>دليل استخدام الخريطة التفاعلية</h3>
                        <button class="help-modal-close" onclick="closeHelpModal()">&times;</button>
                    </div>
                    <div class="help-modal-content">
                        <div class="help-section">
                            <h4><i class="fas fa-map"></i> التنقل في الخريطة</h4>
                            <p>استخدم الماوس للتنقل والتكبير/التصغير. يمكنك أيضاً استخدام أزرار + و - للتحكم في مستوى التكبير.</p>
                        </div>
                        <div class="help-section">
                            <h4><i class="fas fa-layers"></i> طبقات الخريطة</h4>
                            <p>استخدم قائمة الطبقات في الزاوية العلوية اليمنى لإظهار أو إخفاء المناطق والمدن والمحافظات والمراكز.</p>
                        </div>
                        <div class="help-section">
                            <h4><i class="fas fa-search"></i> البحث</h4>
                            <p>استخدم شريط البحث للعثور على مناطق أو مدن محددة بسرعة.</p>
                        </div>
                        <div class="help-section">
                            <h4><i class="fas fa-info-circle"></i> معلومات إضافية</h4>
                            <p>انقر على أي منطقة في الخريطة للحصول على معلومات تفصيلية عنها.</p>
                        </div>
                        <div class="help-section">
                            <h4><i class="fas fa-expand"></i> الشاشة الكاملة</h4>
                            <p>استخدم زر الشاشة الكاملة لعرض الخريطة بحجم أكبر وتجربة أفضل.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // إضافة مستمع للنقر خارج النافذة لإغلاقها
        document.getElementById('helpModalOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closeHelpModal();
            }
        });
    }
    
    // وظيفة إغلاق نافذة المساعدة
    function closeHelpModal() {
        const modal = document.getElementById('helpModalOverlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // إضافة مستمعي الأحداث لأزرار الهيدر
    // زر الشاشة الكاملة
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // زر المساعدة
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', showHelpModal);
    }
    
    // تحديث أيقونة الشاشة الكاملة عند تغيير الحالة
    document.addEventListener('fullscreenchange', function() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('i');
            if (document.fullscreenElement) {
                icon.className = 'fas fa-compress';
                fullscreenBtn.title = 'خروج من الشاشة الكاملة';
            } else {
                icon.className = 'fas fa-expand';
                fullscreenBtn.title = 'شاشة كاملة';
            }
        }
    });
    
    // جعل الوظائف متاحة عالمياً
    window.toggleFullscreen = toggleFullscreen;
    window.showHelpModal = showHelpModal;
    window.closeHelpModal = closeHelpModal;
});