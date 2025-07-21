// 動態載入 Google Maps API
function loadGoogleMapsApi(callbackName) {
  if (window.google && window.google.maps) {
    window[callbackName]();
    return;
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${window.GOOGLE_MAPS_API_KEY}&callback=${callbackName}&libraries=marker`;
  script.async = true;
  document.body.appendChild(script);
}

// Google Maps 初始化函式
window.initMap = function() {
  console.log('initMap called', document.getElementById('map'));
  const center = { lat: 22.984125548407608, lng: 120.20778090404937 }; // 例如台南大學
  window.map = new google.maps.Map(document.getElementById('map'), {
    disableDefaultUI: true,
    zoom: 16,
    center: center,
    mapId: '6ed617e6d5b5d390', // 使用 Map ID 以啟用進階標記
    styles: [
        {
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#ebe3cd"
            }
          ]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#523735"
            }
          ]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [
            {
              "color": "#f5f1e6"
            }
          ]
        },
        {
          "featureType": "administrative",
          "elementType": "geometry.stroke",
          "stylers": [
            {
              "color": "#c9b2a6"
            }
          ]
        },
        {
          "featureType": "administrative.land_parcel",
          "elementType": "geometry.stroke",
          "stylers": [
            {
              "color": "#dcd2be"
            }
          ]
        },
        {
          "featureType": "administrative.land_parcel",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#ae9e90"
            }
          ]
        },
        {
          "featureType": "landscape.natural",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#dfd2ae"
            }
          ]
        },
        {
          "featureType": "poi",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#dfd2ae"
            }
          ]
        },
        {
          "featureType": "poi",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#93817c"
            }
          ]
        },
        {
          "featureType": "poi.business",
          "stylers": [
            {
              "visibility": "off"
            }
          ]
        },
        {
          "featureType": "poi.park",
          "elementType": "geometry.fill",
          "stylers": [
            {
              "color": "#a5b076"
            }
          ]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text",
          "stylers": [
            {
              "visibility": "off"
            }
          ]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#447530"
            }
          ]
        },
        {
          "featureType": "road",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#f5f1e6"
            }
          ]
        },
        {
          "featureType": "road.arterial",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#fdfcf8"
            }
          ]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#f8c967"
            }
          ]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry.stroke",
          "stylers": [
            {
              "color": "#e9bc62"
            }
          ]
        },
        {
          "featureType": "road.highway.controlled_access",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#e98d58"
            }
          ]
        },
        {
          "featureType": "road.highway.controlled_access",
          "elementType": "geometry.stroke",
          "stylers": [
            {
              "color": "#db8555"
            }
          ]
        },
        {
          "featureType": "road.local",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#806b63"
            }
          ]
        },
        {
          "featureType": "transit.line",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#dfd2ae"
            }
          ]
        },
        {
          "featureType": "transit.line",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#8f7d77"
            }
          ]
        },
        {
          "featureType": "transit.line",
          "elementType": "labels.text.stroke",
          "stylers": [
            {
              "color": "#ebe3cd"
            }
          ]
        },
        {
          "featureType": "transit.station",
          "elementType": "geometry",
          "stylers": [
            {
              "color": "#dfd2ae"
            }
          ]
        },
        {
          "featureType": "water",
          "elementType": "geometry.fill",
          "stylers": [
            {
              "color": "#b9d3c2"
            }
          ]
        },
        {
          "featureType": "water",
          "elementType": "labels.text.fill",
          "stylers": [
            {
              "color": "#92998d"
            }
          ]
        }
      ]
  });
  // 預設地標（可移除或保留）
  const marker = new google.maps.Marker({
    position: center,
    map: window.map,
    title: '國立臺南大學'
  });
  fetchAndRenderInitialData(); // 初始化後獲取資料並渲染
};

// 頁面載入時自動載入 Google Maps
function waitForApiKeyAndLoadMap() {
  if (window.GOOGLE_MAPS_API_KEY) {
    loadGoogleMapsApi('initMap');
  } else {
    setTimeout(waitForApiKeyAndLoadMap, 50);
  }
}
window.onload = function() {
  waitForApiKeyAndLoadMap();
};

let mapMarkers = []; // 儲存所有 marker 實例，用於同步點擊
let restaurantDataCache = new Map(); // 快取餐廳資料
let allRestaurantsData = []; // 全域快取所有餐廳資料

// 展開/折疊地圖按鈕功能
function setupToggleMapBtn() {
  const btn = document.getElementById('toggleMapBtn');
  const mapDiv = document.getElementById('map');
  if (!btn || !mapDiv) return;
  let expanded = false;
  btn.addEventListener('click', function() {
    expanded = !expanded;
    btn.classList.toggle('expanded', expanded);
    mapDiv.style.height = expanded ? '80vh' : '40vh';
    // 觸發 resize 讓地圖自適應
    if (window.map) {
      google.maps.event.trigger(window.map, 'resize');
    }
  });
}
document.addEventListener('DOMContentLoaded', setupToggleMapBtn);

// 設定詳情視圖的關閉按鈕
function setupDetailView() {
  const closeBtn = document.getElementById('closeDetailBtn');
  const container = document.getElementById('restaurantDetailContainer');
  if (closeBtn && container) {
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
      const current = document.querySelector('.listItem.highlighted');
      if (current) current.classList.remove('highlighted');
    });
  }
}
document.addEventListener('DOMContentLoaded', setupDetailView);


async function fetchAndRenderInitialData() {
  if (window.showLoading) window.showLoading();
  try {
    const snapshot = await firebase.firestore().collection('maps').get();
    allRestaurantsData = [];
    snapshot.forEach(doc => {
      allRestaurantsData.push({ id: doc.id, ...doc.data() });
    });
    renderFilteredRestaurants(); // 首次渲染
  } catch (err) {
    console.error("資料載入失敗:", err);
    document.querySelector('.foodMapList').innerHTML = '資料載入失敗';
  } finally {
    if (window.hideLoading) window.hideLoading();
  }
}

function renderFilteredRestaurants() {
  const categoryFilterValue = document.getElementById('categoryFilter').value;
  const statusFilterValue = document.getElementById('statusFilter').value;
  const listContainer = document.querySelector('.foodMapList');
  const gmap = window.map;

  if (!gmap) {
    console.error('地圖尚未初始化');
    return;
  }

  // 清理舊狀態
  listContainer.innerHTML = '';
  mapMarkers.forEach(m => m.marker.map = null);
  mapMarkers = [];
  restaurantDataCache.clear();
  const detailContainer = document.getElementById('restaurantDetailContainer');
  if (detailContainer) detailContainer.style.display = 'none';

  let html = '';
  let firstLatLng = null;
  const now = new Date();

  const filteredData = allRestaurantsData.filter(data => {
    const categoryMatch = categoryFilterValue === 'all' || data.category === categoryFilterValue;

    let statusMatch = true;
    if (statusFilterValue !== 'all') {
      let currentStatus = '今日未營業';
      if (data.openingHours) {
        if (data.openingHours.includes('休息')) {
            currentStatus = '休息中';
        } else {
            const timePartMatch = data.openingHours.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
            if (timePartMatch) {
              const [, openStr, closeStr] = timePartMatch;
              const nowTime = now.getHours() * 60 + now.getMinutes();
              const [openH, openM] = openStr.split(':').map(Number);
              const openTime = openH * 60 + openM;
              const [closeH, closeM] = closeStr.split(':').map(Number);
              const closeTime = closeH * 60 + closeM;
              if (closeTime < openTime) {
                currentStatus = (nowTime >= openTime || nowTime <= closeTime) ? '營業中' : '休息中';
              } else {
                currentStatus = (nowTime >= openTime && nowTime <= closeTime) ? '營業中' : '休息中';
              }
            }
        }
      }
      statusMatch = currentStatus === statusFilterValue;
    }
    return categoryMatch && statusMatch;
  });

  filteredData.forEach(data => {
    const docId = data.id;
    restaurantDataCache.set(docId, data);
    
    let status = '今日未營業';
    if (data.openingHours) {
        if (data.openingHours.includes('休息')) {
            status = '休息中';
        } else {
            const timePartMatch = data.openingHours.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
            if (timePartMatch) {
              const [, openStr, closeStr] = timePartMatch;
              const nowTime = now.getHours() * 60 + now.getMinutes();
              const [openH, openM] = openStr.split(':').map(Number);
              const openTime = openH * 60 + openM;
              const [closeH, closeM] = closeStr.split(':').map(Number);
              const closeTime = closeH * 60 + closeM;
              if (closeTime < openTime) {
                status = (nowTime >= openTime || nowTime <= closeTime) ? '營業中' : '休息中';
              } else {
                status = (nowTime >= openTime && nowTime <= closeTime) ? '營業中' : '休息中';
              }
            } else {
              status = '時間格式錯誤';
            }
        }
    }

    let statusColor = '';
    if (status === '營業中') statusColor = '#225c2a';
    else if (status === '休息中') statusColor = '#c12a0c';
    else statusColor = '#888';

    let markerBorder = '#a0a0a0';
    if (data.category && data.category.includes('A級')) markerBorder = '#E57373';
    else if (data.category && data.category.includes('B級')) markerBorder = '#FFD54F';
    else if (data.category && (data.category.includes('咖啡') || data.category.includes('甜'))) markerBorder = '#81C784';

    if (!firstLatLng && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      firstLatLng = {lat: data.latitude, lng: data.longitude};
    }

    html += `
        <div class="listItem" data-doc-id="${docId}">
          <img src="${data.image || '#'}" alt="${data.name}">
          <div class="itemsContent">
            <h3>${data.name || '無名稱'}</h3>
            <div class="hashtagList">
              <p>${data.category || ''}</p>
              <p style="background:${statusColor};color:#fff;">${status}</p>
            </div>
            <div class="description">
              <p>${data.description || ''}</p>
            </div>
          </div>
        </div>
    `;

    if (gmap && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const markerEl = document.createElement('img');
        markerEl.src = data.image || 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dot.png';
        markerEl.className = 'custom-marker-image';
        markerEl.style.borderColor = markerBorder;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: {lat: data.latitude, lng: data.longitude},
          map: gmap,
          title: data.name,
          content: markerEl
        });

        const infoHtml = `
          <div style=\"min-width:180px\">
            <img src=\"${data.image}\" alt=\"${data.name}\" style=\"width:100%;height:100px;object-fit:cover;border-radius:8px;\">
            <h3 style=\"margin:8px 0 4px 0;\">${data.name}</h3>
            <div>${data.category || ''}</div>
            <div>${data.formattedAddress || ''}</div>
            <div>${data.phone || ''}</div>
            <div>${data.description || ''}</div>
            <a href=\"${data.website || '#'}\" target=\"_blank\">店家網站</a>
          </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: infoHtml });
        marker.addListener('click', () => {
          highlightListItem(docId);
          gmap.panTo(marker.position);
          if (gmap.getZoom() < 17) gmap.setZoom(17);
          infoWindow.open({ anchor: marker, map: gmap });
        });
        mapMarkers.push({ id: docId, marker: marker });
    }
  });

  if (gmap && firstLatLng) {
    gmap.panTo(firstLatLng);
    if(filteredData.length === 1) gmap.setZoom(17);
  }
  
  listContainer.innerHTML = html;
  listContainer.scrollLeft = 0; // 每次渲染後，將列表捲動到最左邊

  listContainer.addEventListener('click', (e) => {
    const listItem = e.target.closest('.listItem');
    if (!listItem) return;
    const docId = listItem.dataset.docId;
    const markerData = mapMarkers.find(m => m.id === docId);
    if (markerData?.marker) {
      google.maps.event.trigger(markerData.marker, 'click');
    }
  });
}

function setupControls() {
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const randomBtn = document.getElementById('randomRestaurantBtn');

    if (categoryFilter) categoryFilter.addEventListener('change', renderFilteredRestaurants);
    if (statusFilter) statusFilter.addEventListener('change', renderFilteredRestaurants);

    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const visibleItems = document.querySelectorAll('.foodMapList .listItem');
            if (visibleItems.length === 0) {
                alert('目前篩選條件下沒有可選的餐廳！');
                return;
            }
            const randomIndex = Math.floor(Math.random() * visibleItems.length);
            const randomItem = visibleItems[randomIndex];
            const docId = randomItem.dataset.docId;
            const markerData = mapMarkers.find(m => m.id === docId);
            if (markerData?.marker) {
                google.maps.event.trigger(markerData.marker, 'click');
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', setupControls);

function highlightListItem(docId) {
  const current = document.querySelector('.listItem.highlighted');
  if (current) current.classList.remove('highlighted');
  const target = document.querySelector(`.listItem[data-doc-id="${docId}"]`);
  if (target) {
    target.classList.add('highlighted');
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    showRestaurantDetails(docId, false); // 顯示詳情，但不觸發頁面捲動
  }
}

function showRestaurantDetails(docId, shouldScroll) {
  const container = document.getElementById('restaurantDetailContainer');
  const data = restaurantDataCache.get(docId);
  if (!container || !data) return;

  // 填入資料
  document.getElementById('detailImage').src = data.image || '';
  document.getElementById('detailName').textContent = data.name || '無名稱';
  document.getElementById('detailAddress').textContent = data.formattedAddress || '';
  document.getElementById('detailDescription').textContent = data.description || '';
  const hoursEl = document.getElementById('detailOpeningHours');
  if (data.openingHours) {
    hoursEl.innerHTML = `<strong>營業時間：</strong><br>` + data.openingHours.replace(/;/g, '<br>');
    hoursEl.style.display = 'block';
  } else {
    hoursEl.style.display = 'none';
  }
  const websiteLink = document.getElementById('detailWebsite');
  websiteLink.href = data.website || '#';
  websiteLink.style.display = data.website ? 'inline-block' : 'none';

  const menuImg = document.getElementById('detailMenu');
  menuImg.src = data.menuUrl || '';
  menuImg.style.display = data.menuUrl ? 'block' : 'none';

  // 顯示並根據需要捲動到視野
  container.style.display = 'block';
  if (shouldScroll) {
    const y = container.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({top: y, behavior: 'smooth'});
  }
}
