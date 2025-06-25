//介面控制
const funcPicker = document.querySelector('.funcPicker');
const panels = {
    '控制中心｜Dashboard': document.querySelector('.panel[data-dashboard]'),
    '歷史紀錄｜History': document.querySelector('.panel[data-history]'),
    '會員管理｜Members': document.querySelector('.panel[data-members]'),
    '金流管理｜Flow': document.querySelector('.panel[data-flow]'),
    '偏好設定｜Settings': document.querySelector('.panel[data-settings]'),
};

function showPanel(selected) {
    Object.keys(panels).forEach(key => {
        if (key === selected) {
            panels[key].style.display = '';
        } else {
            panels[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showPanel(funcPicker.value);

// 監聽選擇變更
funcPicker.addEventListener('change', function() {
    showPanel(this.value);
});

//控制中心Dashboard

const publishNowCheckbox = document.querySelector('.publishNowCheckbox');
const arrangePublish = document.querySelector('.arrangePublish');

if(publishNowCheckbox.checked){
    arrangePublish.disabled = true;

}else if(!publishNowCheckbox.checked){
    arrangePublish.disabled = false;

}

publishNowCheckbox.addEventListener('change', function() {
    arrangePublish.disabled = this.checked;
});


//金流管理Flow

const incomeAndOutcome = document.querySelector('.incomeAndOutcome');
const flowOption = {
    '收入｜Income': document.querySelector('.incomeType'),
    '支出｜Outcome': document.querySelector('.outcomeType'),
    '轉帳｜Transfer': document.querySelector('.transferType'),
};

function showFlowOption(selected) {
    Object.keys(flowOption).forEach(key => {
        if (key === selected) {
            flowOption[key].style.display = 'block';
        } else {
            flowOption[key].style.display = 'none';
        }
    });
}

// 初始化顯示
showFlowOption(incomeAndOutcome.value);

// 監聽選擇變更
incomeAndOutcome.addEventListener('change', function() {
    showFlowOption(this.value);
});

async function fetchNews() {
    try {
        const response = await fetch(`${API_URL}/api/admin/news`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const news = await response.json();
        populateNewsTable(news);
    } catch (error) {
        console.error('Failed to fetch news:', error);
    }
}

function populateNewsTable(news) {
    const tableBody = document.querySelector('.panel[data-dashboard] .news-table-body');
    if (!tableBody) {
        console.error('News table body not found');
        return;
    }

    tableBody.innerHTML = ''; // Clear existing rows

    news.forEach((item, index) => {
        const row = document.createElement('tr');
        const createDate = new Date(item.createDate).toLocaleString('zh-TW');
        const publishDate = new Date(item.publishDate).toLocaleString('zh-TW');

        row.innerHTML = `
            <td><input type="checkbox" class="visibility-checkbox" data-id="${item._id}" ${item.visibility ? 'checked' : ''}></td>
            <td>${index + 1}</td>
            <td>${item.type}</td>
            <td>${item.content}</td>
            <td>${createDate}</td>
            <td>${publishDate}</td>
            <td>${item.publisher}</td>
            <td><button class="delete-news-btn" data-id="${item._id}">刪除</button></td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.visibility-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const newsId = event.target.dataset.id;
            const isVisible = event.target.checked;
            updateNewsVisibility(newsId, isVisible);
        });
    });

    document.querySelectorAll('.delete-news-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const newsId = event.target.dataset.id;
            if (confirm('確定要刪除這則消息嗎？')) {
                deleteNews(newsId);
            }
        });
    });
}

async function deleteNews(id) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete news');
        }

        fetchNews(); // Refresh the table
    } catch (error) {
        console.error('Error deleting news:', error);
        alert('刪除消息失敗');
    }
}

async function updateNewsVisibility(id, visibility) {
    try {
        const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ visibility }),
        });

        if (!response.ok) {
            throw new Error('Failed to update visibility');
        }
    } catch (error) {
        console.error('Error updating news visibility:', error);
        // Optionally, revert checkbox state on failure
        fetchNews();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
});

const addNewsButton = document.querySelector('.addNews');
addNewsButton.addEventListener('click', async () => {
    const newsType = document.querySelector('.newsType').value;
    const newsContent = document.getElementById('newsContent').value;
    const publishNow = document.querySelector('.publishNowCheckbox').checked;
    const publishDate = document.querySelector('.arrangePublish').value;

    if (!newsContent) {
        alert('消息內容為必填！');
        return;
    }

    const body = {
        type: newsType,
        content: newsContent,
        visibility: true,
        createDate: new Date().toISOString(),
        publishDate: publishNow ? new Date().toISOString() : new Date(publishDate).toISOString(),
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error('Failed to add news');
        }

        document.getElementById('newsContent').value = '';
        fetchNews();
    } catch (error) {
        console.error('Error adding news:', error);
        alert('新增消息失敗');
    }
});