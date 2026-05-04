// Fetch Islamic prayer times for the user's current location using browser geolocation + Aladhan/Ummah-style prayer API
// Replace API URL/key if your specific Ummah API endpoint differs.

const favicon = "https://res.cloudinary.com/dl5ptl1zm/image/upload/v177791730/Islamic_Prayer_Times_Favicon_g2gfh0.png";

const prayerTimeElements = Array.from(document.getElementsByClassName("prayer-time"));
const currentPrayerNameElement = document.getElementById("current-prayer-name");
const currentPrayerTimeElement = document.getElementById("current-prayer-time-remaining");
const gregorianDateElement = document.getElementById("gregorian-date");
const hijriDateElement = document.getElementById("hijri-date");
const gregorianMonthElement = document.getElementById("gregorian-month");
const hijriMonthElement = document.getElementById("hijri-month");

let timings = {};
let prayerTimes = {};
const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
let currentPrayer = null;
let updateTimingsIntervalId = null;

async function getPrayerTimes() {
  // Step 1: Get current location
  const position = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        timeout: 10000, // 10 seconds timeout
        maximumAge: 60000, // Accept cached position up to 1 minute old
        enableHighAccuracy: false // Request high accuracy for better results
      }
    );
  }).then(position => {
    console.log("Geolocation successful:", position);
    return position;
  }).catch(error => {
    console.error("Geolocation error:", error);
    alert(error.message);
    throw error;
  });

  console.log(position);
  const { latitude, longitude } = position.coords;

  // Step 2: Get current date
  const today = new Date();
  const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

  // Step 3: Fetch prayer times
  // Example endpoint (commonly compatible prayer API format)
  const response = await fetch(
    `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=2`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch prayer times.");
  }

  const data = await response.json();

  console.table(data);

  // Step 4: Extract timings
  const timings = data.data.timings;
  const prayerTimes = {
    Fajr: { start: timings.Fajr, end: timings.Sunrise },
    Dhuhr: { start: timings.Dhuhr, end: timings.Asr },
    Asr: { start: timings.Asr, end: timings.Maghrib },
    Maghrib: { start: timings.Maghrib, end: timings.Isha },
    Isha: { start: timings.Isha, end: timings.Fajr }
  };

  console.log("Location:", latitude, longitude);
  console.log("Date:", date);
  console.table(prayerTimes);

  gregorianDateElement.textContent = data.data.date.gregorian.date;
  hijriDateElement.textContent = data.data.date.hijri.date;
  gregorianMonthElement.textContent = data.data.date.gregorian.month.en;
  hijriMonthElement.textContent = data.data.date.hijri.month.en;

  return [timings, prayerTimes];
}

async function updateTimings(timings, prayerTimes) {
  // console.log("Updating prayer times...");
  // console.table(prayerTimes);

  const today = new Date();
  const tempStartDate = new Date();
  const tempEndDate = new Date();

  Object.keys(prayerTimes).forEach(prayer => {
    tempStartDate.setHours(...prayerTimes[prayer].start.split(":").map(Number));
    tempEndDate.setHours(...prayerTimes[prayer].end.split(":").map(Number));

    const startTime = tempStartDate.getHours() * 60 + tempStartDate.getMinutes();
    const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();
    const nowTime = today.getHours() * 60 + today.getMinutes();

    // console.log(`${prayer} - Start: ${startTime}, End: ${endTime}, Now: ${nowTime}`);

    if (startTime <= nowTime && endTime > nowTime) {
      // console.log("Prayer time found!", prayer, startTime, endTime, nowTime);
      currentPrayerNameElement.textContent = prayer;
      currentPrayerTimeElement.textContent = `${Math.floor((endTime - nowTime) / 60)}:${Math.floor((endTime - nowTime) % 60)} hours remaining`;
      currentPrayer = prayer;
    }
  });

  tempStartDate.setHours(...prayerTimes.Isha.start.split(":").map(Number));
  tempEndDate.setHours(...prayerTimes.Isha.end.split(":").map(Number));
  if (tempStartDate.getHours() * 60 + tempStartDate.getMinutes() <= today.getHours() * 60 + today.getMinutes() || tempEndDate.getHours() * 60 + tempEndDate.getMinutes() > today.getHours() * 60 + today.getMinutes()) {
    currentPrayerNameElement.textContent = "Isha";
    const startTime = tempStartDate.getHours() * 60 + tempStartDate.getMinutes();
    const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();
    const nowTime = today.getHours() * 60 + today.getMinutes();

    currentPrayer = "Isha";
    // console.log(`Isha - Start: ${startTime}, End: ${endTime}, Now: ${nowTime}`);

    if (startTime <= nowTime) {
      currentPrayerTimeElement.textContent = `${Math.floor((endTime + (1440 - nowTime)) / 60)}:${Math.floor((startTime + (1440 - nowTime)) % 60)} hours remaining`;
    } else {
      currentPrayerTimeElement.textContent = `${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) / 60)}:${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) % 60)}:${Math.floor((60 - (today.getSeconds())) % 60)} hours remaining`;
    }
  }

  // Step 5: Update the UI with the fetched prayer times
  prayerTimeElements.forEach((element) => {
    const splitId = element.id.split("-");
    const prayerName = splitId[0].charAt(0).toUpperCase() + splitId[0].slice(1); // Get the prayer name from the element ID (e.g., "fajr-start" -> "Fajr")
    const prayerTime = splitId[1]; // Get the time type from the element ID (e.g., "fajr-start" -> "start")
    element.textContent = prayerTimes[prayerName][prayerTime];

    if (prayerName === currentPrayerNameElement.textContent) {
      element.classList.add("current-prayer");
    } else {
      element.classList.remove("current-prayer");
    }
  });

  return prayerTimes;
}

async function updateTimingsLoop() {
  [timings, prayerTimes] = await getPrayerTimes();
  // Align the first update to the next 10-minute mark for better accuracy and performance
  updateTimings(timings, prayerTimes); // Initial update immediately after fetching times

  // Clear any existing interval to prevent multiple intervals running simultaneously
  if (updateTimingsIntervalId) {
    clearInterval(updateTimingsIntervalId);
  }

  const now = new Date();

  await setTimeout(async () => {
    await updateTimings(timings, prayerTimes);
    updateTimingsIntervalId = setInterval(() => updateTimings(timings, prayerTimes), 1000); // Update every second
  }, 1000 - now.getMilliseconds());
}


function main() {
  const now = new Date();
  updateTimingsLoop();
  setTimeout(() => {
    updateTimingsLoop();
    setInterval(updateTimingsLoop, 60000); // Fetch new prayer times every minute to account for date changes and location updates

    const now = new Date();
    const splitCurrentPrayerTime = prayerTimes[currentPrayer]?.end.split(":").map(Number) || [0, 0];

    if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 1) {
      scheduleNotification(`Only one minute left for ${currentPrayer}`, 1000);
    } else if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 5) {
      scheduleNotification(`Only five minutes left for ${currentPrayer}. Time for ${prayerNames[prayerNames.indexOf(currentPrayer) + 1]} is approaching`, 1000);
    } else if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 0) {
      scheduleNotification(`Time for ${currentPrayer} has ended. It's time for ${prayerNames[prayerNames.indexOf(currentPrayer) + 1]}`, 1000);
    }
  }, (60 - (now.getSeconds() % 60)) * 1000 - now.getMilliseconds()); // Align the first fetch to the next minute mark for better accuracy and performance
}

// Run function
main();










// Service Worker registration for offline support and caching
if ("serviceWorker" in navigator) {
  console.log("Registering Service Worker...");

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(async reg => {
        console.log("SW registered", reg);
        // Request notification permission after SW registration
        await enableNotifications();

        // Test push notification after permission is granted
        // testNotification();
      })
      .catch(err => console.log("SW failed", err));
  });
}

// Function to request notification permission from the user
async function enableNotifications() {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notifications enabled.");
  } else {
    console.log("Notifications denied.");
  }
}

// Function to schedule a notification for a specific prayer time (for demonstration purposes)
function scheduleNotification(prayerName, delayMs) {
  setTimeout(() => {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(`Time for ${prayerName}`, {
        body: `${prayerName} prayer has started.`,
        icon: favicon
      });
    });
  }, delayMs);
}

// Test function to trigger a notification immediately for debugging purposes
function testNotification() {
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification("Prayer Times", {
      body: "Test notification successful.",
      icon: favicon
    });
  });
}