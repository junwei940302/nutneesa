import { db, auth } from './firebaseApp.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const phonographForm = document.getElementById('phonographForm');
    if (phonographForm) {
        phonographForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const messageTextarea = document.getElementById('phonographMessage');
            const statusElement = document.getElementById('phonographStatus');
            const submitButton = phonographForm.querySelector('input[type="submit"]');

            if (!messageTextarea.value.trim()) {
                statusElement.textContent = "訊息不能為空！";
                statusElement.style.color = 'red';
                return;
            }

            submitButton.disabled = true;
            statusElement.textContent = "傳送中...";
            statusElement.style.color = 'inherit';

            try {
                const user = auth.currentUser;
                const messageData = {
                    message: messageTextarea.value,
                    createdAt: serverTimestamp(),
                    isAnonymous: !user,
                    userId: user ? user.uid : null,
                    userName: user ? user.displayName : "匿名",
                };

                await addDoc(collection(db, "phonograph_messages"), messageData);

                statusElement.textContent = "您的訊息已成功留聲！感謝您的分享。";
                statusElement.style.color = 'green';
                messageTextarea.value = '';

            } catch (error) {
                console.error("Error sending message:", error);
                statusElement.textContent = "傳送失敗，請稍後再試。";
                statusElement.style.color = 'red';
            } finally {
                submitButton.disabled = false;
                setTimeout(() => {
                    statusElement.textContent = "";
                }, 5000);
            }
        });
    }
});
