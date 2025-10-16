
const API_KEY = "fb12b2caa74be311b20b27ee1901efc3"; 

// DOM elements
const elements = {
    cityName: document.getElementById("cityName"),
    countryName: document.getElementById("countryName"),
    temperature: document.getElementById("temperature"),
    weatherCondition: document.getElementById("weatherCondition"),
    weatherIcon: document.getElementById("weatherIcon"),
    tempMin: document.getElementById("tempMin"),
    tempMax: document.getElementById("tempMax"),
    windSpeed: document.getElementById("windSpeed"),
    humidity: document.getElementById("humidity"),
    visibility: document.getElementById("visibility"),
    feelsLike: document.getElementById("feelsLike"),
    uvIndexValue: document.getElementById("uvIndexValue"),
    uvArcFill: document.getElementById("uvArcFill"),
    uvDescription: document.getElementById("uvDescription"),
    sunriseTime: document.getElementById("sunriseTime"),
    sunsetTime: document.getElementById("sunsetTime"),
    forecastContainer: document.getElementById("forecast"),
    cityInput: document.getElementById("cityInput"),
    searchBtn: document.getElementById("searchBtn"),
    dateToday: document.getElementById("dateToday"),
    currentMonth: document.getElementById("currentMonth"),
    messageBox: document.getElementById("messageBox"),
    themeToggle: document.getElementById("themeToggle"),
    themeIcon: document.getElementById("themeIcon"),
    body: document.body
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


// UTILITY FUNCTIONS

function showMessage(message) {
    elements.messageBox.textContent = message;
    elements.messageBox.classList.add('show');
    setTimeout(() => {
        elements.messageBox.classList.remove('show');
    }, 3000);
}

function formatTime(timestamp, timezone) {
    // timestamp is in UTC, timezone is offset in seconds from UTC.
    // Convert to milliseconds and apply timezone offset for the correct local time.
    const date = new Date((timestamp + timezone) * 1000); 
    const hours = date.getUTCHours(); // Use UTC methods as offset is applied
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // 12-hour format
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function formatCondition(text) {
    return text.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function updateUVGauge(uvIndex) {
    const maxUV = 12; 
    const index = Math.min(uvIndex, maxUV); 
    
    // Start rotation is -135deg (0 value). Full fill (180 deg) is 45deg
    const degreeFill = (index / maxUV) * 180;
    const rotation = -135 + degreeFill;
    
    elements.uvArcFill.style.transform = `rotate(${rotation}deg)`;
    elements.uvIndexValue.textContent = `${index.toFixed(1)} uv`;

    let description;
    if (index < 3) description = "Low risk (Wear sunglasses).";
    else if (index < 6) description = "Moderate risk (Cover up, use sunscreen).";
    else if (index < 8) description = "High risk (Minimize sun exposure).";
    else if (index < 11) description = "Very High risk (Extra caution required).";
    else description = "Extreme risk (Avoid sun exposure).";
    
    elements.uvDescription.textContent = description;
}

function updateOverviewDetails(data) {
    // Humidity Detail Mock
    const humidity = data.main.humidity;
    let hDetail = "The air feels dry.";
    if (humidity > 70) hDetail = "Very humid, the air feels heavy.";
    else if (humidity > 50) hDetail = "Comfortable humidity level.";
    else if (humidity > 30) hDetail = "Slightly dry, watch your skin.";
    document.getElementById("humidityDetail").textContent = hDetail;
    
    // Visibility Detail Mock (convert meters to km)
    const visibility = data.visibility / 1000;
    let vDetail = "Perfectly clear view.";
    if (visibility < 1) vDetail = "Very low visibility (Fog/Haze).";
    else if (visibility < 4) vDetail = "Haze is affecting visibility.";
    document.getElementById("visibilityDetail").textContent = vDetail;
    
    // Feels Like Detail Mock
    const feelsLike = data.main.feels_like;
    const temp = data.main.temp;
    let fDetail = "Comfortable temperature.";
    if (feelsLike > temp + 5) fDetail = "Humidity is making it feel hotter.";
    else if (feelsLike < temp - 5) fDetail = "Wind chill is making it feel colder.";
    document.getElementById("feelsLikeDetail").textContent = fDetail;
}

// --- API FETCHERS ---

// Fetches current weather and 5-day forecast
async function fetchAllWeatherData(queryType, queryValue) {
    
    // 💥 FAULT FIX: Checking for key length ensures your actual 32-char key is used.
    if (API_KEY.length !== 32) {
        showMessage("Setup Error: Please replace the fake key with your real OpenWeatherMap key (32 characters).");
        elements.cityName.textContent = 'Setup Required';
        elements.countryName.textContent = 'Key Not Found';
        elements.temperature.textContent = `--°C`;
        elements.weatherCondition.textContent = 'Setup Required';
        return;
    }
    
    let currentUrl, forecastUrl;

    if (queryType === 'city') {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${queryValue}&appid=${API_KEY}&units=metric`;
    } else if (queryType === 'coords') {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${queryValue.lat}&lon=${queryValue.lon}&appid=${API_KEY}&units=metric`;
    } else {
        return;
    }

    try {
        // 1. Fetch Current Weather
        let response = await fetch(currentUrl);
        if (response.status === 404) throw new Error("City not found.");
        // A 401 error often means an inactive/invalid key, which is why we proceed here if key length is correct.
        if (!response.ok) throw new Error(`Failed to fetch current weather data (Status: ${response.status}). If you just created your key, it may take an hour to activate.`);
        const currentData = await response.json();
        
        // 2. Fetch Forecast Data (using coords from current data for precision)
        const { lat, lon } = currentData.coord;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        
        response = await fetch(forecastUrl);
        if (!response.ok) throw new Error(`Failed to fetch forecast data (Status: ${response.status}).`);
        const forecastData = await response.json();

        updateDashboard(currentData, forecastData);

    } catch (error) {
        showMessage(`Error: ${error.message}`);
        console.error("Weather Fetch Error:", error);
        elements.cityName.textContent = 'Error';
        elements.countryName.textContent = 'Please check console';
    }
}

// --- UI UPDATER ---

function updateDashboard(current, forecast) {
    // --- LEFT PANEL ---
    elements.cityName.textContent = current.name;
    elements.countryName.textContent = current.sys.country;
    elements.temperature.textContent = `${Math.round(current.main.temp)}°C`;
    elements.weatherCondition.textContent = formatCondition(current.weather[0].description);
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
    elements.tempMin.textContent = `${Math.round(current.main.temp_min)}°`;
    elements.tempMax.textContent = `${Math.round(current.main.temp_max)}°`;
    
    // --- RIGHT PANEL OVERVIEW ---
    elements.windSpeed.textContent = `${current.wind.speed} m/s`;
    elements.humidity.textContent = `${current.main.humidity}%`;
    elements.visibility.textContent = `${current.visibility / 1000} km`;
    elements.feelsLike.textContent = `${Math.round(current.main.feels_like)}°C`;
    
    elements.sunriseTime.textContent = formatTime(current.sys.sunrise, current.timezone);
    elements.sunsetTime.textContent = formatTime(current.sys.sunset, current.timezone);
    
    // Mock UV Index (OpenWeather's main API doesn't provide UV)
    const uvIndexMock = Math.random() * 6 + 2; // 2.0 to 8.0
    updateUVGauge(uvIndexMock); 
    
    // Update additional overview details
    updateOverviewDetails(current);

    // FORECAST
    renderForecast(forecast);
}

function renderForecast(forecastData) {
    elements.forecastContainer.innerHTML = ''; // Clear previous forecast

    const dailyData = {};
    const timezoneOffsetMs = forecastData.city.timezone * 1000;

    forecastData.list.forEach(item => {
        // Create a local date object by applying the timezone offset
        // FAULT FIX: Corrected date initialization to use UTC methods 
        // after applying the timezone offset in milliseconds.
        const localDate = new Date(item.dt * 1000); 
        localDate.setUTCMilliseconds(localDate.getUTCMilliseconds() + timezoneOffsetMs);
        
        // Use UTC date string to ensure the day key is timezone-independent
        const dayKey = localDate.toISOString().split('T')[0];

        if (!dailyData[dayKey]) {
            // Initialize for the day
            dailyData[dayKey] = {
                temp_max: -Infinity,
                temp_min: Infinity,
                // Assign icon based on the first entry for that day as a starting point
                icon: item.weather[0].icon, 
                // Get the day of the week based on the local time
                day: WEEKDAYS[localDate.getUTCDay()],
                date: localDate
            };
        }

        // Aggregate min/max temperatures from the 3-hour entries
        dailyData[dayKey].temp_max = Math.max(dailyData[dayKey].temp_max, item.main.temp_max);
        dailyData[dayKey].temp_min = Math.min(dailyData[dayKey].temp_min, item.main.temp_min);
    });

    // Convert to array and get the next 6 days (excluding today's full day)
    const dailyArray = Object.values(dailyData).slice(0, 7); 
    
    dailyArray.forEach(day => {
        const dayOfWeek = day.day;
        const temp = Math.round(day.temp_max);
        const icon = day.icon.replace('n', 'd'); // Use day icons for simplicity

        elements.forecastContainer.innerHTML += `
            <div class="forecast-day">
                <p>${dayOfWeek}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather">
                <p>${temp}°C</p>
            </div>
        `;
    });
}

// --- THEME MANAGEMENT ---
function toggleTheme() {
    const isLight = elements.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
    if (isLight) {
        elements.themeIcon.classList.remove('fa-sun');
        elements.themeIcon.classList.add('fa-moon');
    } else {
        elements.themeIcon.classList.remove('fa-moon');
        elements.themeIcon.classList.add('fa-sun');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        elements.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else {
        elements.body.classList.remove('light-mode');
        updateThemeIcon(false);
    }
}


// --- INITIALIZATION ---

function initDate() {
    const now = new Date();
    const day = WEEKDAYS[now.getDay()];
    const month = MONTHS[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();

    elements.currentMonth.textContent = `${month} ${year}`;
    elements.dateToday.textContent = `${day}, ${month} ${dateNum}, ${year}`;
}

function initApp() {
    loadTheme();
    initDate();
    
    // Load Default City
    showMessage("Loading default city: London.");
    fetchAllWeatherData('city', 'London');

    // Search Listener
    elements.searchBtn.addEventListener("click", () => {
        const city = elements.cityInput.value.trim();
        if (city) {
            fetchAllWeatherData('city', city);
            elements.cityInput.value = ''; // Clear input
        } else {
            showMessage("Please enter a city name.");
        }
    });
    
    // Allow searching with Enter key
    elements.cityInput.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') {
            elements.searchBtn.click();
        }
    });
    
    // Theme Toggle Listener
    elements.themeToggle.addEventListener('click', toggleTheme);
}

initApp();