// ============================================================
// FILE: script.js (Add calendar functionality)
// ============================================================

// ... (keep all existing Firebase, auth, login, profile code) ...

// ============================================================
// ===== CALENDAR & SCHEDULE SYSTEM =====
// ============================================================

// ===== STATE =====
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;
let allEvents = [];
let editingEventId = null;
let calendarEventsRef = null;

// ===== DOM REFS for Calendar =====
const calendarGrid = document.getElementById('calendarGrid');
const calendarMonthYear = document.getElementById('calendarMonthYear');
const calendarPrev = document.getElementById('calendarPrev');
const calendarNext = document.getElementById('calendarNext');
const todayBtn = document.getElementById('todayBtn');
const addEventBtn = document.getElementById('addEventBtn');
const generateScheduleBtn = document.getElementById('generateScheduleBtn');
const calendarSearch = document.getElementById('calendarSearch');
const calendarFilterType = document.getElementById('calendarFilterType');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const eventsContainer = document.getElementById('eventsContainer');
const eventCount = document.getElementById('eventCount');

// ===== EVENT MODAL REFS =====
const eventModal = document.getElementById('eventModal');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventType = document.getElementById('eventType');
const eventDate = document.getElementById('eventDate');
const eventTitle = document.getElementById('eventTitle');
const eventDesc = document.getElementById('eventDesc');
const eventStart = document.getElementById('eventStart');
const eventEnd = document.getElementById('eventEnd');
const eventHours = document.getElementById('eventHours');
const eventTags = document.getElementById('eventTags');
const saveEventBtn = document.getElementById('saveEventBtn');
const deleteEventBtn = document.getElementById('deleteEventBtn');

// ===== INIT CALENDAR =====
function initCalendar() {
    // Set up Firebase reference for calendar events
    const user = auth.currentUser;
    if (user) {
        calendarEventsRef = ref(database, `calendar/${user.uid}/events`);
        loadEvents();
    } else {
        // Fallback: use local storage
        loadEventsLocal();
    }
    renderCalendar();
    renderEvents();
    setupCalendarListeners();
}

// ===== LOAD EVENTS FROM FIREBASE =====
async function loadEvents() {
    if (!calendarEventsRef) return;
    try {
        const snapshot = await get(calendarEventsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            allEvents = Object.entries(data).map(([id, event]) => ({
                id,
                ...event
            }));
        } else {
            allEvents = [];
        }
        // Also save to local storage as backup
        localStorage.setItem('ict_calendar_events', JSON.stringify(allEvents));
        renderEvents();
        renderCalendar();
    } catch (err) {
        console.error('Error loading events:', err);
        loadEventsLocal();
    }
}

// ===== LOAD EVENTS FROM LOCAL STORAGE (fallback) =====
function loadEventsLocal() {
    const stored = localStorage.getItem('ict_calendar_events');
    if (stored) {
        try {
            allEvents = JSON.parse(stored);
        } catch (e) {
            allEvents = [];
        }
    } else {
        allEvents = [];
    }
    renderEvents();
    renderCalendar();
}

// ===== SAVE EVENT =====
async function saveEvent(eventData, eventId = null) {
    const user = auth.currentUser;
    if (user && calendarEventsRef) {
        try {
            if (eventId) {
                await update(ref(database, `calendar/${user.uid}/events/${eventId}`), eventData);
            } else {
                const newRef = push(calendarEventsRef);
                await set(newRef, eventData);
                eventId = newRef.key;
            }
            // Reload events
            await loadEvents();
            return eventId;
        } catch (err) {
            console.error('Error saving event:', err);
            // Fallback to local
            return saveEventLocal(eventData, eventId);
        }
    } else {
        return saveEventLocal(eventData, eventId);
    }
}

// ===== SAVE EVENT LOCAL (fallback) =====
function saveEventLocal(eventData, eventId = null) {
    if (eventId) {
        const index = allEvents.findIndex(e => e.id === eventId);
        if (index !== -1) {
            allEvents[index] = { ...allEvents[index], ...eventData };
        }
    } else {
        eventId = 'local_' + Date.now();
        allEvents.push({ id: eventId, ...eventData });
    }
    localStorage.setItem('ict_calendar_events', JSON.stringify(allEvents));
    renderEvents();
    renderCalendar();
    return eventId;
}

// ===== DELETE EVENT =====
async function deleteEvent(eventId) {
    const user = auth.currentUser;
    if (user && calendarEventsRef) {
        try {
            await remove(ref(database, `calendar/${user.uid}/events/${eventId}`));
            await loadEvents();
        } catch (err) {
            console.error('Error deleting event:', err);
            deleteEventLocal(eventId);
        }
    } else {
        deleteEventLocal(eventId);
    }
}

function deleteEventLocal(eventId) {
    allEvents = allEvents.filter(e => e.id !== eventId);
    localStorage.setItem('ict_calendar_events', JSON.stringify(allEvents));
    renderEvents();
    renderCalendar();
}

// ===== RENDER CALENDAR =====
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const today = new Date();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Clear existing days (keep headers)
    const headers = calendarGrid.querySelectorAll('div');
    for (let i = 7; i < headers.length; i++) {
        headers[i].remove();
    }

    // Build calendar days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    let dayCount = 0;

    for (let i = 0; i < totalCells; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        let dayNumber;
        let isOtherMonth = false;

        if (i < firstDay) {
            // Previous month days
            dayNumber = daysInPrevMonth - firstDay + i + 1;
            isOtherMonth = true;
        } else if (i >= firstDay + daysInMonth) {
            // Next month days
            dayNumber = i - (firstDay + daysInMonth) + 1;
            isOtherMonth = true;
        } else {
            dayNumber = i - firstDay + 1;
        }

        dayDiv.dataset.day = dayNumber;
        dayDiv.dataset.month = isOtherMonth ? (i < firstDay ? currentMonth - 1 : currentMonth + 1) : currentMonth;
        dayDiv.dataset.year = currentYear;

        // Check if this is today
        const isToday = !isOtherMonth && 
            dayNumber === today.getDate() && 
            currentMonth === today.getMonth() && 
            currentYear === today.getFullYear();

        if (isToday) {
            dayDiv.classList.add('today');
        }
        if (isOtherMonth) {
            dayDiv.classList.add('other-month');
        }

        // Check if selected
        if (selectedDate && 
            dayNumber === selectedDate.getDate() && 
            currentMonth === selectedDate.getMonth() && 
            currentYear === selectedDate.getFullYear()) {
            dayDiv.classList.add('selected');
        }

        // Check if has events
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const dayEvents = allEvents.filter(e => e.date === dateStr);

        // Build day content
        let content = `<span class="day-number">${dayNumber}</span>`;
        if (dayEvents.length > 0) {
            // Show indicators
            const types = [...new Set(dayEvents.map(e => e.type))];
            let indicators = '<div class="day-indicators">';
            types.forEach(type => {
                indicators += `<span class="mini-dot ${type}"></span>`;
            });
            indicators += '</div>';
            content += indicators;
        }
        dayDiv.innerHTML = content;

        // Click to select date
        dayDiv.addEventListener('click', () => {
            const dateObj = new Date(currentYear, parseInt(dayDiv.dataset.month), parseInt(dayDiv.dataset.day));
            selectedDate = dateObj;
            renderCalendar();
            renderEvents();
            // Open add event modal with this date
            openAddEventForDate(dateObj);
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// ===== RENDER EVENTS =====
function renderEvents() {
    const searchTerm = calendarSearch.value.toLowerCase().trim();
    const filterType = calendarFilterType.value;
    let filteredEvents = [...allEvents];

    // Apply search
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(e => 
            (e.title && e.title.toLowerCase().includes(searchTerm)) ||
            (e.description && e.description.toLowerCase().includes(searchTerm)) ||
            (e.tags && e.tags.toLowerCase().includes(searchTerm)) ||
            (e.date && e.date.includes(searchTerm))
        );
    }

    // Apply type filter
    if (filterType !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.type === filterType);
    }

    // Sort by date
    filteredEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Update count
    eventCount.textContent = `${filteredEvents.length} entries`;

    if (filteredEvents.length === 0) {
        eventsContainer.innerHTML = `
            <div style="text-align:center;padding:2rem 0;color:#6b7280;">
                <span style="font-size:2rem;display:block;margin-bottom:0.5rem;">📭</span>
                <p>No events found. Click a date to add an event!</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredEvents.forEach(event => {
        const typeLabels = {
            class: '📚 Class',
            study: '📖 Study',
            task: '✅ Task',
            exam: '📝 Exam',
            other: '📌 Other'
        };
        const timeStr = event.start && event.end ? `${event.start} - ${event.end}` : event.start || 'All day';
        const hoursStr = event.hours ? `${event.hours}h` : '';
        const tagsStr = event.tags ? event.tags.split(',').map(t => t.trim()).filter(t => t).join(' · ') : '';

        html += `
            <div class="event-item" data-id="${event.id}" style="border-left-color: ${getTypeColor(event.type)};">
                <div class="event-info">
                    <div class="event-title">${event.title || 'Untitled'}</div>
                    <div class="event-meta">
                        <span class="type-badge ${event.type}">${typeLabels[event.type] || event.type}</span>
                        <span>📅 ${event.date || 'No date'}</span>
                        <span>⏰ ${timeStr}</span>
                        ${hoursStr ? `<span>⏱️ ${hoursStr}</span>` : ''}
                        ${tagsStr ? `<span>🏷️ ${tagsStr}</span>` : ''}
                    </div>
                    ${event.description ? `<div style="font-size:0.75rem;color:#9ca3af;margin-top:2px;">${event.description}</div>` : ''}
                </div>
                <div class="event-actions">
                    <button class="edit-btn" data-id="${event.id}" title="Edit">✏️</button>
                    <button class="delete-btn" data-id="${event.id}" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });

    eventsContainer.innerHTML = html;

    // Add event listeners to edit/delete buttons
    eventsContainer.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            openEditEvent(id);
        });
    });
    eventsContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Delete this event?')) {
                deleteEvent(id);
            }
        });
    });

    // Click on event to view/edit
    eventsContainer.querySelectorAll('.event-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.event-actions')) return;
            const id = item.dataset.id;
            openEditEvent(id);
        });
    });
}

// ===== GET TYPE COLOR =====
function getTypeColor(type) {
    const colors = {
        class: '#db3900',
        study: '#4caf50',
        task: '#ff9800',
        exam: '#f44336',
        other: '#9c27b0'
    };
    return colors[type] || '#db3900';
}

// ===== OPEN ADD EVENT FOR DATE =====
function openAddEventForDate(date) {
    editingEventId = null;
    eventModalTitle.textContent = '📅 Add Event';
    deleteEventBtn.style.display = 'none';
    saveEventBtn.textContent = '💾 Save Event';
    const dateStr = date ? 
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` :
        new Date().toISOString().split('T')[0];
    eventDate.value = dateStr;
    eventType.value = 'class';
    eventTitle.value = '';
    eventDesc.value = '';
    eventStart.value = '';
    eventEnd.value = '';
    eventHours.value = '';
    eventTags.value = '';
    openModal('eventModal');
}

// ===== OPEN EDIT EVENT =====
function openEditEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;
    editingEventId = eventId;
    eventModalTitle.textContent = '✏️ Edit Event';
    deleteEventBtn.style.display = 'block';
    saveEventBtn.textContent = '💾 Update Event';
    eventDate.value = event.date || '';
    eventType.value = event.type || 'class';
    eventTitle.value = event.title || '';
    eventDesc.value = event.description || '';
    eventStart.value = event.start || '';
    eventEnd.value = event.end || '';
    eventHours.value = event.hours || '';
    eventTags.value = event.tags || '';
    openModal('eventModal');
}

// ===== SETUP CALENDAR LISTENERS =====
function setupCalendarListeners() {
    // Navigation
    calendarPrev.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
        renderEvents();
    });
    calendarNext.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
        renderEvents();
    });
    todayBtn.addEventListener('click', () => {
        const now = new Date();
        currentMonth = now.getMonth();
        currentYear = now.getFullYear();
        selectedDate = now;
        renderCalendar();
        renderEvents();
    });

    // Add event
    addEventBtn.addEventListener('click', () => {
        openAddEventForDate(new Date());
    });

    // Save event
    saveEventBtn.addEventListener('click', () => {
        const eventData = {
            date: eventDate.value,
            type: eventType.value,
            title: eventTitle.value.trim(),
            description: eventDesc.value.trim(),
            start: eventStart.value,
            end: eventEnd.value,
            hours: parseFloat(eventHours.value) || 0,
            tags: eventTags.value.trim(),
            updatedAt: Date.now()
        };
        if (!eventData.date || !eventData.title) {
            alert('Please enter a date and title.');
            return;
        }
        saveEvent(eventData, editingEventId);
        closeModal('eventModal');
    });

    // Delete event
    deleteEventBtn.addEventListener('click', () => {
        if (editingEventId && confirm('Delete this event permanently?')) {
            deleteEvent(editingEventId);
            closeModal('eventModal');
        }
    });

    // Search
    calendarSearch.addEventListener('input', renderEvents);
    calendarFilterType.addEventListener('change', renderEvents);
    clearSearchBtn.addEventListener('click', () => {
        calendarSearch.value = '';
        calendarFilterType.value = 'all';
        renderEvents();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('eventModal');
        }
    });

    // Close modal when clicking outside
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            closeModal('eventModal');
        }
    });
}

// ===== AUTO-GENERATE STUDY SCHEDULE =====
generateScheduleBtn.addEventListener('click', () => {
    // Get all events
    const events = allEvents;
    if (events.length === 0) {
        alert('No events found. Add some events first to generate a schedule.');
        return;
    }

    // Group by date
    const grouped = {};
    events.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort();

    // Generate schedule summary
    let totalHours = 0;
    let classCount = 0;
    let studyCount = 0;
    let taskCount = 0;
    let examCount = 0;

    events.forEach(e => {
        totalHours += e.hours || 0;
        if (e.type === 'class') classCount++;
        else if (e.type === 'study') studyCount++;
        else if (e.type === 'task') taskCount++;
        else if (e.type === 'exam') examCount++;
    });

    // Build schedule HTML
    let scheduleHTML = `
        <div class="schedule-summary">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-weight:600;color:white;">📋 Generated Study Schedule</span>
                <span style="color:#9ca3af;font-size:0.7rem;">${new Date().toLocaleString()}</span>
            </div>
            <div class="schedule-stats">
                <div class="stat-item"><div class="stat-num">${totalHours}</div><div class="stat-label">Total Hours</div></div>
                <div class="stat-item"><div class="stat-num">${classCount}</div><div class="stat-label">Classes</div></div>
                <div class="stat-item"><div class="stat-num">${studyCount}</div><div class="stat-label">Study Sessions</div></div>
                <div class="stat-item"><div class="stat-num">${taskCount}</div><div class="stat-label">Tasks</div></div>
                <div class="stat-item"><div class="stat-num">${examCount}</div><div class="stat-label">Exams</div></div>
                <div class="stat-item"><div class="stat-num">${events.length}</div><div class="stat-label">Total Events</div></div>
            </div>
            <div style="max-height:200px;overflow-y:auto;">
    `;

    sortedDates.forEach(date => {
        const dayEvents = grouped[date];
        const dateObj = new Date(date + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        scheduleHTML += `<div style="font-weight:600;color:#db3900;padding:0.3rem 0;border-bottom:1px solid #1a1a1a;font-size:0.85rem;">📅 ${dateStr}</div>`;
        dayEvents.forEach(e => {
            const timeStr = e.start && e.end ? `${e.start} - ${e.end}` : e.start || 'All day';
            const hoursStr = e.hours ? `(${e.hours}h)` : '';
            const typeEmoji = { class: '📚', study: '📖', task: '✅', exam: '📝', other: '📌' };
            scheduleHTML += `
                <div class="schedule-item">
                    <span class="sched-title">${typeEmoji[e.type] || '📌'} ${e.title || 'Untitled'}</span>
                    <span class="sched-time">${timeStr} ${hoursStr}</span>
                </div>
            `;
        });
    });

    scheduleHTML += `
            </div>
            <div style="margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid #1a1a1a;display:flex;gap:0.8rem;flex-wrap:wrap;">
                <button onclick="exportSchedule()" class="home-btn" style="padding:0.3rem 1rem;font-size:0.75rem;">📤 Export</button>
                <button onclick="document.querySelector('.schedule-summary').innerHTML = document.querySelector('.schedule-summary').innerHTML" class="home-btn home-btn-outline" style="padding:0.3rem 1rem;font-size:0.75rem;">📋 Copy</button>
            </div>
        </div>
    `;

    // Show the schedule in a modal or replace content
    const existingSchedule = document.querySelector('.schedule-summary');
    if (existingSchedule) {
        existingSchedule.outerHTML = scheduleHTML;
    } else {
        // Insert after the events list
        const eventsList = document.getElementById('eventsList');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scheduleHTML;
        eventsList.insertAdjacentElement('afterend', tempDiv.firstElementChild);
    }
});

// ===== EXPORT SCHEDULE =====
window.exportSchedule = function() {
    const scheduleEl = document.querySelector('.schedule-summary');
    if (!scheduleEl) return;
    const content = scheduleEl.innerText;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `study_schedule_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
};

// ===== OVERRIDE SHOW DASHBOARD TO INIT CALENDAR =====
const originalShowDashboard = window.showDashboard || function() {};
window.showDashboard = function(userData) {
    originalShowDashboard(userData);
    // Initialize calendar after dashboard is shown
    setTimeout(() => {
        if (!document.getElementById('section-calendar').classList.contains('hidden')) {
            initCalendar();
        }
        // Also init when calendar section becomes visible
        const calendarNav = document.querySelector('.nav-item[data-section="calendar"]');
        if (calendarNav) {
            calendarNav.addEventListener('click', () => {
                setTimeout(initCalendar, 100);
            });
        }
    }, 300);
};

// ===== INIT CALENDAR ON DEMAND =====
// When calendar section is shown, init calendar
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item[data-section="calendar"]');
    if (navItem) {
        setTimeout(initCalendar, 100);
    }
});

// ===== PREVENT DUPLICATE EVENT LISTENERS =====
// Use a flag to prevent multiple inits
let calendarInitialized = false;

// Override initCalendar to prevent duplicates
const originalInitCalendar = initCalendar;
initCalendar = function() {
    if (calendarInitialized) {
        // Just refresh data
        loadEvents();
        renderCalendar();
        renderEvents();
        return;
    }
    calendarInitialized = true;
    originalInitCalendar();
};

console.log('📅 Calendar & Schedule system loaded!');
console.log('📋 Features: Add events, search, filter, auto-generate schedule');
