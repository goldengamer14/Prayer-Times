const favicon = "https://res.cloudinary.com/dl5ptl1zm/image/upload/v177791730/Islamic_Prayer_Times_Favicon_g2gfh0.png";

self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("Service Worker active");
});

self.addEventListener("push", event => {
    const data = event.data?.text() || "Prayer time reminder";

    event.waitUntil(
        self.registration.showNotification("Prayer Times", {
            body: data,
            icon: favicon
        })
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow("/")
    );
});

async function enableNotifications() {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        console.log("Notifications enabled");
    }
}

self.addEventListener("message", event => {
    if (event.data === "enableNotifications") {
        enableNotifications();
    }
});
