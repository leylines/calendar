import './styles.css';
import SunCalc from 'suncalc';
import Holidays from 'date-holidays';
import { EclipticGeoMoon, SearchMoonNode, MakeTime } from 'astronomy-engine';

// Initialize holidays for multiple countries, sorting DE first
const HOLIDAY_COUNTRIES = ['DE', 'AT', 'CH', 'FR', 'US', 'GB'];
const hdInstances = HOLIDAY_COUNTRIES.map(code => ({ code, inst: new Holidays(code) }));

// Constants and Data
const MONTHS = 13;
const DAYS_PER_MONTH = 28;
const START_MONTH = 2; // March (0-indexed)
const START_DAY = 21; // March 21st
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const ELEMENTS = {
    'Feuer': { name: 'Feuer', icon: '🔥' },
    'Erde': { name: 'Erde', icon: '🌍' },
    'Luft': { name: 'Luft', icon: '💨' },
    'Wasser': { name: 'Wasser', icon: '💧' },
    'Äther': { name: 'Äther', icon: '✨' }
};

// 13 Zodiac Signs (IAU Boundaries approximation)
const ZODIACS = [
    { name: 'Steinbock', start: '01-20', end: '02-15', icon: '♑', element: ELEMENTS['Erde'] },
    { name: 'Wassermann', start: '02-16', end: '03-11', icon: '♒', element: ELEMENTS['Luft'] },
    { name: 'Fische', start: '03-12', end: '04-18', icon: '♓', element: ELEMENTS['Wasser'] },
    { name: 'Widder', start: '04-19', end: '05-13', icon: '♈', element: ELEMENTS['Feuer'] },
    { name: 'Stier', start: '05-14', end: '06-19', icon: '♉', element: ELEMENTS['Erde'] },
    { name: 'Zwillinge', start: '06-20', end: '07-20', icon: '♊', element: ELEMENTS['Luft'] },
    { name: 'Krebs', start: '07-21', end: '08-09', icon: '♋', element: ELEMENTS['Wasser'] },
    { name: 'Löwe', start: '08-10', end: '09-15', icon: '♌', element: ELEMENTS['Feuer'] },
    { name: 'Jungfrau', start: '09-16', end: '10-30', icon: '♍', element: ELEMENTS['Erde'] },
    { name: 'Waage', start: '10-31', end: '11-22', icon: '♎', element: ELEMENTS['Luft'] },
    { name: 'Skorpion', start: '11-23', end: '11-29', icon: '♏', element: ELEMENTS['Wasser'] },
    { name: 'Schlangenträger (Ophiuchus)', start: '11-30', end: '12-17', icon: '⛎', element: ELEMENTS['Äther'] },
    { name: 'Schütze', start: '12-18', end: '12-31', icon: '♐', element: ELEMENTS['Feuer'] },
    { name: 'Schütze', start: '01-01', end: '01-19', icon: '♐', element: ELEMENTS['Feuer'] } // Handling year wrap-around
];

// 12 Traditional Zodiac Signs (Tropical Boundaries approximation)
const TRADITIONAL_ZODIACS = [
    { name: 'Steinbock', start: '12-22', end: '12-31', icon: '♑', element: ELEMENTS['Erde'] },
    { name: 'Steinbock', start: '01-01', end: '01-19', icon: '♑', element: ELEMENTS['Erde'] }, // wrap around
    { name: 'Wassermann', start: '01-20', end: '02-18', icon: '♒', element: ELEMENTS['Luft'] },
    { name: 'Fische', start: '02-19', end: '03-20', icon: '♓', element: ELEMENTS['Wasser'] },
    { name: 'Widder', start: '03-21', end: '04-19', icon: '♈', element: ELEMENTS['Feuer'] },
    { name: 'Stier', start: '04-20', end: '05-20', icon: '♉', element: ELEMENTS['Erde'] },
    { name: 'Zwillinge', start: '05-21', end: '06-20', icon: '♊', element: ELEMENTS['Luft'] },
    { name: 'Krebs', start: '06-21', end: '07-22', icon: '♋', element: ELEMENTS['Wasser'] },
    { name: 'Löwe', start: '07-23', end: '08-22', icon: '♌', element: ELEMENTS['Feuer'] },
    { name: 'Jungfrau', start: '08-23', end: '09-22', icon: '♍', element: ELEMENTS['Erde'] },
    { name: 'Waage', start: '09-23', end: '10-22', icon: '♎', element: ELEMENTS['Luft'] },
    { name: 'Skorpion', start: '10-23', end: '11-21', icon: '♏', element: ELEMENTS['Wasser'] },
    { name: 'Schütze', start: '11-22', end: '12-21', icon: '♐', element: ELEMENTS['Feuer'] }
];

// Jahreskreis-Feste (Sabbats / Cardinals)
const YEAR_WHEEL = {
    '03-21': 'Ostara (Frühlingstagundnachtgleiche)',
    '05-01': 'Beltane',
    '06-21': 'Litha (Sommersonnenwende)',
    '08-01': 'Lughnasadh (Lammas)',
    '09-23': 'Mabon (Herbsttagundnachtgleiche)',
    '11-01': 'Samhain',
    '12-21': 'Yul (Wintersonnenwende)',
    '02-01': 'Imbolc'
};

// State
let currentYear = new Date().getFullYear(); // Gregorian year of the 13-month calendar start
let currentPeriodIndex = 0; // Month index (0-12) or Week index (0-51) or Day index (0-365)
let currentView = 'month'; // 'month', 'week', 'day'
let userEvents = {}; // Map 'YYYY-MM-DD' (Gregorian) to array of events
let yearlyEvents = {}; // Map 'MM-DD' to array of events that repeat every year
let userLat = null;
let userLng = null;

// DOM Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const calendarGrid = document.getElementById('calendarGrid');
const weekdaysHeader = document.getElementById('weekdays');
const todayBtn = document.getElementById('todayBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentPeriodLabel = document.getElementById('currentPeriod');
const viewDropdownBtn = document.getElementById('viewDropdownBtn');
const optMonth = document.getElementById('optMonth');
const optWeek = document.getElementById('optWeek');
const optDay = document.getElementById('optDay');
const csvUpload = document.getElementById('csvUpload');
const locationBtn = document.getElementById('locationBtn');
const modal = document.getElementById('modal');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadLocalCsv();
    
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
        });
    }
    
    // Default to day view on mobile
    if (window.innerWidth <= 768) {
        currentView = 'day';
        viewDropdownBtn.innerHTML = `Tagesansicht <span class="ml-2 text-[0.6rem]">▼</span>`;
    }
    
    initCalendar();
    
    todayBtn.addEventListener('click', () => {
        initCalendar();
    });
    
    prevBtn.addEventListener('click', () => changePeriod(-1));
    nextBtn.addEventListener('click', () => changePeriod(1));
    
    // Swipe Gestures for Mobile
    let touchstartX = 0;
    let touchendX = 0;
    let touchstartY = 0;
    let touchendY = 0;
    
    calendarGrid.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
        touchstartY = e.changedTouches[0].screenY;
    }, {passive: true});

    calendarGrid.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        touchendY = e.changedTouches[0].screenY;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        const xDiff = touchendX - touchstartX;
        const yDiff = touchendY - touchstartY;
        
        // Only trigger horizontal swipe if horizontal movement is greater than vertical movement and > threshold
        if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50) {
            if (xDiff < 0) {
                changePeriod(1); // Swipe left -> Next
            } else {
                changePeriod(-1); // Swipe right -> Prev
            }
        }
    }
    
    const setView = (newView) => {
        if (newView === currentView) return;

        // Try to land on 'today' if we are currently looking at the period containing 'today'
        const today = new Date();
        let tempYear = today.getFullYear();
        const yearStart = new Date(tempYear, START_MONTH, START_DAY);
        if (today < yearStart) tempYear--;
        
        const diff = Math.floor((today - new Date(tempYear, START_MONTH, START_DAY)) / (1000 * 60 * 60 * 24));
        const todayMonth = Math.floor(diff / DAYS_PER_MONTH);
        const todayWeek = Math.floor(diff / 7);
        const todayDay = diff;

        let currentlyViewingToday = false;
        if (tempYear === currentYear) {
            if (currentView === 'month' && currentPeriodIndex === todayMonth) currentlyViewingToday = true;
            if (currentView === 'week' && currentPeriodIndex === todayWeek) currentlyViewingToday = true;
            if (currentView === 'day' && currentPeriodIndex === todayDay) currentlyViewingToday = true;
        }

        if (currentlyViewingToday) {
            if (newView === 'month') currentPeriodIndex = todayMonth;
            if (newView === 'week') currentPeriodIndex = todayWeek;
            if (newView === 'day') currentPeriodIndex = todayDay;
        } else {
            // Find absolute day index of the start of the current period
            let absoluteStartDay = 0;
            if (currentView === 'month') absoluteStartDay = currentPeriodIndex * DAYS_PER_MONTH;
            if (currentView === 'week') absoluteStartDay = currentPeriodIndex * 7;
            if (currentView === 'day') absoluteStartDay = currentPeriodIndex;

            if (newView === 'month') currentPeriodIndex = Math.min(Math.floor(absoluteStartDay / DAYS_PER_MONTH), MONTHS);
            if (newView === 'week') currentPeriodIndex = Math.min(Math.floor(absoluteStartDay / 7), 52);
            if (newView === 'day') currentPeriodIndex = absoluteStartDay;
        }

        currentView = newView;
        let viewLabel = 'Monatsansicht';
        if (currentView === 'week') viewLabel = 'Wochenansicht';
        if (currentView === 'day') viewLabel = 'Tagesansicht';
        
        viewDropdownBtn.innerHTML = `${viewLabel} <span class="ml-2 text-[0.6rem]">▼</span>`;
        if (document.activeElement) document.activeElement.blur(); // Close DaisyUI dropdown
        renderCalendar();
    };

    optMonth.addEventListener('click', () => setView('month'));
    optWeek.addEventListener('click', () => setView('week'));
    optDay.addEventListener('click', () => setView('day'));
    
    csvUpload.addEventListener('change', handleCsvUpload);
    
    locationBtn.addEventListener('click', () => {
        if ("geolocation" in navigator) {
            locationBtn.textContent = '⏳ ...';
            navigator.geolocation.getCurrentPosition((position) => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                locationBtn.textContent = '📍 Aktiv';
                locationBtn.classList.add('text-[var(--color-gold)]', 'border-[var(--color-gold)]');
                renderCalendar();
            }, (error) => {
                console.error("Error getting location:", error);
                locationBtn.textContent = '❌ Fehler';
                setTimeout(() => locationBtn.textContent = '📍 Standort', 3000);
            }, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 3600000
            });
        } else {
            alert("Geolocation wird von Deinem Browser nicht unterstützt.");
        }
    });
});

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getYearLength(year) {
    const nextYear = year + 1;
    // Length from Mar 21 of `year` to Mar 20 of `nextYear`
    return isLeapYear(nextYear) ? 366 : 365;
}

function getGregorianDateFromIndex(year, index) {
    const date = new Date(year, START_MONTH, START_DAY, 12, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
}

function formatGregorianDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Moon Phase Approximation using suncalc
function getMoonPhase(date) {
    const moonIllumination = SunCalc.getMoonIllumination(date);
    const phase = moonIllumination.phase; // 0 to 1
    
    // Convert to 8 phases
    if (phase < 0.03 || phase > 0.97) return '🌑 Neumond';
    if (phase < 0.22) return '🌒 Zun. Sichel';
    if (phase < 0.28) return '🌓 Erstes Viertel';
    if (phase < 0.47) return '🌔 Zun. Mond';
    if (phase < 0.53) return '🌕 Vollmond';
    if (phase < 0.72) return '🌖 Abn. Mond';
    if (phase < 0.78) return '🌗 Letztes Viertel';
    return '🌘 Abn. Sichel';
}

function getAstroTimes(date) {
    if (userLat === null || userLng === null) return null;
    
    const times = SunCalc.getTimes(date, userLat, userLng);
    const moonTimes = SunCalc.getMoonTimes(date, userLat, userLng);
    
    // Obsigend / Nidsigend (Ascending / Descending Moon Path in tropical/sidereal agriculture)
    // Based on crossing the Ecliptic (Moon Nodes).
    // User requested specifically:
    // When Moon Ecliptic Latitude is positive (> 0) -> Nidsigend
    // When Moon Ecliptic Latitude is negative (< 0) -> Obsigend
    const utcNoonToday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
    const moonEcliptic = EclipticGeoMoon(utcNoonToday);
    const isObsigend = moonEcliptic.lat < 0;
    
    // Check for node transition today
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    const startOfAstroDay = MakeTime(startOfDay);
    const nextNode = SearchMoonNode(startOfAstroDay);
    
    let transitionText = null;
    let transitionTextShort = null;
    
    if (nextNode && nextNode.time.date >= startOfDay && nextNode.time.date <= endOfDay) {
        const timeStr = nextNode.time.date.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
        if (nextNode.kind === 1) { // Ascending node (crosses to positive lat) -> Nidsigend
            transitionText = `Wechsel nach Nidsigend um ${timeStr}`;
            transitionTextShort = `➔ Nidsig. ${timeStr}`;
        } else { // Descending node (crosses to negative lat) -> Obsigend
            transitionText = `Wechsel nach Obsigend um ${timeStr}`;
            transitionTextShort = `➔ Obsig. ${timeStr}`;
        }
    }
    
    const fmt = (d) => d && !isNaN(d.getTime()) ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
    
    return {
        sunrise: fmt(times.sunrise),
        sunset: fmt(times.sunset),
        moonrise: fmt(moonTimes.rise),
        moonset: fmt(moonTimes.set),
        obsigend: isObsigend,
        transitionText: transitionText,
        transitionTextShort: transitionTextShort
    };
}

function getZodiac(date) {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    for (let i = 0; i < ZODIACS.length; i++) {
        if (mmdd >= ZODIACS[i].start && mmdd <= ZODIACS[i].end) {
            return ZODIACS[i];
        }
    }
    return { name: 'Unbekannt', icon: '❓', element: { name: 'Unbekannt', icon: '❓' } };
}

function getTraditionalZodiac(date) {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    for (let i = 0; i < TRADITIONAL_ZODIACS.length; i++) {
        if (mmdd >= TRADITIONAL_ZODIACS[i].start && mmdd <= TRADITIONAL_ZODIACS[i].end) {
            return TRADITIONAL_ZODIACS[i];
        }
    }
    return { name: 'Unbekannt', icon: '❓', element: { name: 'Unbekannt', icon: '❓' } };
}

function initCalendar() {
    const today = new Date();
    // Determine which 13-month year we are in
    const yearStart = new Date(today.getFullYear(), START_MONTH, START_DAY);
    currentYear = today.getFullYear();
    if (today < yearStart) {
        currentYear--;
    }
    
    // Find current day index
    const diff = Math.floor((today - new Date(currentYear, START_MONTH, START_DAY)) / (1000 * 60 * 60 * 24));
    
    if (currentView === 'week') {
        currentPeriodIndex = Math.floor(diff / 7);
    } else if (currentView === 'day') {
        currentPeriodIndex = diff;
    } else {
        currentPeriodIndex = Math.floor(diff / DAYS_PER_MONTH);
        if (currentPeriodIndex >= MONTHS) currentPeriodIndex = MONTHS - 1; // Cap at 13 for festival days
    }
    
    renderCalendar();
}

function changePeriod(delta) {
    currentPeriodIndex += delta;
    
    const yearDays = getYearLength(currentYear);
    let maxIndex = MONTHS; 
    if (currentView === 'week') maxIndex = 52;
    if (currentView === 'day') maxIndex = yearDays - 1;
    
    if (currentPeriodIndex < 0) {
        currentYear--;
        const prevYearDays = getYearLength(currentYear);
        if (currentView === 'week') currentPeriodIndex = 52;
        if (currentView === 'day') currentPeriodIndex = prevYearDays - 1;
        if (currentView === 'month') currentPeriodIndex = MONTHS - 1;
    } else if (currentPeriodIndex > maxIndex) {
        currentYear++;
        currentPeriodIndex = 0;
    }
    
    renderCalendar();
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarGrid.className = 'grid gap-1 md:gap-2 transition-all'; // Reset class
    weekdaysHeader.className = 'hidden'; // Default hidden

    const yearDays = getYearLength(currentYear);
    
    if (currentView === 'week') {
        renderWeekView(yearDays);
        weekdaysHeader.className = 'hidden md:grid grid-cols-7 gap-1 md:gap-2 text-center font-medium mb-4 border-b border-[var(--theme-border-gold)] pb-2 heading-mystic text-xs md:text-sm text-[color-mix(in_srgb,var(--theme-gold)_80%,transparent)] uppercase transition-all';
    } else if (currentView === 'day') {
        renderDayView(yearDays);
    } else {
        renderMonthView(yearDays);
        if (currentPeriodIndex < MONTHS) {
            weekdaysHeader.className = 'grid grid-cols-7 gap-1 md:gap-2 text-center font-medium mb-4 border-b border-[var(--theme-border-gold)] pb-2 heading-mystic text-xs md:text-sm text-[color-mix(in_srgb,var(--theme-gold)_80%,transparent)] uppercase transition-all';
        }
    }
}

function renderMonthView(yearDays) {
    currentPeriodLabel.textContent = `Monat ${currentPeriodIndex + 1} (${currentYear}-${currentYear + 1})`;
    
    let startDayIndex = currentPeriodIndex * DAYS_PER_MONTH;
    let numDays = DAYS_PER_MONTH;
    
    // Check if we are past the 13 months -> render special days
    if (currentPeriodIndex === MONTHS) {
        currentPeriodLabel.textContent = `Festtage (${currentYear}-${currentYear + 1})`;
        numDays = yearDays - (MONTHS * DAYS_PER_MONTH); // 1 or 2
        calendarGrid.classList.add(`grid-cols-${numDays}`);
    } else {
        calendarGrid.classList.add('grid-cols-7');
    }
    
    for (let i = 0; i < numDays; i++) {
        const dayIndex = startDayIndex + i;
        if (dayIndex >= yearDays) break;
        calendarGrid.appendChild(createDayCell(dayIndex, currentPeriodIndex === MONTHS, 'month'));
    }
}

function renderWeekView(yearDays) {
    currentPeriodLabel.textContent = `Woche ${currentPeriodIndex + 1} (${currentYear}-${currentYear + 1})`;
    
    let startDayIndex = currentPeriodIndex * 7;
    calendarGrid.classList.add('grid-cols-1', 'md:grid-cols-7');
    
    for (let i = 0; i < 7; i++) {
        const dayIndex = startDayIndex + i;
        if (dayIndex >= yearDays) {
            // Fill empty cells if we reached end of year
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell border-transparent bg-transparent';
            calendarGrid.appendChild(emptyCell);
            continue;
        }
        
        const isSpecial = dayIndex >= (MONTHS * DAYS_PER_MONTH);
        calendarGrid.appendChild(createDayCell(dayIndex, isSpecial, 'week'));
    }
}

function renderDayView(yearDays) {
    currentPeriodLabel.textContent = `Tag ${currentPeriodIndex + 1} (${currentYear}-${currentYear + 1})`;
    
    calendarGrid.classList.add('grid-cols-1');
    const isSpecial = currentPeriodIndex >= (MONTHS * DAYS_PER_MONTH);
    calendarGrid.appendChild(createDayCell(currentPeriodIndex, isSpecial, 'day'));
}

function getAllHolidaysForDate(date) {
    let results = [];
    // Important: create a new Date object at local NOON to prevent timezone boundary issues
    // date-holidays parsing depends heavily on how the Date object overlaps with UTC day boundaries
    const noonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    
    hdInstances.forEach(({ code, inst }) => {
        const hols = inst.isHoliday(noonDate);
        if (hols && hols.length > 0) {
            hols.forEach(h => {
                results.push({ country: code, name: h.name });
            });
        }
    });

    // Remove duplicates per country
    const uniqueMap = {};
    results.forEach(h => {
        const key = h.country + '|' + h.name;
        if (!uniqueMap[key]) {
            uniqueMap[key] = h;
        }
    });
    
    return Object.values(uniqueMap);
}

function createDayCell(dayIndex, isSpecialDay, viewType) {
    const gregorianDate = getGregorianDateFromIndex(currentYear, dayIndex);
    const dateStr = formatGregorianDate(gregorianDate);
    const mmdd = `${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
    const weekday = WEEKDAYS[dayIndex % 7];
    
    const cell = document.createElement('div');
    const isToday = gregorianDate.toDateString() === new Date().toDateString();
    cell.className = `day-cell ${isSpecialDay ? 'special' : ''} ${isToday ? 'today' : ''}`;
    
    if (viewType === 'day') {
        cell.className += ' p-6 md:p-10 min-h-[60vh]';
    }

    // Header Content
    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex justify-between items-start mb-2';
    
    const numDiv = document.createElement('div');
    numDiv.className = viewType === 'month' ? 'text-lg md:text-2xl heading-mystic' : 'text-2xl md:text-4xl heading-mystic text-[var(--color-gold-light)]';
    if (isSpecialDay) {
        const festtagNum = dayIndex - (MONTHS * DAYS_PER_MONTH) + 1;
        numDiv.textContent = `Festtag ${festtagNum}`;
    } else {
        if (viewType === 'day') {
            const monthIndex = Math.floor(dayIndex / DAYS_PER_MONTH);
            numDiv.textContent = `${weekday}, Tag ${(dayIndex % DAYS_PER_MONTH) + 1} (Monat ${monthIndex + 1})`;
        } else if (viewType === 'week') {
            numDiv.innerHTML = `<span class="md:hidden text-lg mr-2">${weekday},</span>Tag ${(dayIndex % DAYS_PER_MONTH) + 1}`;
        } else {
            numDiv.textContent = `${(dayIndex % DAYS_PER_MONTH) + 1}`;
        }
    }
    headerDiv.appendChild(numDiv);

    if (viewType !== 'month') {
        const gregDiv = document.createElement('div');
        gregDiv.className = 'text-xs md:text-sm italic opacity-60 text-right';
        const gregOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        gregDiv.textContent = gregorianDate.toLocaleDateString('de-DE', gregOptions);
        headerDiv.appendChild(gregDiv);
    } else {
        const gregDiv = document.createElement('div');
        gregDiv.className = 'text-[0.6rem] md:text-xs italic opacity-60 text-right mt-0.5 md:mt-1';
        gregDiv.textContent = `${String(gregorianDate.getDate()).padStart(2, '0')}.${String(gregorianDate.getMonth() + 1).padStart(2, '0')}.`;
        headerDiv.appendChild(gregDiv);
    }

    cell.appendChild(headerDiv);

    // Common Info Container
    const infoContainer = document.createElement('div');
    infoContainer.className = viewType === 'day' ? 'grid grid-cols-1 md:grid-cols-2 gap-6 mt-6' : 'flex flex-col gap-1 mt-1';
    
    // Moon
    const moonStr = getMoonPhase(gregorianDate);
    const moonDiv = document.createElement('div');
    moonDiv.className = viewType === 'month' ? 'text-[0.65rem] md:text-xs opacity-75 font-light' : 'text-sm md:text-base font-light';
    moonDiv.innerHTML = viewType === 'month' ? moonStr : `<strong class="opacity-100">Mondphase:</strong> ${moonStr}`;
    infoContainer.appendChild(moonDiv);

    // Astro Data (Sun & Moon times + Obsigend/Nidsigend) if location is available
    const astro = getAstroTimes(gregorianDate);
    if (astro && viewType !== 'month') {
        const astroContainer = document.createElement('div');
        astroContainer.className = 'text-sm md:text-base font-light flex flex-col gap-1 mt-2 mb-2 p-3 border border-[var(--theme-border-gold)] rounded-sm bg-[var(--theme-cell-bg)]';
        
        let laufText = astro.obsigend ? '📈 Obsigend' : '📉 Nidsigend';
        if (astro.transitionText) {
            if (viewType === 'week') {
                laufText = `<span class="opacity-60">${astro.obsigend ? '📈 Obs.' : '📉 Nids.'}</span> ${astro.transitionTextShort}`;
            } else {
                laufText = `<span class="opacity-60">${astro.obsigend ? '📈 Obsigend' : '📉 Nidsigend'}</span> <span class="block mt-1 text-sm">${astro.transitionText}</span>`;
            }
        }
        
        astroContainer.innerHTML = `
            <div class="flex justify-between items-center"><strong class="opacity-100">Sonne:</strong> <span class="opacity-80">🌅 ${astro.sunrise} &nbsp;|&nbsp; 🌇 ${astro.sunset}</span></div>
            <div class="flex justify-between items-center"><strong class="opacity-100">Mond:</strong> <span class="opacity-80">🌒 ${astro.moonrise} &nbsp;|&nbsp; 🌘 ${astro.moonset}</span></div>
            <div class="flex justify-between items-center ${astro.transitionText && viewType === 'day' ? 'items-start' : ''}"><strong class="opacity-100">Lauf:</strong> <span class="opacity-80 text-[var(--color-gold-light)] text-right">${laufText}</span></div>
        `;
        
        // In week view, we might not want to take too much space, but day view is fine
        if (viewType === 'week') {
            astroContainer.className = 'text-[0.65rem] md:text-[0.75rem] font-light flex flex-col gap-0.5 mt-1 mb-1 p-1 border border-[var(--theme-border-gold)] rounded-sm bg-[var(--theme-cell-bg)]';
        }
        
        infoContainer.appendChild(astroContainer);
    }

    // Zodiacs
    const z13 = getZodiac(gregorianDate);
    const z12 = getTraditionalZodiac(gregorianDate);
    
    const z13Div = document.createElement('div');
    z13Div.className = viewType === 'month' ? 'text-[0.65rem] md:text-xs opacity-75 font-light' : 'text-sm md:text-base font-light';
    z13Div.innerHTML = viewType === 'month' ? `${z13.icon} ${z13.name}` : `<strong class="opacity-100">Sternzeichen (13):</strong> ${z13.icon} ${z13.name} <span class="ml-2 text-xs opacity-70">(${z13.element.icon} ${z13.element.name})</span>`;
    infoContainer.appendChild(z13Div);

    if (viewType !== 'month') {
        const z12Div = document.createElement('div');
        z12Div.className = 'text-sm md:text-base font-light';
        z12Div.innerHTML = `<strong class="opacity-100">Sternzeichen (12):</strong> ${z12.icon} ${z12.name} <span class="ml-2 text-xs opacity-70">(${z12.element.icon} ${z12.element.name})</span>`;
        infoContainer.appendChild(z12Div);
    }

    // Special Days (Cardinals / Wheel)
    if (YEAR_WHEEL[mmdd]) {
        const specName = YEAR_WHEEL[mmdd];
        const specDiv = document.createElement('div');
        specDiv.className = viewType === 'month' 
            ? 'text-[0.65rem] md:text-xs mt-1 font-medium text-[var(--color-gold)] drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]'
            : 'text-sm md:text-base font-medium text-[var(--color-gold-light)] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] mt-2 md:mt-0';
        specDiv.innerHTML = viewType === 'month' ? specName : `<strong class="opacity-100 text-[var(--color-gold)]">Jahreskreisfest:</strong> ${specName}`;
        infoContainer.appendChild(specDiv);
    }

    cell.appendChild(infoContainer);

    // Holidays (Week and Day View)
    if (viewType !== 'month') {
        const holidays = getAllHolidaysForDate(gregorianDate);
        if (holidays.length > 0) {
            const holContainer = document.createElement('div');
            holContainer.className = viewType === 'day' ? 'mt-8 border-t border-[var(--theme-border-gold)] pt-4' : 'mt-3 pt-2 border-t border-[var(--theme-border-gold)]';
            
            const holTitle = document.createElement('h4');
            holTitle.className = 'text-xs md:text-sm font-bold uppercase tracking-wider mb-2 opacity-80';
            holTitle.textContent = 'Feiertage';
            holContainer.appendChild(holTitle);

            const holList = document.createElement('ul');
            holList.className = 'space-y-1';
            
            holidays.forEach(h => {
                const li = document.createElement('li');
                li.className = 'text-[0.7rem] md:text-sm font-light flex items-center gap-2';
                li.innerHTML = `<span class="opacity-50 border border-[var(--theme-border-gold)] px-1 rounded text-[0.6rem]">${h.country}</span> <span>${h.name}</span>`;
                holList.appendChild(li);
            });
            holContainer.appendChild(holList);
            cell.appendChild(holContainer);
        }
    }

    // Custom Events
    const eventsToday = (userEvents[dateStr] || []).concat(yearlyEvents[mmdd] || []);
    if (eventsToday.length > 0) {
        const evContainer = document.createElement('div');
        evContainer.className = viewType === 'day' ? 'mt-8 border-t border-[var(--theme-border-gold)] pt-4' : 'mt-auto pt-2';
        
        if (viewType === 'day') {
            const evTitle = document.createElement('h4');
            evTitle.className = 'text-sm font-bold uppercase tracking-wider mb-2 opacity-80';
            evTitle.textContent = 'Eigene Ereignisse';
            evContainer.appendChild(evTitle);
        }

        eventsToday.forEach(evt => {
            const evtDiv = document.createElement('div');
            evtDiv.className = viewType === 'day' ? 'text-base mb-1 p-2 bg-[color-mix(in_srgb,var(--theme-gold)_10%,transparent)] border border-[var(--theme-border-gold)] rounded' : 'event-marker';
            evtDiv.textContent = evt;
            evContainer.appendChild(evtDiv);
        });
        cell.appendChild(evContainer);
    }
    
    // Click event for modal (only in month/week view)
    if (viewType !== 'day') {
        cell.addEventListener('click', () => showModal(dayIndex, isSpecialDay, gregorianDate, dateStr, mmdd));
    }
    
    return cell;
}

function showModal(dayIndex, isSpecialDay, gregorianDate, dateStr, mmdd) {
    const monthIndex = Math.floor(dayIndex / DAYS_PER_MONTH);
    
    if (isSpecialDay) {
        document.getElementById('modalDate').textContent = `Festtag ${dayIndex - (MONTHS * DAYS_PER_MONTH) + 1} (Jahr ${currentYear})`;
    } else {
        const dayOfMonth = (dayIndex % DAYS_PER_MONTH) + 1;
        const weekday = WEEKDAYS[dayIndex % 7];
        document.getElementById('modalDate').textContent = `${weekday}, Tag ${dayOfMonth} im Monat ${monthIndex + 1}`;
    }
    
    const gregOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    document.getElementById('modalGregorian').textContent = `Gregorianisch: ${gregorianDate.toLocaleDateString('de-DE', gregOptions)} (${dateStr})`;
    
    let detailsHTML = `<p><strong>Mondphase:</strong> ${getMoonPhase(gregorianDate)}</p>`;
    const z13 = getZodiac(gregorianDate);
    const z12 = getTraditionalZodiac(gregorianDate);
    detailsHTML += `<p><strong>Sternzeichen (13):</strong> ${z13.icon} ${z13.name} <span class="ml-2 text-xs opacity-70">(${z13.element.icon} ${z13.element.name})</span></p>`;
    detailsHTML += `<p><strong>Sternzeichen (12):</strong> ${z12.icon} ${z12.name} <span class="ml-2 text-xs opacity-70">(${z12.element.icon} ${z12.element.name})</span></p>`;
    
    const astro = getAstroTimes(gregorianDate);
    if (astro) {
        let laufText = astro.obsigend ? '📈 Obsigend' : '📉 Nidsigend';
        if (astro.transitionText) {
            laufText += ` <span class="block text-sm opacity-80 mt-1">${astro.transitionText}</span>`;
        }
        detailsHTML += `<div class="mt-3 mb-3 p-3 border border-[var(--theme-border-gold)] bg-[var(--theme-cell-bg)] rounded-sm space-y-1">
            <p class="flex justify-between"><strong>Sonne:</strong> <span>🌅 ${astro.sunrise} &nbsp;|&nbsp; 🌇 ${astro.sunset}</span></p>
            <p class="flex justify-between"><strong>Mond:</strong> <span>🌒 ${astro.moonrise} &nbsp;|&nbsp; 🌘 ${astro.moonset}</span></p>
            <p class="flex justify-between items-start"><strong>Lauf:</strong> <span class="text-[var(--color-gold-light)] text-right">${laufText}</span></p>
        </div>`;
    }

    if (YEAR_WHEEL[mmdd]) {
        detailsHTML += `<p><strong>Jahreskreisfest:</strong> ${YEAR_WHEEL[mmdd]}</p>`;
    }
    
    // Check for public/religious holidays using date-holidays library
    const holidays = getAllHolidaysForDate(gregorianDate);
    if (holidays.length > 0) {
        holidays.forEach(h => {
            detailsHTML += `<p><strong>Feiertag:</strong> <span class="opacity-50 border border-[var(--theme-border-gold)] px-1 rounded text-[0.6rem] mr-1">${h.country}</span><span class="text-[var(--theme-gold-light)]">${h.name}</span></p>`;
        });
    }

    document.getElementById('modalDetails').innerHTML = detailsHTML;
    
    const eventsUl = document.getElementById('modalEvents');
    eventsUl.innerHTML = '';
    const eventsToday = (userEvents[dateStr] || []).concat(yearlyEvents[mmdd] || []);
    if (eventsToday.length > 0) {
        eventsToday.forEach(evt => {
            const li = document.createElement('li');
            li.textContent = evt;
            eventsUl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'Keine Ereignisse.';
        li.className = 'text-[color-mix(in_srgb,var(--theme-gold)_50%,transparent)] italic';
        eventsUl.appendChild(li);
    }
    
    modal.showModal();
}

// CSV Handling
function parseCSV(text) {
    const lines = text.split('\n');
    lines.forEach(line => {
        const [date, ...eventParts] = line.split(',');
        if (date && eventParts.length > 0) {
            const d = date.trim();
            const evt = eventParts.join(',').trim();
            if (d && evt) {
                // If format is MM-DD, make it a yearly event
                if (/^\d{2}-\d{2}$/.test(d)) {
                    if (!yearlyEvents[d]) yearlyEvents[d] = [];
                    yearlyEvents[d].push(evt);
                } else {
                    if (!userEvents[d]) userEvents[d] = [];
                    userEvents[d].push(evt);
                }
            }
        }
    });
    renderCalendar();
}

function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            parseCSV(evt.target.result);
        };
        reader.readAsText(file);
    }
}

async function loadLocalCsv() {
    try {
        const response = await fetch('events.csv');
        if (response.ok) {
            const text = await response.text();
            parseCSV(text);
        }
    } catch (e) {
        console.log('No local events.csv found or fetch failed (CORS). Upload available via UI.');
    }
}