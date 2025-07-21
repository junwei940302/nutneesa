// admin-maps.js
// 美食地圖相關功能

const MAP_CATEGORIES = ["A級美食嘉年華", "B級美食嘉年華", "咖啡廳及甜點店"];

async function fetchMapItems() {
  try {
    const user = await getCurrentUserAsync();
    if (!user) {
      alert("請先登入！");
      return;
    }
    await user.reload();
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/admin/maps`, {
      credentials: "include",
      headers: {
        "Authorization": "Bearer " + idToken,
      },
    });
    if (res.status === 401) {
      await firebase.auth().signOut();
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) throw new Error("無法取得地標列表");
    const items = await res.json();
    populateMapItemsTable(items);
  } catch (err) {
    alert("載入地標失敗");
  }
}

function populateMapItemsTable(items) {
  const tableBody = document.querySelector(".panel[data-maps] .mapitems-table-body");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const imageUrl = item.image || "";
    let categoryOptions = MAP_CATEGORIES.map(cat => `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat}</option>`).join("");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.name || ""}</td>
      <td><select class="mapitem-category-select" data-id="${item._id}">${categoryOptions}</select></td>
      <td>${item.formattedAddress || ""}</td>
      <td>
        <button class="mapitem-description-btn" data-id="${item._id}" data-value="${item.description || ""}" style="width: 100%; max-width: 150px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.description || "點擊編輯描述"}
        </button>
      </td>
      <td>${item.phone || ""}</td>
      <td style="max-width: 200px;">${formatOpeningHours(item.openingHours)}</td>
      <td>${item.longitude || ""}</td>
      <td>${item.latitude || ""}</td>
      <td>${item.website ? `<a href="${item.website}" target="_blank">連結</a>` : ""}</td>
      <td style="max-width: 200px;">
        <button class="mapitem-image-btn" data-id="${item._id}" data-value="${imageUrl}" style="width: 100%; margin-bottom: 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${imageUrl ? "點擊編輯圖片" : "點擊添加圖片"}
        </button>
        ${imageUrl ? `<img src="${imageUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'">` : ""}
      </td>
      <td style="max-width: 200px;">
        <button class="mapitem-menu-btn" data-id="${item._id}" data-value="${item.menuUrl || ""}" style="width: 100%; margin-bottom: 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.menuUrl ? "點擊編輯菜單連結" : "點擊添加菜單連結"}
        </button>
        ${formatMenuUrlsPreview(item.menuUrl)}
      </td>
      <td><button class="delete-mapitem-btn" data-id="${item._id}">刪除</button></td>
    `;
    tableBody.appendChild(tr);
  });
  // 類別選擇器
  document.querySelectorAll(".mapitem-category-select").forEach(select => {
    select.addEventListener("change", (e) => {
      const id = select.dataset.id;
      const newValue = select.value;
      updateMapItemField(id, "category", newValue);
    });
  });
  
  // 描述按鈕
  document.querySelectorAll(".mapitem-description-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const currentValue = btn.dataset.value;
      showEditModal("餐廳描述", currentValue, (newValue) => {
        updateMapItemField(id, "description", newValue);
        btn.dataset.value = newValue;
        btn.textContent = newValue || "點擊編輯描述";
      });
    });
  });
  
  // 圖片按鈕
  document.querySelectorAll(".mapitem-image-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const currentValue = btn.dataset.value;
      showEditModal("圖片URL", currentValue, (newValue) => {
        updateMapItemField(id, "image", newValue);
        btn.dataset.value = newValue;
        btn.textContent = newValue ? "點擊編輯圖片" : "點擊添加圖片";
      });
    });
  });
  
  // 菜單連結按鈕
  document.querySelectorAll(".mapitem-menu-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const currentValue = btn.dataset.value;
      showEditModal("菜單連結（可多個，以空白分隔）", currentValue, (newValue) => {
        if (newValue && !validateMenuUrls(newValue)) {
          alert("菜單連結格式不正確，請檢查 URL 格式");
          return;
        }
        updateMapItemField(id, "menuUrl", newValue);
        btn.dataset.value = newValue;
        btn.textContent = newValue ? "點擊編輯菜單連結" : "點擊添加菜單連結";
      });
    });
  });
  
  document.querySelectorAll(".delete-mapitem-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      if (confirm("確定要刪除此地標嗎？")) await deleteMapItem(id);
    });
  });
}

async function updateMapItemField(id, field, value) {
  try {
    const user = await getCurrentUserAsync();
    if (!user) {
      alert("請先登入！");
      return;
    }
    const idToken = await user.getIdToken();
    
    const body = {};
    body[field] = value;
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + idToken
      },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (!res.ok) throw new Error("更新失敗");
    
    // 更新成功後重新載入表格以更新預覽
    fetchMapItems();
  } catch (err) {
    alert("更新失敗");
  }
}

async function deleteMapItem(id) {
  try {
    const user = await getCurrentUserAsync();
    if (!user) {
      alert("請先登入！");
      return;
    }
    const idToken = await user.getIdToken();
    
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + idToken
      },
      credentials: "include",
    });
    if (!res.ok) throw new Error("刪除失敗");
    fetchMapItems();
  } catch (err) {
    alert("刪除失敗");
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const addRestaurantBtn = document.querySelector(".addRestaurant");
  if (addRestaurantBtn) {
    addRestaurantBtn.addEventListener("click", async function() {
      const category = document.querySelector(".restaurantType").value;
      const description = document.querySelector(".restaurantDescription").value;
      const placeId = document.querySelector(".restaurantPlaceId").value;
      const menuUrl = document.querySelector(".restaurantMenuUrl").value;
      const imageUrl = document.querySelector(".restaurantImage").value;

      if (!category || !description || !placeId) {
        alert("請填寫所有必填欄位");
        return;
      }

      // 驗證菜單連結格式
      if (menuUrl && !validateMenuUrls(menuUrl)) {
        alert("菜單連結格式不正確，請檢查 URL 格式");
        return;
      }

      // placeId 已直接由輸入欄取得，無需再解析

      let placeData;
      try {
        placeData = await fetchGooglePlaceDetails(placeId);
      } catch (err) {
        alert("Google Places API 取得資料失敗");
        return;
      }

      const body = {
        name: placeData.name,
        category,
        formattedAddress: placeData.formatted_address,
        description,
        phone: placeData.formatted_phone_number || "",
        openingHours: (placeData.opening_hours && placeData.opening_hours.weekday_text) ? placeData.opening_hours.weekday_text.join("; ") : "",
        longitude: placeData.geometry?.location?.lng,
        latitude: placeData.geometry?.location?.lat,
        website: placeData.website || "",
        image: imageUrl || (placeData.photos ? getGooglePhotoUrl(placeData.photos[0].photo_reference) : ""),
        placeId,
        menuUrl: menuUrl.trim(), // 保留原始格式，包含空白鍵
        isActive: true
      };

      try {
        const user = await getCurrentUserAsync();
        if (!user) {
          alert("請先登入！");
          return;
        }
        const idToken = await user.getIdToken();

        const res = await fetch(`${API_URL}/api/admin/maps`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + idToken
          },
          body: JSON.stringify(body),
          credentials: "include"
        });
        if (!res.ok) throw new Error("新增失敗");
        alert("新增成功");
        document.querySelector(".restaurantType").value = "";
        document.querySelector(".restaurantDescription").value = "";
        document.querySelector(".restaurantPlaceId").value = "";
        document.querySelector(".restaurantMenuUrl").value = "";
        document.querySelector(".restaurantImage").value = "";
        fetchMapItems();
      } catch (err) {
        alert("新增失敗");
      }
    });
  }
});

// 取出 place_id，只允許正確格式
async function extractPlaceIdFromUrl(url) {
  if (/maps\.app\.goo\.gl/.test(url)) {
    alert("Google Maps 短網址無法自動解析，請用瀏覽器打開後複製跳轉後的長網址再貼上。");
    return null;
  }
  // 只允許 g/xxxx 或 ChIJxxxx... 這種格式
  let match = url.match(/[?&]q=place_id:([a-zA-Z0-9_-]+)/);
  if (match && isValidPlaceId(match[1])) return match[1];
  match = url.match(/!16s%2Fg%2F([a-zA-Z0-9_-]+)/);
  if (match) return "g/" + match[1];
  match = url.match(/query_place_id=([a-zA-Z0-9_-]+)/);
  if (match && isValidPlaceId(match[1])) return match[1];
  // 0x...:0x... 這種格式直接提示
  match = url.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
  if (match) {
    alert("這不是 Google Places API 的 place_id，請用 Google Place ID Finder 查詢正確的 place_id，或貼上含 place_id 的 Google Maps 連結。");
    return null;
  }
  alert("請貼上含 place_id 的 Google Maps 連結，或用 Google Place ID Finder 查詢。");
  return null;
}

function isValidPlaceId(pid) {
  // g/xxxx 或 ChIJxxxx...
  return /^g\/[a-zA-Z0-9_-]+$/.test(pid) || /^ChIJ[a-zA-Z0-9_-]+$/.test(pid);
}

// 由前端呼叫自己的 server 代理 Google Places API，避免 CORS
async function fetchGooglePlaceDetails(placeId) {
  const user = await getCurrentUserAsync();
  if (!user) throw new Error("請先登入！");
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_URL}/api/admin/google-place-details?place_id=${encodeURIComponent(placeId)}`, {
    credentials: "include",
    headers: {
      "Authorization": "Bearer " + idToken
    }
  });
  const data = await res.json();
  if (data.status !== "OK") throw new Error("Google Places API error");
  return data.result;
}

function getGooglePhotoUrl(photoReference) {
  const apiKey = window.GOOGLE_MAPS_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
}

// 格式化多個菜單連結顯示
function formatMenuUrls(menuUrl) {
  if (!menuUrl || !menuUrl.trim()) return "無";
  
  const urls = menuUrl.trim().split(/\s+/); // 以空白鍵分割
  const validUrls = urls.filter(url => url && isValidUrl(url));
  
  if (validUrls.length === 0) return "無";
  
  return validUrls.map((url, index) => 
    `<a href="${url}" target="_blank">菜單${validUrls.length > 1 ? (index + 1) : ''}</a>`
  ).join(' ');
}

// 格式化菜單連結預覽（圖片預覽）
function formatMenuUrlsPreview(menuUrl) {
  if (!menuUrl || !menuUrl.trim()) return "";
  
  const urls = menuUrl.trim().split(/\s+/);
  const validUrls = urls.filter(url => url && (isValidUrl(url) || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)));
  
  if (validUrls.length === 0) return "";
  
  return validUrls.map((url, index) => 
    `<a href="${url}" target="_blank" style="display: inline-block; margin: 2px;">
      <img src="${url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" 
           onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" 
           alt="菜單${validUrls.length > 1 ? (index + 1) : ''}">
      <span style="display: none; font-size: 10px; color: #666; background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">菜單${validUrls.length > 1 ? (index + 1) : ''}</span>
    </a>`
  ).join('');
}

// 格式化營業時間，按星期幾換行
function formatOpeningHours(openingHours) {
  if (!openingHours || !openingHours.trim()) return "";
  
  const hours = openingHours.split("; ");
  if (hours.length <= 1) return openingHours;
  
  return hours.map(hour => {
    // 檢查是否包含星期幾
    const dayMatch = hour.match(/^(週[一二三四五六日]|星期[一二三四五六日]|週[1-7]|星期[1-7])/);
    if (dayMatch) {
      return `<div style="margin-bottom: 2px;"><strong>${dayMatch[0]}</strong>: ${hour.substring(dayMatch[0].length).trim()}</div>`;
    }
    return `<div style="margin-bottom: 2px;">${hour}</div>`;
  }).join('');
}

// 驗證 URL 格式
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 驗證多個菜單連結格式（支援圖片 URL）
function validateMenuUrls(menuUrl) {
  if (!menuUrl || !menuUrl.trim()) return true; // 空值視為有效
  
  const urls = menuUrl.trim().split(/\s+/);
  return urls.every(url => {
    if (url === "") return true;
    // 檢查是否為有效的 URL 或圖片 URL
    return isValidUrl(url) || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  });
}

// 顯示編輯模態框
function showEditModal(title, currentValue, onConfirm) {
  // 移除現有的模態框
  const existingModal = document.getElementById('editModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 創建模態框
  const modal = document.createElement('div');
  modal.id = 'editModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    min-width: 400px;
    max-width: 600px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  modalContent.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #645038;">編輯${title}</h3>
    <textarea id="editInput" style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;">${currentValue}</textarea>
    <div style="margin-top: 15px; text-align: right;">
      <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer;">取消</button>
      <button id="confirmBtn" style="padding: 8px 16px; border: 1px solid #645038; background: #645038; color: white; border-radius: 4px; cursor: pointer;">確認</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // 聚焦到輸入框
  const input = document.getElementById('editInput');
  input.focus();
  input.select();
  
  // 事件監聽器
  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('confirmBtn').addEventListener('click', () => {
    const newValue = input.value.trim();
    onConfirm(newValue);
    modal.remove();
  });
  
  // 按 ESC 鍵關閉
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // 點擊背景關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Google Place ID 查詢工具初始化
window.initMap = function initMap() {
  // 初始化顯示元素
  const placeNameElement = document.getElementById("place-name");
  const placeIdElement = document.getElementById("place-id");
  const placeAddressElement = document.getElementById("place-address");
  
  if (placeNameElement) placeNameElement.textContent = "尚未選擇";
  if (placeIdElement) placeIdElement.textContent = "尚未選擇";
  if (placeAddressElement) placeAddressElement.textContent = "尚未選擇";
  
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 23.0037, lng: 120.2145 }, // 台南大學附近
    zoom: 15,
  });
  const input = document.getElementById("pac-input");
  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "geometry", "formatted_address", "name"],
  });
  autocomplete.bindTo("bounds", map);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
  const infowindow = new google.maps.InfoWindow();
  const marker = new google.maps.Marker({ map: map });
  marker.addListener("click", () => {
    infowindow.open(map, marker);
  });
  autocomplete.addListener("place_changed", () => {
    infowindow.close();
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) {
      return;
    }
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
    marker.setPlace({
      placeId: place.place_id,
      location: place.geometry.location,
    });
    marker.setVisible(true);
    
    // 安全地更新顯示元素
    const placeNameElement = document.getElementById("place-name");
    const placeIdElement = document.getElementById("place-id");
    const placeAddressElement = document.getElementById("place-address");
    
    if (placeNameElement) placeNameElement.textContent = place.name || "未知";
    if (placeIdElement) placeIdElement.textContent = place.place_id || "未知";
    if (placeAddressElement) placeAddressElement.textContent = place.formatted_address || "未知";
    
    infowindow.open(map, marker);
    
    // 自動填入 Place ID 到上方表單
    const placeIdInput = document.querySelector(".restaurantPlaceId");
    if (placeIdInput) {
      placeIdInput.value = place.place_id || "";
      // 添加視覺反饋
      placeIdInput.style.backgroundColor = "#e8f5e8";
      setTimeout(() => {
        placeIdInput.style.backgroundColor = "";
      }, 2000);
    }
    
    // 可選：自動填入餐廳名稱到描述欄位（如果描述欄位為空）
    const descriptionInput = document.querySelector(".restaurantDescription");
    if (descriptionInput && !descriptionInput.value.trim() && place.name) {
      descriptionInput.value = place.name;
    }
    
    // 自動填入封面照片（如果有照片）
    const imageInput = document.querySelector(".restaurantImage");
    if (imageInput && place.photos && place.photos.length > 0) {
      const photoUrl = getGooglePhotoUrl(place.photos[0].photo_reference);
      imageInput.value = photoUrl;
      // 添加視覺反饋
      imageInput.style.backgroundColor = "#e8f5e8";
      setTimeout(() => {
        imageInput.style.backgroundColor = "";
      }, 2000);
    }
  });
}; 