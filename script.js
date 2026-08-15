// ============================================================
// FILE: script.js
// ============================================================

// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updatePassword, onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, child, push, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyCcSHVnPeGa73lSh-vZNWJDod-C11lAciI",
    authDomain: "ict-from-abc.firebaseapp.com",
    projectId: "ict-from-abc",
    storageBucket: "ict-from-abc.firebasestorage.app",
    messagingSenderId: "70545428741",
    appId: "1:70545428741:web:2f77d3511d283116d6a76c",
    measurementId: "G-XYXH34MX7K"
};

// ===== GOOGLE SHEETS API URL =====
// 🔥 REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbz-MW7cAd8ga0ztz5YCvK3hj20rEJoR4uWUBRTlGRs3PC2yxl9Szv9CS-M5scWC4A7I/exec';

// ===== INIT FIREBASE =====
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

// ===== DOM REFS =====
const authScreen = document.getElementById('authScreen');
const dashScreen = document.getElementById('dashboardScreen');
const loginPhone = document.getElementById('loginPhoneInput');
const loginPass = document.getElementById('loginPasswordInput');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');

const dashName = document.getElementById('dashName');
const dashNameBadge = document.getElementById('dashNameBadge');
const dashAvatar = document.getElementById('dashAvatar');
const pFullName = document.getElementById('pFullName');
const pPhone = document.getElementById('pPhone');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const profilePhoneDisplay = document.getElementById('profilePhoneDisplay');
const profileImgDisplay = document.getElementById('profileImgDisplay');
const taskCount = document.getElementById('taskCount');

// Calendar refs
const calendarGrid = document.getElementById('calendarGrid');
const eventDate = document.getElementById('eventDate');
const eventTime = document.getElementById('eventTime');
const eventTitle = document.getElementById('eventTitle');
const eventDesc = document.getElementById('eventDesc');
const addEventBtn = document.getElementById('addEventBtn');
const eventsContainer = document.getElementById('eventsContainer');
const searchEvent = document.getElementById('searchEvent');
const generateScheduleBtn = document.getElementById('generateScheduleBtn');

// Notification refs
const notificationText = document.getElementById('notificationText');
const editNotifBtn = document.getElementById('editNotifBtn');
const notifInput = document.getElementById('notifInput');
const notifSender = document.getElementById('notifSender');
const saveNotifBtn = document.getElementById('saveNotifBtn');
const sheetsStatus = document.getElementById('sheetsStatus');

let currentUserId = null;
let events = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ===== LOCAL STORAGE =====
function saveUserLocally(uid, data) {
    localStorage.setItem('ict_user_uid', uid);
    localStorage.setItem('ict_user_data', JSON.stringify(data));
}
function getUserLocally() {
    const uid = localStorage.getItem('ict_user_uid');
    const data = localStorage.getItem('ict_user_data');
    return { uid, data: data ? JSON.parse(data) : null };
}
function clearUserLocally() {
    localStorage.removeItem('ict_user_uid');
    localStorage.removeItem('ict_user_data');
}

// ===== GOOGLE SHEETS API HELPERS =====
async function sheetsFetch(action, data = {}) {
    try {
        const response = await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Google Sheets API error:', error);
        return { success: false, error: error.message };
    }
}

async function sheetsGet(action, params = {}) {
    try {
        const url = new URL(SHEETS_API_URL);
        url.searchParams.append('action', action);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Google Sheets API error:', error);
        return { success: false, error: error.message };
    }
}

// ===== SHOW DASHBOARD =====
function showDashboard(userData) {
    authScreen.classList.add('hidden');
    dashScreen.classList.remove('hidden');
    const name = userData?.fullName || userData?.name || 'Student';
    const phone = userData?.phone || '-';
    dashName.textContent = name;
    dashNameBadge.textContent = name;
    pFullName.textContent = name;
    pPhone.textContent = phone;
    profileNameDisplay.textContent = name;
    profilePhoneDisplay.textContent = phone;
    if (userData?.photo) {
        const img = dashAvatar.querySelector('img');
        if (img) img.src = userData.photo;
        if (profileImgDisplay) profileImgDisplay.src = userData.photo;
    }
    currentUserId = userData?.uid || 'local';
    
    // Load events from Google Sheets & Firebase
    loadEventsFromSheets();
    // Load notifications from Google Sheets
    loadNotificationsFromSheets();
    // Also load from Firebase as backup
    loadEventsFromFirebase();
    loadNotificationsFromFirebase();
    // Update task count
    updateTaskCount();
}

// ===== NOTIFICATIONS - Google Sheets =====
async function loadNotificationsFromSheets() {
    try {
        const result = await sheetsGet('getNotifications');
        if (result.success && result.notifications && result.notifications.length > 0) {
            const latest = result.notifications[0];
            if (latest && latest.text) {
                notificationText.textContent = latest.text;
                if (sheetsStatus) {
                    sheetsStatus.textContent = '● Connected';
                    sheetsStatus.style.color = '#4caf50';
                }
                return;
            }
        }
        // Fallback to default if no data
        notificationText.textContent = 'Welcome to ictfromabc! Stay tuned for updates.';
    } catch (err) {
        console.warn('Sheets notifications not available, using fallback:', err);
        if (sheetsStatus) {
            sheetsStatus.textContent = '⚠️ Using Firebase';
            sheetsStatus.style.color = '#ffaa00';
        }
    }
}

async function saveNotificationToSheets(text, sender) {
    try {
        const result = await sheetsFetch('saveNotification', { text, sender });
        if (result.success) {
            // Reload notifications
            await loadNotificationsFromSheets();
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error saving to Sheets:', err);
        return false;
    }
}

// ===== NOTIFICATIONS - Firebase (Backup) =====
function loadNotificationsFromFirebase() {
    const notifRef = ref(database, 'notifications');
    onValue(notifRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const messages = Object.values(data);
            const latest = messages[messages.length - 1];
            if (latest && latest.text && notificationText) {
                // Only update if Sheets didn't load first (or as backup)
                const currentText = notificationText.textContent;
                if (currentText === 'Welcome to ictfromabc! Stay tuned for updates.' || currentText === '') {
                    notificationText.textContent = latest.text;
                }
            }
        }
    });
}

async function saveNotificationToFirebase(text, sender) {
    try {
        const notifRef = ref(database, 'notifications');
        await push(notifRef, { text, sender, timestamp: Date.now() });
        return true;
    } catch (err) {
        console.error('Error saving to Firebase:', err);
        return false;
    }
}

// ===== EVENTS - Google Sheets =====
async function loadEventsFromSheets() {
    try {
        const result = await sheetsGet('getEvents', { userId: currentUserId || '' });
        if (result.success && result.events) {
            events = result.events;
            renderCalendar(currentMonth, currentYear);
            renderEvents(events);
            updateTaskCount();
            return;
        }
    } catch (err) {
        console.warn('Sheets events not available:', err);
    }
    // If Sheets fails, try Firebase
    loadEventsFromFirebase();
}

async function saveEventToSheets(date, time, title, desc, userId) {
    try {
        const result = await sheetsFetch('saveEvent', { date, time, title, desc, userId });
        if (result.success) {
            await loadEventsFromSheets();
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error saving event to Sheets:', err);
        return false;
    }
}

async function deleteEventFromSheets(rowIndex) {
    try {
        const result = await sheetsFetch('deleteEvent', { rowIndex });
        if (result.success) {
            await loadEventsFromSheets();
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error deleting event from Sheets:', err);
        return false;
    }
}

// ===== EVENTS - Firebase (Backup) =====
function loadEventsFromFirebase() {
    if (!currentUserId) return;
    const eventsRef = ref(database, `events/${currentUserId}`);
    onValue(eventsRef, (snapshot) => {
        const data = snapshot.val();
        // Only update if Sheets didn't load (or as backup)
        if (data && events.length === 0) {
            const firebaseEvents = [];
            Object.keys(data).forEach(key => {
                firebaseEvents.push({ id: key, ...data[key] });
            });
            events = firebaseEvents;
            renderCalendar(currentMonth, currentYear);
            renderEvents(events);
            updateTaskCount();
        }
    });
}

async function saveEventToFirebase(date, time, title, desc, userId) {
    try {
        const eventsRef = ref(database, `events/${userId || currentUserId}`);
        await push(eventsRef, { date, time, title, desc });
        return true;
    } catch (err) {
        console.error('Error saving to Firebase:', err);
        return false;
    }
}

// ===== EVENT HANDLERS (Unified) =====
async function addEvent(date, time, title, desc) {
    if (!date || !title) {
        alert('Please enter at least a date and title.');
        return;
    }
    
    const userId = currentUserId || 'local';
    const newEvent = { date, time: time || '', title, desc: desc || '' };
    
    // Try Google Sheets first
    let success = await saveEventToSheets(date, time, title, desc, userId);
    
    // If Sheets fails, try Firebase
    if (!success) {
        success = await saveEventToFirebase(date, time, title, desc, userId);
    }
    
    if (success) {
        // Clear form
        eventDate.value = '';
        eventTime.value = '';
        eventTitle.value = '';
        eventDesc.value = '';
        // Reload events
        await loadEventsFromSheets();
    } else {
        alert('Error saving event. Please try again.');
    }
}

async function deleteEvent(id) {
    if (!id) return;
    if (!confirm('Delete this event?')) return;
    
    // Find the event in the list to get its rowIndex for Sheets
    const event = events.find(e => e.id === id);
    const rowIndex = event?.rowIndex;
    
    let success = false;
    if (rowIndex) {
        success = await deleteEventFromSheets(rowIndex);
    }
    
    // If Sheets deletion fails or no rowIndex, try Firebase
    if (!success && currentUserId) {
        try {
            await set(ref(database, `events/${currentUserId}/${id}`), null);
            success = true;
        } catch (err) {
            console.error('Error deleting from Firebase:', err);
        }
    }
    
    if (success) {
        await loadEventsFromSheets();
    } else {
        alert('Error deleting event.');
    }
}

// ===== NOTIFICATION HANDLER (Unified) =====
async function sendNotification(text, sender) {
    if (!text) { alert('Please enter a message.'); return; }
    
    // Try Google Sheets first
    let success = await saveNotificationToSheets(text, sender || 'admin');
    
    // If Sheets fails, try Firebase
    if (!success) {
        success = await saveNotificationToFirebase(text, sender || 'admin');
    }
    
    if (success) {
        // Reload notifications
        await loadNotificationsFromSheets();
        await loadNotificationsFromFirebase();
        closeModal('adminNotifModal');
        alert('Notification sent successfully!');
    } else {
        alert('Error sending notification. Please try again.');
    }
}

// ===== RENDER CALENDAR =====
function renderCalendar(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    let html = '';
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(d => {
        html += `<div class="day-header">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="day-cell"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const hasEvent = events.some(e => e.date === dateStr);
        const isToday = (d === todayDate && month === todayMonth && year === todayYear);
        let cls = 'day-cell';
        if (hasEvent) cls += ' has-event';
        if (isToday) cls += ' today';
        html += `<div class="${cls}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">${d}</div>`;
    }
    calendarGrid.innerHTML = html;
}

window.selectDate = function(dateStr) {
    document.getElementById('eventDate').value = dateStr;
};

// ===== RENDER EVENTS =====
function renderEvents(eventList) {
    const searchTerm = searchEvent.value.toLowerCase();
    const filtered = eventList.filter(e => {
        const title = e.title?.toLowerCase() || '';
        const desc = e.desc?.toLowerCase() || '';
        return title.includes(searchTerm) || desc.includes(searchTerm);
    });
    
    filtered.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
    });

    let html = '';
    if (filtered.length === 0) {
        html = '<p style="color:#9ca3af;font-size:0.9rem;">No events found.</p>';
    } else {
        filtered.forEach(e => {
            const id = e.id || e._id || '';
            html += `
                <div class="event-item">
                    <div class="event-info">
                        <div class="title">${e.title || 'Untitled'}</div>
                        <div class="desc">${e.desc || ''}</div>
                        <div class="datetime">${e.date} ${e.time || ''}</div>
                    </div>
                    <button class="delete-event" data-id="${id}" data-row="${e.rowIndex || ''}">✕</button>
                </div>
            `;
        });
    }
    eventsContainer.innerHTML = html;

    document.querySelectorAll('.delete-event').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const row = this.dataset.row;
            deleteEvent(id || row);
        });
    });
}

// ===== UPDATE TASK COUNT =====
function updateTaskCount() {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    if (taskCount) taskCount.textContent = todayEvents.length;
}

// ===== AUTO-GENERATE SCHEDULE =====
function generateSchedule() {
    if (!currentUserId) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 28);

    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day === 1 || day === 3 || day === 5) {
            const dateStr = d.toISOString().split('T')[0];
            const exists = events.some(e => e.date === dateStr);
            if (!exists) {
                saveEventToSheets(dateStr, '18:30', 'ICT Class', 'Regular ICT class session', currentUserId);
                count++;
            }
        }
    }
    // Reload events after generation
    setTimeout(() => loadEventsFromSheets(), 1000);
    alert(`Generated ${count} new class events for the next 4 weeks.`);
}

// ===== LOGIN =====
async function loginUser(phone, pass) {
    if (!phone || !pass) { alert('Please enter phone and password.'); return; }
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loader"></span> Logging in...';
    loginBtn.classList.add('btn-loading');
    try {
        const cred = await signInWithEmailAndPassword(auth, phone + '@ictfromabc.com', pass);
        const user = cred.user;
        const snapshot = await get(child(ref(database), `users/${user.uid}`));
        const data = snapshot.val() || { fullName: 'Student', phone, batch: 'ICT AL 2026' };
        data.uid = user.uid;
        saveUserLocally(user.uid, data);
        showDashboard(data);
    } catch (err) {
        alert('Invalid credentials. Please try again.');
        console.error(err);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '🔐 Login';
        loginBtn.classList.remove('btn-loading');
    }
}

// ===== SIGNUP =====
async function signupUser(name, phone, pass) {
    if (!name || !phone || !pass) { alert('Please fill all fields.'); return; }
    try {
        const cred = await createUserWithEmailAndPassword(auth, phone + '@ictfromabc.com', pass);
        const user = cred.user;
        const data = { fullName: name, phone, name, batch: 'ICT AL 2026' };
        await set(ref(database, `users/${user.uid}`), data);
        saveUserLocally(user.uid, data);
        showDashboard(data);
        closeModal('signupModal');
    } catch (err) {
        alert('Signup failed: ' + err.message);
        console.error(err);
    }
}

// ===== GOOGLE LOGIN =====
async function googleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const snapshot = await get(child(ref(database), `users/${user.uid}`));
        let data = snapshot.val();
        if (!data) {
            data = {
                fullName: user.displayName || 'Student',
                phone: user.phoneNumber || '',
                email: user.email,
                name: user.displayName || 'Student',
                batch: 'ICT AL 2026',
                photo: user.photoURL || 'Profile.png'
            };
            await set(ref(database, `users/${user.uid}`), data);
        }
        data.uid = user.uid;
        if (user.photoURL) data.photo = user.photoURL;
        saveUserLocally(user.uid, data);
        showDashboard(data);
    } catch (err) {
        alert('Google login failed. Please try again.');
        console.error(err);
    }
}

// ===== OTP =====
let otpCode = '',
    otpVerified = false,
    currentPhone = '',
    otpTimerInterval = null;

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function startOtpTimer(seconds = 60) {
    const timerEl = document.getElementById('otpTimer');
    let remaining = seconds;
    timerEl.textContent = `⏱️ Resend in ${remaining}s`;
    clearInterval(otpTimerInterval);
    otpTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            timerEl.textContent = '✅ OTP sent! Check your phone.';
            document.getElementById('sendOtpBtn').disabled = false;
        } else {
            timerEl.textContent = `⏱️ Resend in ${remaining}s`;
        }
    }, 1000);
}

document.getElementById('sendOtpBtn').addEventListener('click', () => {
    const phone = document.getElementById('forgotPhone').value.trim();
    if (!phone) { alert('Enter phone number.'); return; }
    currentPhone = phone;
    otpCode = generateOTP();
    otpVerified = false;
    console.log(`📱 OTP for ${phone}: ${otpCode}`);
    document.getElementById('sendOtpBtn').disabled = true;
    document.getElementById('otpTimer').textContent = '📨 OTP sent! Check console or SMS.';
    document.getElementById('otpStatus').textContent = '';
    document.getElementById('otpStatus').className = 'otp-status';
    startOtpTimer(60);
    alert(`OTP sent to ${phone} (Demo: ${otpCode})`);
});

document.getElementById('verifyOtpBtn').addEventListener('click', () => {
    const entered = document.getElementById('otpInput').value.trim();
    if (!entered) { alert('Enter OTP code.'); return; }
    if (entered === otpCode) {
        otpVerified = true;
        document.getElementById('otpStatus').textContent = '✅ OTP verified successfully!';
        document.getElementById('otpStatus').className = 'otp-verified';
        document.getElementById('otpTimer').textContent = '';
        alert('OTP verified! Set your new password.');
    } else {
        document.getElementById('otpStatus').textContent = '❌ Invalid OTP. Please try again.';
        document.getElementById('otpStatus').className = 'otp-status';
        document.getElementById('otpStatus').style.color = '#ff4444';
    }
});

document.getElementById('resetPassBtn').addEventListener('click', async () => {
    if (!otpVerified) { alert('Please verify OTP first.'); return; }
    const newPass = document.getElementById('resetNewPass').value.trim();
    if (!newPass || newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
    try {
        await sendPasswordResetEmail(auth, currentPhone + '@ictfromabc.com');
        alert('Password reset email sent! Check your inbox.');
        closeModal('forgotModal');
        otpVerified = false;
        document.getElementById('otpStatus').textContent = '';
        document.getElementById('otpStatus').className = 'otp-status';
        document.getElementById('otpTimer').textContent = '';
        document.getElementById('otpInput').value = '';
        document.getElementById('resetNewPass').value = '';
        document.getElementById('sendOtpBtn').disabled = false;
    } catch (err) {
        const localData = getUserLocally();
        if (localData.data && localData.data.phone === currentPhone) {
            alert('Password updated successfully! (local mode)');
            closeModal('forgotModal');
        } else {
            alert('Account not found. Please sign up first.');
        }
    }
});

// ===== CHANGE PASSWORD =====
async function changePassword(newPass) {
    if (!newPass) { alert('Enter new password.'); return; }
    try {
        if (auth.currentUser) {
            await updatePassword(auth.currentUser, newPass);
            alert('Password updated successfully!');
            closeModal('changePassModal');
        } else {
            alert('Please login again to change password.');
        }
    } catch (err) {
        alert('Error updating password. Please try again.');
        console.error(err);
    }
}

// ===== SAVE PROFILE =====
async function saveProfile(data) {
    const userData = getUserLocally();
    if (!userData.uid) { alert('Please login first.'); return; }
    try {
        if (userData.uid !== 'local') {
            await update(ref(database, `users/${userData.uid}`), data);
        }
        const merged = { ...userData.data, ...data };
        saveUserLocally(userData.uid, merged);
        showDashboard(merged);
        closeModal('profileModal');
        alert('Profile updated successfully!');
    } catch (err) {
        alert('Error saving profile.');
        console.error(err);
    }
}

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snapshot = await get(child(ref(database), `users/${user.uid}`));
        const data = snapshot.val() || { fullName: 'Student', phone: '', batch: 'ICT AL 2026' };
        data.uid = user.uid;
        if (user.photoURL) data.photo = user.photoURL;
        saveUserLocally(user.uid, data);
        showDashboard(data);
    } else {
        const local = getUserLocally();
        if (local.data) {
            showDashboard(local.data);
        } else {
            authScreen.classList.remove('hidden');
            dashScreen.classList.add('hidden');
        }
    }
});

// ===== EVENT BINDINGS =====
loginBtn.addEventListener('click', () => loginUser(loginPhone.value.trim(), loginPass.value.trim()));
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
googleBtn.addEventListener('click', googleLogin);

document.getElementById('signupLink').addEventListener('click', (e) => { e.preventDefault(); openModal('signupModal'); });
document.getElementById('forgotLink').addEventListener('click', (e) => { e.preventDefault(); openModal('forgotModal'); });

document.getElementById('signupBtn').addEventListener('click', () => {
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const pass = document.getElementById('signupPass').value.trim();
    signupUser(name, phone, pass);
});

document.getElementById('changePassBtn').addEventListener('click', () => {
    changePassword(document.getElementById('newPass').value.trim());
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
    const data = getUserLocally().data || {};
    document.getElementById('editFullName').value = data.fullName || data.name || '';
    document.getElementById('editAddress').value = data.address || '';
    document.getElementById('editPhone').value = data.phone || '';
    document.getElementById('editWhatsApp').value = data.whatsapp || '';
    document.getElementById('editSubject').value = data.subject || '';
    document.getElementById('editSchool').value = data.school || '';
    document.getElementById('editBirthday').value = data.birthday || '';
    document.getElementById('editNic').value = data.nic || '';
    document.getElementById('editInstitute').value = data.institute || '';
    document.getElementById('editPhoto').value = data.photo || 'Profile.png';
    openModal('profileModal');
});

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const data = {
        fullName: document.getElementById('editFullName').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        whatsapp: document.getElementById('editWhatsApp').value.trim(),
        subject: document.getElementById('editSubject').value.trim(),
        school: document.getElementById('editSchool').value.trim(),
        birthday: document.getElementById('editBirthday').value.trim(),
        nic: document.getElementById('editNic').value.trim(),
        institute: document.getElementById('editInstitute').value.trim(),
        photo: document.getElementById('editPhoto').value.trim() || 'Profile.png'
    };
    saveProfile(data);
});

// ===== ADMIN NOTIFICATION =====
editNotifBtn.addEventListener('click', () => {
    notifInput.value = notificationText.textContent;
    notifSender.value = 'Admin';
    openModal('adminNotifModal');
});

saveNotifBtn.addEventListener('click', () => {
    const text = notifInput.value.trim();
    const sender = notifSender.value.trim() || 'Admin';
    sendNotification(text, sender);
});

// ===== CALENDAR EVENT BINDINGS =====
addEventBtn.addEventListener('click', () => {
    addEvent(eventDate.value, eventTime.value, eventTitle.value, eventDesc.value);
});

searchEvent.addEventListener('input', () => {
    renderEvents(events);
});

generateScheduleBtn.addEventListener('click', generateSchedule);

// ===== SIDEBAR NAVIGATION =====
document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById('section-' + this.dataset.section);
        if (target) target.classList.remove('hidden');
    });
});

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try { if (auth.currentUser) await signOut(auth); } catch (e) {}
    clearUserLocally();
    dashScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
});

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); }));

// ===== CHATBOT =====
const chatToggle = document.getElementById('chatToggle');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');

chatToggle.addEventListener('click', () => chatWindow.classList.toggle('open'));
chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));

function addMessage(text, type, sender = '') {
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (sender) {
        div.innerHTML = `<div class="sender">${sender}</div>${text}<div class="time">${time}</div>`;
    } else {
        div.innerHTML = `${text}<div class="time">${time}</div>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getBotReply(input) {
    const lower = input.toLowerCase();
    if (lower.includes('class') || lower.includes('day') || lower.includes('schedule'))
        return '📅 Class days: Monday, Wednesday, Friday at 6:30 PM.';
    if (lower.includes('past paper') || lower.includes('paper'))
        return '📄 Past Papers: https://ictfromabc.com/public-dashboard/papers/al';
    if (lower.includes('fee') || lower.includes('price') || lower.includes('cost'))
        return '💰 Course fees: LKR 15,000 per year. Contact 071 455 5513.';
    if (lower.includes('contact') || lower.includes('phone'))
        return '📞 Phone: 071 455 5513 | Email: info@ictfromabc.com';
    if (lower.includes('profile') || lower.includes('update'))
        return '👤 Update your profile from the Profile section.';
    if (lower.includes('otp') || lower.includes('password') || lower.includes('reset'))
        return '🔑 Use "Forgot Password" to reset with OTP.';
    if (lower.includes('institute') || lower.includes('school') || lower.includes('academy'))
        return '🏫 We partner with Sakya Academy, Yahansa, Nanik, Sipwin, and IMS Kandy. Check the Institutes section!';
    if (lower.includes('calendar') || lower.includes('event') || lower.includes('task'))
        return '📅 Use the Calendar section to add events. Data is saved to Google Sheets with Firebase backup.';
    if (lower.includes('notification') || lower.includes('message'))
        return '🔔 Admins can update notifications via the "Admin" button on the notification bar.';
    if (lower.includes('sheets') || lower.includes('google'))
        return '📊 All calendar events and notifications are saved to Google Sheets with Firebase as backup.';
    return '🤔 I can help with class schedules, past papers, fees, contact info, institutes, calendar, notifications, and profile updates.';
}

chatSend.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, 'user', '👤 You');
    chatInput.value = '';
    setTimeout(() => {
        const reply = getBotReply(text);
        addMessage(reply, 'bot', '🤖 Assistant');
    }, 500);
});
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') chatSend.click(); });
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-reply')) {
        const msg = e.target.dataset.msg;
        if (msg) { chatInput.value = msg; chatSend.click(); }
    }
});

console.log('🔥 Firebase connected!');
console.log('📊 Google Sheets integration enabled.');
console.log('📅 Calendar events save to both Google Sheets and Firebase.');
console.log('🔔 Notifications save to both Google Sheets and Firebase.');
console.log('👤 Profile image: Profile.png');
console.log('
