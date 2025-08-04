document.addEventListener("DOMContentLoaded", ()=>{
    //window.showLoading();
    const hashValue = window.location.hash.substring(1); // 去掉 `#`
    if(hashValue === ""){
        document.querySelector('#description').textContent = "請返回選單";
        document.querySelector('#createdAt').textContent = "無法載入日期";
        document.querySelector('#albumName').textContent = "發生錯誤";
        //window.hideLoading();
        
    }else{
        loadPhotoData(hashValue);
        //window.hideLoading();
    }   
});

async function loadPhotoData(hashValue) {
    try{
        const description = document.querySelector('#description');
        const res = await fetch(`${API_URL}/api/photoList`);
        const data = await res.json();
        
        if (data.length === 0) {
            description.textContent = '目前沒有任何相簿';
            return;
        }

        // 搜尋對應 id 的相簿資料
        const matchedAlbum = data.find(photoList => photoList.id === hashValue);

        if (!matchedAlbum) {
            description.textContent = '找不到指定的相簿 ID';
            return;
        }

        // ✅ 在這裡處理 matchedAlbum，例如顯示資訊
        displayAlbum(matchedAlbum);


    }catch(err){
        console.error("發生錯誤", err);
        description.textContent = '載入資料失敗';
    }
}

async function displayAlbum(album) {
    document.querySelector('#albumName').textContent = album.name;
    document.querySelector('#createdAt').innerHTML = '<i class="fa-solid fa-calendar"></i> 創建日期｜'+new Date(album.createdAt._seconds * 1000 + Math.floor(album.createdAt._nanoseconds / 1e6)).toLocaleDateString('zh-TW');
    document.querySelector('#description').innerHTML = '<i class="fa-solid fa-note-sticky"></i> 活動描述｜'+album.description;
    
    try {
        const user = await getCurrentUserAsync();
        if (!user) {
            return false;
        }
        await user.reload(true);
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/album/${album.id}`, {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        const imageUrls = await res.json();
        const gallery = document.querySelector('.gallery');
        gallery.innerHTML = '';
        imageUrls.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "album image";
            img.loading = "lazy"; // 加快載入效能
            gallery.appendChild(img);
          });
        // TODO: render images
        return true;     
    } catch {
        return false;
    }
}