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
    const photoUrl = (item.photos && item.photos.length > 0 && item.photos[0].url) ? item.photos[0].url : "";
    let categoryOptions = MAP_CATEGORIES.map(cat => `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat}</option>`).join("");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><select class="mapitem-category-select" data-id="${item._id}">${categoryOptions}</select></td>
      <td><span class="mapitem-description" data-id="${item._id}">${item.description || ""}</span></td>
      <td><span class="mapitem-googlemapurl" data-id="${item._id}">${item.googleMapUrl || ""}</span> <button class="edit-mapitem-googlemapurl-btn" data-id="${item._id}">修改</button></td>
      <td><span class="mapitem-menuurl" data-id="${item._id}">${item.menuUrl || ""}</span></td>
      <td><span class="mapitem-photo" data-id="${item._id}">${photoUrl ? `<a href="${photoUrl}" target="_blank">檢視</a>` : "無"}</span></td>
      <td><button class="delete-mapitem-btn" data-id="${item._id}">刪除</button></td>
    `;
    tableBody.appendChild(tr);
  });
  document.querySelectorAll(".mapitem-category-select").forEach(select => {
    select.addEventListener("change", (e) => {
      const id = select.dataset.id;
      const newValue = select.value;
      updateMapItemField(id, "category", newValue);
    });
  });
  document.querySelectorAll(".edit-mapitem-googlemapurl-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const span = document.querySelector(`.mapitem-googlemapurl[data-id="${id}"]`);
      const oldValue = span ? span.textContent : "";
      const newValue = prompt("請輸入新的 Google map 連結", oldValue);
      if (newValue !== null && newValue !== oldValue) updateMapItemField(id, "googleMapUrl", newValue);
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
    const body = {};
    body[field] = value;
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (!res.ok) throw new Error("更新失敗");
    fetchMapItems();
  } catch (err) {
    alert("更新失敗");
  }
}

async function deleteMapItem(id) {
  try {
    const res = await fetch(`${API_URL}/api/admin/maps/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("刪除失敗");
    fetchMapItems();
  } catch (err) {
    alert("刪除失敗");
  }
}

function showOpeningHoursModal(id, openingHours) {
  const modal = document.createElement("div");
  modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `background: white; padding: 20px; border-radius: 8px; min-width: 300px; max-width: 90vw; max-height: 80vh; overflow-y: auto;`;
  let html = `<h3>營業時段</h3><table style="width:100%;"><thead><tr><th>星期</th><th>開</th><th>關</th><th>操作</th></tr></thead><tbody class="modal-openinghours-tbody">`;
  if (openingHours.length === 0) {
    html += `<tr><td colspan="4" style="text-align:center;">無資料</td></tr>`;
  } else {
    openingHours.forEach((h, i) => {
      html += `<tr>
        <td><select class="modal-openingDay">
          <option value="monday" ${h.day==="monday"?"selected":""}>星期一</option>
          <option value="tuesday" ${h.day==="tuesday"?"selected":""}>星期二</option>
          <option value="wednesday" ${h.day==="wednesday"?"selected":""}>星期三</option>
          <option value="thursday" ${h.day==="thursday"?"selected":""}>星期四</option>
          <option value="friday" ${h.day==="friday"?"selected":""}>星期五</option>
          <option value="saturday" ${h.day==="saturday"?"selected":""}>星期六</option>
          <option value="sunday" ${h.day==="sunday"?"selected":""}>星期日</option>
        </select></td>
        <td><input type="time" class="modal-openingTime" value="${h.open||""}"></td>
        <td><input type="time" class="modal-closingTime" value="${h.close||""}"></td>
        <td><button type="button" class="modal-removeOpeningHours">移除</button></td>
      </tr>`;
    });
  }
  html += `</tbody></table><button class="modal-addOpeningHours">新增時段</button>`;
  html += `<div style="text-align:center;margin-top:20px;"><button class="modal-saveOpeningHours" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">儲存</button> <button class="modal-closeOpeningHours" style="padding:8px 16px;background:#aaa;color:white;border:none;border-radius:4px;cursor:pointer;">關閉</button></div>`;
  modalContent.innerHTML = html;
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  const tbody = modalContent.querySelector(".modal-openinghours-tbody");
  modalContent.querySelector(".modal-addOpeningHours").addEventListener("click", () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select class="modal-openingDay">
        <option value="monday">星期一</option>
        <option value="tuesday">星期二</option>
        <option value="wednesday">星期三</option>
        <option value="thursday">星期四</option>
        <option value="friday">星期五</option>
        <option value="saturday">星期六</option>
        <option value="sunday">星期日</option>
      </select></td>
      <td><input type="time" class="modal-openingTime"></td>
      <td><input type="time" class="modal-closingTime"></td>
      <td><button type="button" class="modal-removeOpeningHours">移除</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-removeOpeningHours")) {
      e.target.closest("tr").remove();
      if (tbody.children.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="4" style="text-align:center;">無資料</td>`;
        tbody.appendChild(noDataRow);
      }
    }
  });
  modalContent.querySelector(".modal-saveOpeningHours").addEventListener("click", () => {
    const rows = tbody.querySelectorAll("tr");
    const hours = [];
    rows.forEach(row => {
      const daySel = row.querySelector(".modal-openingDay");
      const openInput = row.querySelector(".modal-openingTime");
      const closeInput = row.querySelector(".modal-closingTime");
      if (daySel && openInput && closeInput) {
        hours.push({ day: daySel.value, open: openInput.value, close: closeInput.value, closed: false });
      }
    });
    updateMapItemField(id, "openingHours", hours);
    modal.remove();
  });
  modalContent.querySelector(".modal-closeOpeningHours").addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

const addRestaurantBtn = document.querySelector(".addRestaurant");
if (addRestaurantBtn) {
  addRestaurantBtn.addEventListener("click", async function() {
    const category = document.querySelector(".restaurantType").value;
    const description = document.querySelector(".restaurantDescription").value;
    const googleMapUrl = document.querySelector(".restaurantGoogleMapUrl").value;
    const menuUrl = document.querySelector(".restaurantMenuUrl").value;

    if (!category || !description || !googleMapUrl) {
      alert("請填寫所有必填欄位");
      return;
    }

    const placeId = extractPlaceIdFromUrl(googleMapUrl);
    if (!placeId) {
      alert("Google map連結格式錯誤，請確認連結中包含 place_id");
      return;
    }

    let placeData;
    try {
      placeData = await fetchGooglePlaceDetails(placeId);
    } catch (err) {
      alert("Google Places API 取得資料失敗");
      return;
    }

    const body = {
      category,
      description,
      googleMapUrl,
      menuUrl,
      name: placeData.name,
      formattedAddress: placeData.formatted_address,
      longitude: placeData.geometry?.location?.lng,
      latitude: placeData.geometry?.location?.lat,
      phone: placeData.formatted_phone_number || "",
      photos: placeData.photos ? [{ url: getGooglePhotoUrl(placeData.photos[0].photo_reference) }] : [],
      website: placeData.website || "",
      isActive: true
    };

    try {
      const res = await fetch(`${API_URL}/api/admin/maps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });
      if (!res.ok) throw new Error("新增失敗");
      alert("新增成功");
      document.querySelector(".restaurantType").value = "";
      document.querySelector(".restaurantDescription").value = "";
      document.querySelector(".restaurantGoogleMapUrl").value = "";
      document.querySelector(".restaurantMenuUrl").value = "";
      fetchMapItems();
    } catch (err) {
      alert("新增失敗");
    }
  });
}

function extractPlaceIdFromUrl(url) {
  const match = url.match(/[?&]q=place_id:([a-zA-Z0-9_-]+)/) || url.match(/\/place\/.*\/data=!3m1!4b1!4m5!3m4!1s([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchGooglePlaceDetails(placeId) {
  const apiKey = window.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&language=zh-TW`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") throw new Error("Google Places API error");
  return data.result;
}

function getGooglePhotoUrl(photoReference) {
  const apiKey = window.GOOGLE_MAPS_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
} 