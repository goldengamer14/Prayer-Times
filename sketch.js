// Fetch Islamic prayer times for the user's current location using browser geolocation + Aladhan/Ummah-style prayer API
// Replace API URL/key if your specific Ummah API endpoint differs.

const prayerTimeElements = Array.from(document.getElementsByClassName("prayer-time"));
const currentPrayerNameElement = document.getElementById("current-prayer-name");
const currentPrayerTimeElement = document.getElementById("current-prayer-time-remaining");
const gregorianDateElement = document.getElementById("gregorian-date");
const hijriDateElement = document.getElementById("hijri-date");
const gregorianMonthElement = document.getElementById("gregorian-month");
const hijriMonthElement = document.getElementById("hijri-month");

let timings = {};
let prayerTimes = {};

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

  console.log(data);

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
  console.log("Updating prayer times...");
  console.table(prayerTimes);

  const today = new Date();
  const tempStartDate = new Date();
  const tempEndDate = new Date();

  Object.keys(prayerTimes).forEach(prayer => {
    tempStartDate.setHours(...prayerTimes[prayer].start.split(":").map(Number));
    tempEndDate.setHours(...prayerTimes[prayer].end.split(":").map(Number));

    const startTime = tempStartDate.getHours() * 60 + tempStartDate.getMinutes();
    const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();
    const nowTime = today.getHours() * 60 + today.getMinutes();

    console.log(`${prayer} - Start: ${startTime}, End: ${endTime}, Now: ${nowTime}`);

    if (startTime <= nowTime && endTime > nowTime) {
      console.log("Prayer time found!", prayer, startTime, endTime, nowTime);
      currentPrayerNameElement.textContent = prayer;
      currentPrayerTimeElement.textContent = `${Math.floor((endTime - nowTime) / 60)}:${Math.floor((endTime - nowTime) % 60)} hours remaining`;
    }
  });

  tempStartDate.setHours(...prayerTimes.Isha.start.split(":").map(Number));
  tempEndDate.setHours(...prayerTimes.Isha.end.split(":").map(Number));
  if (tempStartDate.getHours() * 60 + tempStartDate.getMinutes() <= today.getHours() * 60 + today.getMinutes() || tempEndDate.getHours() * 60 + tempEndDate.getMinutes() > today.getHours() * 60 + today.getMinutes()) {
    currentPrayerNameElement.textContent = "Isha";
    const startTime = tempStartDate.getHours() * 60 + tempStartDate.getMinutes();
    const endTime = tempEndDate.getHours() * 60 + tempEndDate.getMinutes();
    const nowTime = today.getHours() * 60 + today.getMinutes();

    if (startTime <= nowTime) {
      currentPrayerTimeElement.textContent = `${Math.floor((endTime + (1440 - nowTime)) / 60)}:${Math.floor((startTime + (1440 - nowTime)) % 60)} hours remaining`;
    } else {
      currentPrayerTimeElement.textContent = `${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) / 60)}:${Math.floor((tempEndDate.getHours() * 60 + tempEndDate.getMinutes() - (today.getHours() * 60 + today.getMinutes())) % 60)} hours remaining`;
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


async function main() {
  [timings, prayerTimes] = await getPrayerTimes();
  // Align the first update to the next 10-minute mark for better accuracy and performance
  updateTimings(timings, prayerTimes); // Initial update immediately after fetching times
  const now = new Date();
  await setTimeout(async () => {
    await updateTimings(timings, prayerTimes);
    setInterval(() => updateTimings(timings, prayerTimes), 60000); // Update every 10 seconds
  }, (60 - (now.getSeconds() % 60)) * 1000 - now.getMilliseconds());
}

// Run function
main();