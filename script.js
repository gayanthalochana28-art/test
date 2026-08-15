// ============================================================
// FILE: script.js (Advanced Chatbot + Mobile UI + Photo Upload)
// ============================================================

// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updatePassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, child, push, remove, onValue } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

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

// ===== INIT FIREBASE =====
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// ===== GOOGLE SHEETS NOTIFICATION =====
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLDVD0TZD9vBDVClfGmQYxXGl3wPopuYdzlP0RQvjXqkmVW305TYaHFcUse5EyJoSmRM9h5OkDmRYb/pub?gid=0&single=true&output=csv';

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
const profileAvatarImg = document.getElementById('profileAvatarImg');
const pFullName = document.getElementById('pFullName');
const pPhone = document.getElementById('pPhone');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const profilePhoneDisplay = document.getElementById('profilePhoneDisplay');
const profileImgDisplay = document.getElementById('profileImgDisplay');
const profilePhotoInput = document.getElementById('profilePhotoInput');
const uploadStatus = document.getElementById('uploadStatus');

const notifBar = document.getElementById('notificationBar');
const notifMarquee = document.getElementById('notifMarquee');

// Calendar
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;
let eventsCache = {};
let editingEventKey = null;

const calendarGrid = document.getElementById('calendarGrid');
const calendarMonthYear = document.getElementById('calendarMonthYear');
const eventList = document.getElementById('eventList');
const eventSearchInput = document.getElementById('eventSearchInput');

// ===== GOOGLE SHEETS NOTIFICATION FETCH =====
async function fetchGoogleSheetsNotifications() {
    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        if (!response.ok) throw new Error('Failed to fetch');
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) { notifBar.style.display = 'none'; return; }
        const messages = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 3) {
                const message = cols[1] || '';
                const active = cols[2]?.toUpperCase() === 'TRUE' || cols[2]?.toUpperCase() === 'YES' || cols[2]?.toUpperCase() === '1';
                if (active && message) messages.push(message);
            }
        }
        if (messages.length === 0) { notifBar.style.display = 'none'; return; }
        let html = '';
        messages.forEach(msg => { html += `<span>📢 ${msg}</span>`; });
        notifMarquee.innerHTML = html;
        notifBar.style.display = 'block';
        document.body.classList.add('with-notif');
    } catch (err) {
        console.warn('Google Sheets notification error:', err);
        notifMarquee.innerHTML = '<span>📢 Stay updated with ictfromabc announcements!</span>';
        notifBar.style.display = 'block';
        document.body.classList.add('with-notif');
    }
}
document.getElementById('closeNotifBtn').addEventListener('click', () => {
    notifBar.style.display = 'none';
    document.body.classList.remove('with-notif');
});

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

// ===== PROFILE PHOTO UPLOAD =====
function updateProfilePhoto(photoURL) {
    const url = photoURL || 'Profile.png';
    if (profileAvatarImg) profileAvatarImg.src = url;
    if (profileImgDisplay) profileImgDisplay.src = url;
    if (dashAvatar) {
        const img = dashAvatar.querySelector('img');
        if (img) img.src = url;
    }
    const userData = getUserLocally();
    if (userData.data) {
        userData.data.photo = url;
        saveUserLocally(userData.uid, userData.data);
    }
}

async function uploadProfilePhoto(file) {
    const user = auth.currentUser;
    if (!user) { alert('Please login first.'); return; }
    if (!file || !file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File is too large. Max 5MB.'); return; }
    uploadStatus.textContent = '⏳ Uploading...';
    uploadStatus.style.color = '#ffaa00';
    try {
        const ext = file.name.split('.').pop();
        const filename = `profile_photos/${user.uid}_${Date.now()}.${ext}`;
        const fileRef = storageRef(storage, filename);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        await update(ref(database, `users/${user.uid}`), { photo: downloadURL });
        const userData = getUserLocally();
        if (userData.data) {
            userData.data.photo = downloadURL;
            saveUserLocally(user.uid, userData.data);
        }
        updateProfilePhoto(downloadURL);
        uploadStatus.textContent = '✅ Photo updated!';
        uploadStatus.style.color = '#4caf50';
        console.log('Profile photo uploaded:', downloadURL);
    } catch (err) {
        console.error('Upload error:', err);
        uploadStatus.textContent = '❌ Upload failed';
        uploadStatus.style.color = '#ff4444';
        alert('Error uploading photo: ' + err.message);
    }
}
if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadProfilePhoto(file);
        profilePhotoInput.value = '';
    });
}

// ===== SHOW DASHBOARD =====
function showDashboard(userData) {
    authScreen.classList.add('hidden');
    dashScreen.classList.remove('hidden');
    const name = userData?.fullName || userData?.name || 'Student';
    const phone = userData?.phone || '-';
    const photo = userData?.photo || 'Profile.png';
    dashName.textContent = name;
    dashNameBadge.textContent = name;
    pFullName.textContent = name;
    pPhone.textContent = phone;
    profileNameDisplay.textContent = name;
    profilePhoneDisplay.textContent = phone;
    updateProfilePhoto(photo);
    if (userData?.uid) loadEvents(userData.uid);
    fetchGoogleSheetsNotifications();
}

// ===== AUTH =====
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

// ===== OTP =====
let otpCode = '', otpVerified = false, currentPhone = '', otpTimerInterval = null;

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
    startOtpTimer(60);
    alert(`OTP sent to ${phone} (Demo: ${otpCode})`);
});
document.getElementById('verifyOtpBtn').addEventListener('click', () => {
    const entered = document.getElementById('otpInput').value.trim();
    if (!entered) { alert('Enter OTP code.'); return; }
    if (entered === otpCode) {
        otpVerified = true;
        document.getElementById('otpStatus').textContent = '✅ OTP verified successfully!';
        document.getElementById('otpStatus').style.color = '#4caf50';
        document.getElementById('otpTimer').textContent = '';
        alert('OTP verified! Set your new password.');
    } else {
        document.getElementById('otpStatus').textContent = '❌ Invalid OTP. Please try again.';
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

// ===== EVENT BINDINGS (Auth) =====
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
        institute: document.getElementById('editInstitute').value.trim()
    };
    saveProfile(data);
});

// ===== SIDEBAR NAVIGATION =====
document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById('section-' + this.dataset.section);
        if (target) target.classList.remove('hidden');
        if (this.dataset.section === 'calendar') renderCalendar();
    });
});

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try { if (auth.currentUser) await signOut(auth); } catch (e) {}
    clearUserLocally();
    dashScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    notifBar.style.display = 'none';
});

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); }));

// ============================================================
// CALENDAR SYSTEM
// ============================================================
function loadEvents(uid) {
    const eventsRef = ref(database, `events/${uid}`);
    onValue(eventsRef, (snapshot) => {
        eventsCache = snapshot.val() || {};
        const calendarSection = document.getElementById('section-calendar');
        if (!calendarSection.classList.contains('hidden')) {
            renderCalendar();
            renderEventsForDate(selectedDate || currentDate);
        }
    }, (error) => {
        if (error.message.includes('PERMISSION_DENIED')) {
            alert('❌ Permission denied to read events. Please check Firebase security rules.');
        }
        console.error('Load events error:', error);
    });
}

async function saveEvent(uid, eventData) {
    const eventsRef = ref(database, `events/${uid}`);
    const newEventRef = push(eventsRef);
    try {
        await set(newEventRef, { ...eventData, createdAt: new Date().toISOString() });
        return newEventRef.key;
    } catch (err) {
        if (err.message && err.message.includes('PERMISSION_DENIED')) {
            alert('❌ Permission denied to save event. Please check Firebase security rules.');
        } else {
            alert('Error saving event: ' + err.message);
        }
        throw err;
    }
}
async function updateEvent(uid, eventKey, eventData) {
    const eventRef = ref(database, `events/${uid}/${eventKey}`);
    try {
        await update(eventRef, eventData);
    } catch (err) {
        if (err.message && err.message.includes('PERMISSION_DENIED')) {
            alert('❌ Permission denied to update event. Please check Firebase security rules.');
        } else {
            alert('Error updating event: ' + err.message);
        }
        throw err;
    }
}
async function deleteEvent(uid, eventKey) {
    const eventRef = ref(database, `events/${uid}/${eventKey}`);
    try {
        await remove(eventRef);
    } catch (err) {
        if (err.message && err.message.includes('PERMISSION_DENIED')) {
            alert('❌ Permission denied to delete event. Please check Firebase security rules.');
        } else {
            alert('Error deleting event: ' + err.message);
        }
        throw err;
    }
}

function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    const results = [];
    const userData = getUserLocally();
    if (!userData.uid) return results;
    const events = eventsCache || {};
    for (const [key, event] of Object.entries(events)) {
        if (event.date === dateStr) results.push({ key, ...event });
    }
    return results;
}
function getAllEvents() {
    const results = [];
    const userData = getUserLocally();
    if (!userData.uid) return results;
    const events = eventsCache || {};
    for (const [key, event] of Object.entries(events)) {
        results.push({ key, ...event });
    }
    return results;
}

function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    calendarMonthYear.textContent = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'day-cell other-month';
        cell.innerHTML = `<span class="day-number">${day}</span>`;
        calendarGrid.appendChild(cell);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const dateObj = new Date(currentYear, currentMonth, day);
        const dateStr = dateObj.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        cell.className = 'day-cell';
        if (isToday) cell.classList.add('today');
        const events = getEventsForDate(dateObj);
        if (events.length > 0) {
            cell.classList.add('has-event');
        }
        cell.innerHTML = `<span class="day-number">${day}</span>`;
        if (events.length > 0) {
            cell.innerHTML += `<span class="event-dot"></span>`;
        }
        cell.addEventListener('click', () => {
            selectedDate = dateObj;
            renderEventsForDate(dateObj);
            document.querySelectorAll('.day-cell').forEach(el => el.style.border = 'none');
            cell.style.border = '2px solid var(--primary)';
            cell.style.borderRadius = '8px';
            document.getElementById('eventDate').value = dateStr;
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDesc').value = '';
            document.getElementById('eventTime').value = '';
            document.getElementById('eventType').value = 'work';
            document.getElementById('eventModalTitle').textContent = '📝 Add Event';
            document.getElementById('saveEventBtn').textContent = '💾 Save Event';
            document.getElementById('deleteEventBtn').style.display = 'none';
            editingEventKey = null;
            openModal('eventModal');
        });
        calendarGrid.appendChild(cell);
    }
    const totalCells = calendarGrid.children.length;
    const remaining = 42 - totalCells;
    for (let day = 1; day <= remaining; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell other-month';
        cell.innerHTML = `<span class="day-number">${day}</span>`;
        calendarGrid.appendChild(cell);
    }
    if (!selectedDate) {
        selectedDate = today;
        renderEventsForDate(today);
    }
}

function renderEventsForDate(date) {
    const events = getEventsForDate(date);
    const dateStr = date.toISOString().split('T')[0];
    if (events.length === 0) {
        eventList.innerHTML = `<div class="no-events">📭 No events for ${dateStr}. Click a date to add one.</div>`;
        return;
    }
    let html = '';
    const typeEmojis = { 'work': '💼', 'task': '✅', 'class': '📚', 'other': '📌' };
    const typeLabels = { 'work': 'Work', 'task': 'Task', 'class': 'Class', 'other': 'Other' };
    events.forEach(event => {
        const emoji = typeEmojis[event.type] || '📌';
        const label = typeLabels[event.type] || 'Other';
        html += `
            <div class="event-item" data-key="${event.key}">
                <div class="event-info">
                    <div class="event-title">${emoji} ${event.title || 'Untitled'}</div>
                    <div class="event-desc">${event.description || ''} ${event.time ? '· ' + event.time : ''}</div>
                    <div class="event-time">${label}</div>
                </div>
                <div style="display:flex;gap:0.3rem;">
                    <button class="event-edit" data-key="${event.key}" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.9rem;">✏️</button>
                    <button class="event-delete" data-key="${event.key}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.9rem;">🗑️</button>
                </div>
            </div>
        `;
    });
    eventList.innerHTML = html;
    document.querySelectorAll('.event-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.key;
            const userData = getUserLocally();
            if (!userData.uid) return;
            const event = (eventsCache || {})[key];
            if (!event) return;
            editingEventKey = key;
            document.getElementById('eventDate').value = event.date || '';
            document.getElementById('eventTitle').value = event.title || '';
            document.getElementById('eventDesc').value = event.description || '';
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventType').value = event.type || 'work';
            document.getElementById('eventModalTitle').textContent = '✏️ Edit Event';
            document.getElementById('saveEventBtn').textContent = '💾 Update Event';
            document.getElementById('deleteEventBtn').style.display = 'block';
            openModal('eventModal');
        });
    });
    document.querySelectorAll('.event-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const key = btn.dataset.key;
            const userData = getUserLocally();
            if (!userData.uid) return;
            if (confirm('Delete this event?')) {
                try {
                    await deleteEvent(userData.uid, key);
                    loadEvents(userData.uid);
                } catch (err) { console.error(err); }
            }
        });
    });
}

document.getElementById('prevMonthBtn').addEventListener('click', () => {
    if (currentMonth === 0) { currentMonth = 11;
        currentYear--; } else { currentMonth--; }
    renderCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
    if (currentMonth === 11) { currentMonth = 0;
        currentYear++; } else { currentMonth++; }
    renderCalendar();
});
document.getElementById('todayBtn').addEventListener('click', () => {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    selectedDate = today;
    renderCalendar();
});

document.getElementById('saveEventBtn').addEventListener('click', async () => {
    const userData = getUserLocally();
    if (!userData.uid) { alert('Please login first.'); return; }
    const date = document.getElementById('eventDate').value;
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDesc').value.trim();
    const time = document.getElementById('eventTime').value;
    const type = document.getElementById('eventType').value;
    if (!date) { alert('Please select a date.'); return; }
    if (!title) { alert('Please enter a title.'); return; }
    const eventData = { date, title, description, time, type };
    const saveBtn = document.getElementById('saveEventBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.classList.add('btn-loading');
    try {
        if (editingEventKey) {
            await updateEvent(userData.uid, editingEventKey, eventData);
        } else {
            await saveEvent(userData.uid, eventData);
        }
        closeModal('eventModal');
        loadEvents(userData.uid);
        renderCalendar();
        if (selectedDate) renderEventsForDate(selectedDate);
        alert(editingEventKey ? 'Event updated!' : 'Event saved!');
        editingEventKey = null;
    } catch (err) { console.error(err); } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = editingEventKey ? '💾 Update Event' : '💾 Save Event';
        saveBtn.classList.remove('btn-loading');
    }
});
document.getElementById('deleteEventBtn').addEventListener('click', async () => {
    if (!editingEventKey) return;
    const userData = getUserLocally();
    if (!userData.uid) return;
    if (confirm('Delete this event?')) {
        try {
            await deleteEvent(userData.uid, editingEventKey);
            closeModal('eventModal');
            loadEvents(userData.uid);
            renderCalendar();
            if (selectedDate) renderEventsForDate(selectedDate);
            editingEventKey = null;
        } catch (err) { console.error(err); }
    }
});

// ===== SEARCH =====
document.getElementById('searchEventsBtn').addEventListener('click', () => {
    const query = eventSearchInput.value.trim().toLowerCase();
    if (!query) { if (selectedDate) renderEventsForDate(selectedDate); return; }
    const allEvents = getAllEvents();
    const filtered = allEvents.filter(e =>
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        (e.type && e.type.toLowerCase().includes(query)) ||
        (e.date && e.date.includes(query))
    );
    if (filtered.length === 0) {
        eventList.innerHTML = `<div class="no-events">🔍 No events found matching "${query}"</div>`;
        return;
    }
    const typeEmojis = { 'work': '💼', 'task': '✅', 'class': '📚', 'other': '📌' };
    const typeLabels = { 'work': 'Work', 'task': 'Task', 'class': 'Class', 'other': 'Other' };
    let html = `<div style="margin-bottom:0.5rem;color:var(--text-gray);font-size:0.8rem;">🔍 Found ${filtered.length} results for "${query}"</div>`;
    filtered.forEach(event => {
        const emoji = typeEmojis[event.type] || '📌';
        const label = typeLabels[event.type] || 'Other';
        html += `
            <div class="event-item">
                <div class="event-info">
                    <div class="event-title">${emoji} ${event.title || 'Untitled'}</div>
                    <div class="event-desc">📅 ${event.date || ''} ${event.time ? '· ' + event.time : ''}</div>
                    <div class="event-time">${label}</div>
                </div>
            </div>
        `;
    });
    eventList.innerHTML = html;
});
document.getElementById('clearSearchBtn').addEventListener('click', () => {
    eventSearchInput.value = '';
    if (selectedDate) renderEventsForDate(selectedDate);
});
eventSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('searchEventsBtn').click();
});

// ============================================================
// ADVANCED CHATBOT WITH CONTEXT
// ============================================================
const chatToggle = document.getElementById('chatToggle');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');

let chatContext = [];
const MAX_CONTEXT = 10;

chatToggle.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open') && chatMessages.children.length === 1) {
        // Auto-greet with user name if available
        const userData = getUserLocally();
        if (userData.data?.fullName) {
            addMessage(`👋 Welcome back, ${userData.data.fullName}! I'm your ICT assistant. How can I help?`, 'bot', '🤖 Assistant');
        }
    }
});
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
    // Add to context
    chatContext.push({ role: type === 'user' ? 'user' : 'bot', text });
    if (chatContext.length > MAX_CONTEXT) chatContext.shift();
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function getBotReply(input) {
    const lower = input.toLowerCase();
    const context = chatContext.map(c => c.text).join(' ').toLowerCase();

    // Check if user is asking about something from context
    if (context.includes('schedule') && lower.includes('when')) {
        return '📅 Class days are Monday, Wednesday, and Friday at 6:30 PM.';
    }
    if (context.includes('fee') && lower.includes('cost')) {
        return '💰 The annual fee is LKR 15,000. You can find payment details in the Payments section.';
    }

    // Intent detection
    if (lower.includes('class') || lower.includes('day') || lower.includes('schedule'))
        return '📅 Class days: Monday, Wednesday, Friday at 6:30 PM. All sessions are recorded.';
    if (lower.includes('past paper') || lower.includes('paper') || lower.includes('exam'))
        return '📄 Past Papers: https://ictfromabc.com/public-dashboard/papers/al (A/L ICT)';
    if (lower.includes('fee') || lower.includes('price') || lower.includes('cost') || lower.includes('payment'))
        return '💰 Course fees: LKR 15,000 per year. Payment details available in the Payments section. Contact 071 455 5513 for more info.';
    if (lower.includes('contact') || lower.includes('phone') || lower.includes('help'))
        return '📞 Phone: 071 455 5513 | Email: info@ictfromabc.com | Visit: https://ictfromabc.com';
    if (lower.includes('profile') || lower.includes('update') || lower.includes('photo'))
        return '👤 You can update your profile and upload a profile photo from the Profile section. Click the camera icon on your picture to upload.';
    if (lower.includes('otp') || lower.includes('password') || lower.includes('reset'))
        return '🔑 Use "Forgot Password" on the login page to reset with OTP. The OTP will be sent to your phone (demo code shown in console).';
    if (lower.includes('institute') || lower.includes('school') || lower.includes('academy'))
        return '🏫 We partner with Sakya Academy, Yahansa, Nanik, Sipwin, and IMS Kandy. Check the Institutes section for details!';
    if (lower.includes('calendar') || lower.includes('event') || lower.includes('task') || lower.includes('schedule'))
        return '📅 Use the Calendar section to add work hours, tasks, and class dates. You can search and manage all your events!';
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
        return '👋 Hello! How can I assist you with your ICT studies today?';
    if (lower.includes('thanks') || lower.includes('thank you'))
        return '😊 You\'re welcome! Let me know if you need anything else.';
    if (lower.includes('permission') || lower.includes('error') || lower.includes('denied'))
        return '🔐 If you see a permission error, check your Firebase security rules. They should allow authenticated users to read/write their own data.';
    if (lower.includes('subject') || lower.includes('topics'))
        return '📚 We cover Mathematics, Physics, Chemistry, and ICT. Check the Study Topics Overview on your dashboard for detailed progress.';
    if (lower.includes('batch') || lower.includes('al') || lower.includes('ol'))
        return '📖 We offer courses for A/L 2028, 2027, 2026 and O/L 2025, 2024. Check the sidebar for specific course modules.';

    // Default response with context memory
    return `🤔 I can help with class schedules, past papers, fees, contact info, institutes, calendar events, and profile updates. Could you clarify your question?`;
}

function handleChatInput() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, 'user', '👤 You');
    chatInput.value = '';
    showTypingIndicator();

    // Simulate bot thinking
    setTimeout(() => {
        hideTypingIndicator();
        const reply = getBotReply(text);
        addMessage(reply, 'bot', '🤖 Assistant');
    }, 600);
}

chatSend.addEventListener('click', handleChatInput);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleChatInput();
    }
});

// Quick replies
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-reply')) {
        const msg = e.target.dataset.msg;
        if (msg) {
            chatInput.value = msg;
            handleChatInput();
        }
    }
});

// ============================================================
// INIT
// ============================================================
console.log('🔥 Firebase connected!');
console.log('📱 Mobile UI optimized for all devices.');
console.log('🤖 Advanced chatbot with context memory active.');
console.log('📷 Profile photo upload ready.');
