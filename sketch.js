// Fetch Islamic prayer times for the user's current location using browser geolocation + Aladhan/Ummah-style prayer API
// Replace API URL/key if your specific Ummah API endpoint differs.

const favicon = "https://res.cloudinary.com/dl5ptl1zm/image/upload/v177791730/Islamic_Prayer_Times_Favicon_g2gfh0.png";

const optimizeBtn = document.getElementById("optimize-btn");
const prayerTimeElements = Array.from(document.getElementsByClassName("prayer-time"));
const currentPrayerNameElement = document.getElementById("current-prayer-name");
const currentPrayerTimeElement = document.getElementById("current-prayer-time-remaining");
const gregorianDateElement = document.getElementById("gregorian-date");
const hijriDateElement = document.getElementById("hijri-date");
const gregorianMonthElement = document.getElementById("gregorian-month");
const hijriMonthElement = document.getElementById("hijri-month");

let timings = {}, prayerTimes = {}, fetchedDate = {};
const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
let currentPrayer = null;
let updateTimingsIntervalId = null;
let getPrayerTimesIntervalId = null;
const notificationsScheduled = []; // Track scheduled notifications

sessionStorage.getItem("firstTime") && sessionStorage.removeItem("firstTime"); // Initialize first time flag in sessionStorage

optimizeBtn.addEventListener("click", () => {
  if (Boolean(localStorage.getItem("DenyRefreshment"))) {
    localStorage.removeItem("DenyRefreshment");
    optimizeBtn.textContent = "Switch to Low Power Mode";
    main(); // Restart the update loop with regular refreshment
  } else {
    localStorage.setItem("DenyRefreshment", "true");
    optimizeBtn.textContent = "Switch to Regular Mode";
    if (getPrayerTimesIntervalId) {
      clearInterval(getPrayerTimesIntervalId);
      getPrayerTimesIntervalId = null;
    }
  }
});

function initPrayerTimes() {
  let flag = 0;

  if (localStorage.getItem("prayerTimes")) {
    prayerTimes = JSON.parse(localStorage.getItem("prayerTimes"));
    flag |= 1;
    console.log("(initPrayerTimes) -> Loaded prayer times from localStorage:", prayerTimes);
  }
  if (localStorage.getItem("currentDate")) {
    fetchedDate = JSON.parse(localStorage.getItem("currentDate"));
    flag |= 2;
    console.log("\n\n\n(initPrayerTimes) -> Loaded current date from localStorage:", fetchedDate);
  }

  if (!flag) {
    console.warn("(initPrayerTimes) -> No cached prayer times or date found in localStorage.");
  } else if (flag < 3) {
    console.warn("(initPrayerTimes) -> Incomplete cached data in localStorage. Prayer times or date may be missing.");
  }
}

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
        enableHighAccuracy: true // Request high accuracy for better results
      }
    );
  }).then(position => {
    console.log("Geolocation successful:", position);
    return position;
  }).catch(async errorAccurate => {
    console.error("Could not fetch location with High Accuracy:", errorAccurate);
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          timeout: 10000, // 10 seconds timeout for fallback
          maximumAge: 120000, // Accept cached position up to 2 minutes old for fallback
          enableHighAccuracy: false // Disable high accuracy for fallback to save resources
        }
      );
    }).then(position => {
      console.log("Fallback geolocation successful:", position);
      return position;
    }).catch(error => {
      console.error("Could not fetch location with fallback:", error);
      !sessionStorage.getItem("firstTime") && alert("Unable to fetch your location. Please allow location access and refresh the page.", error.message);
      sessionStorage.setItem("firstTime", "true");
      // throw error;
    });
  });

  console.log(position);
  const { latitude, longitude } = position?.coords || {};

  // Step 2: Get current date
  const today = new Date();
  const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

  // Step 3: Fetch prayer times
  // Example endpoint (commonly compatible prayer API format)
  const response = await fetch(
    `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=2`
  );

  if (!response.ok) {
    console.error("Failed to fetch prayer times. Status:", response.status, "Status Text:", response.statusText);
  }

  const data = await response?.json() ?? {};

  console.table(data);

  // Step 4: Extract timings

  let timings = {}, prayerTimes = {}, fetchedDate = {};

  if (data.code === 200 && data.data && data.data.timings) {
    timings = data.data.timings;
    prayerTimes = {
      Fajr: { start: timings.Fajr, end: timings.Sunrise },
      Dhuhr: { start: timings.Dhuhr, end: timings.Asr },
      Asr: { start: timings.Asr, end: timings.Maghrib },
      Maghrib: { start: timings.Maghrib, end: timings.Isha },
      Isha: { start: timings.Isha, end: timings.Fajr }
    };
    fetchedDate = data.data.date;

    sessionStorage.removeItem("firstTime"); // Clear first time flag on successful fetch

    console.log("Location:", latitude, longitude);
    console.log("Date:", fetchedDate);
    console.table(prayerTimes);
  } else {
    prayerTimes = JSON.parse(localStorage.getItem("prayerTimes")) || {};
    fetchedDate = JSON.parse(localStorage.getItem("currentDate")) || {};
    console.warn("Failed to fetch prayer times, using cached data from localStorage if available.");
  }


  // Handle cases where API response is missing or malformed, and use cached data if available
  if (Object.entries(prayerTimes).length < 1) {
    if (localStorage.getItem("prayerTimes")) {
      prayerTimes = JSON.parse(localStorage.getItem("prayerTimes"));
      console.warn("Failed to fetch prayer times, using cached data from localStorage.");
    } else {
      console.error("Failed to fetch prayer times and no cached data available.");
      return;
    }
  } else if (localStorage.getItem("prayerTimes") != JSON.stringify(prayerTimes)) {
    console.log("Caching prayer times for offline use...");
    localStorage.setItem("prayerTimes", JSON.stringify(prayerTimes));
  }

  if (Object.entries(fetchedDate).length < 1) {
    if (localStorage.getItem("currentDate")) {
      fetchedDate = JSON.parse(localStorage.getItem("currentDate"));
      console.warn("Failed to fetch current date, using cached data from localStorage.");
    } else {
      console.error("Failed to fetch current date and no cached data available.");
      return;
    }
  } else if (localStorage.getItem("currentDate") != JSON.stringify(fetchedDate)) {
    console.log("Caching current date for offline use...");
    localStorage.setItem("currentDate", JSON.stringify(fetchedDate));
  }

  return [timings, prayerTimes, fetchedDate];
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
      currentPrayerTimeElement.textContent = `${Math.floor((endTime - nowTime) / 60)}:${Math.floor((endTime - nowTime) % 60)}:${Math.floor((60 - (today.getSeconds())) % 60)} hours remaining`;
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
      currentPrayerTimeElement.textContent = `${Math.floor((endTime + (1440 - nowTime)) / 60)}:${Math.floor((startTime + (1440 - nowTime)) % 60)}:${Math.floor((60 - (today.getSeconds())) % 60)} hours remaining`;
    } else {
      currentPrayerTimeElement.textContent = `${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) / 60)}:${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) % 60)}:${Math.floor((60 - (today.getSeconds())) % 60)} hours remaining`;
    }
  }

  tempStartDate.setHours(...prayerTimes.Fajr.end.split(":").map(Number));
  tempEndDate.setHours(...prayerTimes.Dhuhr.start.split(":").map(Number));
  if (tempStartDate.getHours() * 60 + tempStartDate.getMinutes() <= today.getHours() * 60 + today.getMinutes() && tempEndDate.getHours() * 60 + tempEndDate.getMinutes() > today.getHours() * 60 + today.getMinutes()) {
    currentPrayerNameElement.textContent = "No Prayer Currently";
    const startTime = tempStartDate.getHours() * 60 + tempStartDate.getMinutes();
    const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();
    const nowTime = today.getHours() * 60 + today.getMinutes();

    currentPrayer = null;
    // console.log(`No Prayer - Start: ${startTime}, End: ${endTime}, Now: ${nowTime}`);
    currentPrayerTimeElement.textContent = `${Math.floor((endTime - nowTime) / 60)}:${Math.floor((endTime - nowTime) % 60)}:${Math.floor((60 - (today.getSeconds())) % 60)} hours until Dhuhr`;
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
  [timings, prayerTimes, fetchedDate] = await getPrayerTimes() ?? [{}, {}, {}];

  // Align the first update to the next 10-minute mark for better accuracy and performance
  updateTimings(timings, prayerTimes); // Initial update immediately after fetching times

  gregorianDateElement.textContent = fetchedDate?.gregorian?.date ?? "--/--/----";
  hijriDateElement.textContent = fetchedDate?.hijri?.date ?? "--/--/----";
  gregorianMonthElement.textContent = fetchedDate?.gregorian?.month?.en ?? "Gregorian month";
  hijriMonthElement.textContent = fetchedDate?.hijri?.month?.en ?? "Hijri month";

  // Clear any existing interval to prevent multiple intervals running simultaneously
  if (updateTimingsIntervalId) {
    clearInterval(updateTimingsIntervalId);
  }

  rescheduleNotifications(); // Schedule notifications based on the newly fetched prayer times

  const now = new Date();

  setTimeout(async () => {
    await updateTimings(timings, prayerTimes);
    updateTimingsIntervalId = setInterval(() => updateTimings(timings, prayerTimes), 1000); // Update every second
  }, 1000 - now.getMilliseconds());
}


function main() {
  const now = new Date();

  if (Boolean(localStorage.getItem("DenyRefreshment"))) {
    console.log("Low Memory Mode enabled. Timings will not be refreshed automatically.");
    optimizeBtn.textContent = "Switch to Regular Mode";
  } else {
    console.log("High Memory Mode enabled. Timings will be refreshed every minute.");
    optimizeBtn.textContent = "Switch to Low Memory Mode";
  }

  initPrayerTimes(); // Load cached prayer times and date from localStorage if available

  updateTimingsLoop();
  setTimeout(() => {
    updateTimingsLoop();
    if (!Boolean(localStorage.getItem("DenyRefreshment"))) {
      console.log("Starting automatic refresh of prayer times every minute.");
      console.log("DenyRefreshment:", Boolean(localStorage.getItem("DenyRefreshment")));
      if (!getPrayerTimesIntervalId) {
        getPrayerTimesIntervalId = setInterval(updateTimingsLoop, 60000); // Fetch new prayer times every minute to account for date changes and location updates
        console.log("getPrayerTimesIntervalId set for automatic refresh every minute.", getPrayerTimesIntervalId);
      }
    }

    const now = new Date();
    const splitCurrentPrayerTime = prayerTimes[currentPrayer]?.end.split(":").map(Number) || [0, 0];

    // if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 1) {
    //   scheduleNotification(`Only one minute left for ${currentPrayer}`, 1000);
    // } else if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 5) {
    //   scheduleNotification(`Only five minutes left for ${currentPrayer}. Time for ${prayerNames[prayerNames.indexOf(currentPrayer) + 1]} is approaching`, 1000);
    // } else if (Math.abs(now.getHours() * 60 + now.getMinutes() - (splitCurrentPrayerTime[0] * 60 + splitCurrentPrayerTime[1])) <= 0) {
    //   scheduleNotification(`Time for ${currentPrayer} has ended. It's time for ${prayerNames[prayerNames.indexOf(currentPrayer) + 1]}`, 1000);
    // }

  }, (60 - (now.getSeconds() % 60)) * 1000 - now.getMilliseconds()); // Align the first fetch to the next minute mark for better accuracy and performance
}

// Run function
main();










// Service Worker registration for offline support and caching
if ("serviceWorker" in navigator) {
  console.log("Registering Service Worker...");

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(async reg => {
        console.log("SW registered", reg);
        // Request notification permission after SW registration
        await enableNotifications();
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

  if (Notification.permission === "granted") {
    console.log("Notifications already enabled.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notifications enabled.");

    // Test push notification after permission is granted
    testNotification();
  } else {
    console.log("Notifications denied.");
  }
}

// Function to schedule a notification for a specific prayer time (for demonstration purposes)
function scheduleNotification(title, body, delayMs) {
  const timeoutId = setTimeout(() => {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: favicon
      });
    });
  }, delayMs);

  // Store the timeout ID to allow cancellation if needed
  notificationsScheduled.push(timeoutId);
}

function rescheduleNotifications() {
  if (!currentPrayer) {
    return; // No current prayer, so no notifications to schedule
  }

  // Clear any previously scheduled notifications to avoid duplicates when prayer times are updated
  notificationsScheduled.forEach(timeoutId => clearTimeout(timeoutId)); // Clear any previously scheduled notifications
  notificationsScheduled.length = 0; // Clear the array of scheduled notifications

  // Schedule notifications for the current prayer time if applicable
  const today = new Date();
  const tempEndDate = new Date();
  tempEndDate.setHours(...prayerTimes[currentPrayer]?.end.split(":").map(Number) || [0, 0]);

  // Calculate the time until the current prayer ends in milliseconds
  const nowTime = today.getHours() * 60 + today.getMinutes();
  const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();

  // Calculate the time until the current prayer ends in milliseconds, accounting for seconds to ensure notifications are scheduled accurately
  const timeUntilEnd = Math.floor((endTime - nowTime) * 60 * 1000 - today.getSeconds() * 1000); // Time until current prayer ends in milliseconds

  // If the current prayer time has already ended, we can skip scheduling notifications for it
  if (timeUntilEnd <= 0) {
    return;
  }

  if (timeUntilEnd > 0) {
    // Schedule a notification for 5 minutes before the prayer ends
    if (timeUntilEnd > 5 * 60 * 1000) {
      scheduleNotification(`Time for ${currentPrayer} has ended.`, "The prayer time ends in 5 minutes.", timeUntilEnd - 5 * 60 * 1000);
    }
    // Schedule a notification for 1 minute before the prayer ends
    if (timeUntilEnd > 1 * 60 * 1000) {
      scheduleNotification(`Time for ${currentPrayer} has ended.`, "The prayer time ends in 1 minute.", timeUntilEnd - 1 * 60 * 1000);
    }
    // Schedule a notification for when the prayer ends
    scheduleNotification(`Time for ${currentPrayer} has ended.`, "The prayer time has ended.", timeUntilEnd);
  }
}

// Test function to trigger a notification immediately for debugging purposes
function testNotification() {
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification("Prayer Times", {
      body: "Thanks for enabling notifications! You'll receive updates for prayer times.",
      icon: favicon
    });
  });
}