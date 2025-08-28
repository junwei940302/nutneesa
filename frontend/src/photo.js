import { auth } from './firebaseApp.js';
import { onAuthStateChanged, getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

async function getAuthToken() {
    if (!auth.currentUser) {
        alert("請先登入！");
        window.location.href = "login.html";
        return null;
    }
    await auth.currentUser.reload();
    return await getIdToken(auth.currentUser);
}

async function incrementViewCount(albumId) {
    if (!albumId) return;
    try {
        await fetch(`${API_URL}/api/album/${albumId}/view`, {
            method: 'POST',
        });
    } catch (error) {
        console.error("Failed to increment view count, but continuing.", error);
    }
}

async function loadAlbumData(albumId) {
    const descriptionEl = document.querySelector('#description');
    const createdAtEl = document.querySelector('#createdAt');
    const albumNameEl = document.querySelector('#albumName');

    if (!albumNameEl || !createdAtEl || !descriptionEl) {
        console.error("Required DOM elements not found.");
        return;
    }

    try {
        await incrementViewCount(albumId);

        const res = await fetch(`${API_URL}/api/photoList`);
        const data = await res.json();
        
        const matchedAlbum = data.find(album => album.id === albumId);

        if (!matchedAlbum) {
            descriptionEl.textContent = '找不到指定的相簿';
            createdAtEl.textContent = '';
            albumNameEl.textContent = '錯誤';
            return;
        }

        albumNameEl.textContent = matchedAlbum.name;
        createdAtEl.innerHTML = `<i class="fa-solid fa-calendar"></i> 創建日期｜${new Date(matchedAlbum.createdAt._seconds * 1000).toLocaleDateString('zh-TW')}`;
        descriptionEl.innerHTML = `<i class="fa-solid fa-note-sticky"></i> 活動描述｜${matchedAlbum.description}`;

        await displayAlbumImages(albumId);

    } catch(err) {
        console.error("Error loading album data:", err);
        descriptionEl.textContent = '載入資料失敗';
    }
}

async function displayAlbumImages(albumId) {
    const idToken = await getAuthToken();
    if (!idToken) return;

    const gallery = document.querySelector('.gallery');
    if (!gallery) return;

    try {
        const res = await fetch(`${API_URL}/api/album/${albumId}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch images: ${res.statusText}`);
        }

        const imageUrls = await res.json();
        gallery.innerHTML = '';
        if (imageUrls.length === 0) {
            gallery.innerHTML = '<p>這個相簿沒有任何照片。</p>';
            return;
        }

        imageUrls.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "album image";
            img.loading = "lazy";
            gallery.appendChild(img);
        });
    } catch (error) {
        console.error("Error displaying album images:", error);
        gallery.innerHTML = '<p>無法載入相簿照片。</p>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const hashValue = window.location.hash.substring(1);
    if (!hashValue) {
        document.querySelector('#description').textContent = "錯誤：沒有指定相簿。請返回服務頁面重新選擇。";
        document.querySelector('#createdAt').textContent = "";
        document.querySelector('#albumName').textContent = "無效的相簿";
    } else {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                loadAlbumData(hashValue);
            } else {
                alert("您必須登入才能查看相簿。");
                window.location.href = 'login.html';
            }
        });
    }
});