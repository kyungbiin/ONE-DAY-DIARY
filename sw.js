/* ========================================
   ONE DAY DIARY - Service Worker
   - 매일 지정 시간에 알림 전송
   ======================================== */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// 1분마다 알림 시간 체크
let timerInterval = null;
let savedTime = '09:00';
let lastNotifiedDate = '';

function startTimer(time) {
  savedTime = time;
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    if (currentTime === savedTime && lastNotifiedDate !== today) {
      lastNotifiedDate = today;
      self.registration.showNotification('ONE DAY DIARY', {
        body: '오늘의 질문이 기다리고 있어요',
        icon: './images/name.png',
        badge: './images/name.png',
        tag: 'daily-diary-' + today,
        renotify: false,
        vibrate: [200, 100, 200],
      });
    }
  }, 30000); // 30초마다 체크 (분 단위 정확도)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'START_NOTIFICATION') {
    startTimer(event.data.time);
  } else if (event.data.type === 'STOP_NOTIFICATION') {
    stopTimer();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
