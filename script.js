// ============================================================
// FILE: script.js
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

// ============================================================
// GOOGLE SHEETS - NOTIFICATIONS & NOTICE BOARD
// ============================================================
const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLDVD0TZD9vBDVClfGmQYxXGl3wPopuYdzlP0RQvjXqkmVW305TYaHFcUse5EyJoSmRM9h5OkDmRYb/pub?gid=0&single=true&output=csv';

// ===== NOTICE BOARD SHEET URL =====
const NOTICE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQs27ROiiQDIDFikKLms2lSVaOuvDb4_QntxZ5Y6JxCyM4KumZMTPY9MBCjzS4AjvsugeUgbU004UXo/pub?gid=0&single=true&output=csv';

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

// ===== GREETING POPUP =====
const greetingPopup = document.getElementById('greetingPopup');
const greetingIcon = document.getElementById('greetingIcon');
const greetingTitle = document.getElementById('greetingTitle');
const greetingName = document.getElementById('greetingName');
const greetingSub = document.getElementById('greetingSub');
const greetingTime = document.getElementById('greetingTime');

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { emoji: '🌅', text: 'Good Morning' };
    if (hour < 17) return { emoji: '☀️', text: 'Good Afternoon' };
    if (hour < 20) return { emoji: '🌇', text: 'Good Evening' };
    return { emoji: '🌙', text: 'Good Night' };
}

function showGreeting(name) {
    const greet = getGreeting();
    greetingIcon.textContent = greet.emoji;
    greetingName.textContent = name || 'Student';
    greetingTitle.innerHTML = `${greet.text}, <span id="greetingName">${name || 'Student'}</span>!`;
    const now = new Date();
    greetingSub.textContent = `Welcome to ictfromabc`;
    greetingTime.textContent =
        `⏰ ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    greetingPopup.classList.add('active');
}
window.closeGreeting = function() {
    greetingPopup.classList.remove('active');
};

// ============================================================
// WORK TIME ANALYZER
// ============================================================
let timerInterval = null;
let seconds = 0;
let totalSeconds = parseInt(localStorage.getItem('ict_total_seconds') || '0');
let sessionCount = parseInt(localStorage.getItem('ict_session_count') || '0');
let isRunning = false;

const timerDisplay = document.getElementById('timerDisplay');
const totalTimeDisplay = document.getElementById('totalTimeDisplay');
const sessionCountDisplay = document.getElementById('sessionCount');
const startBtn = document.getElementById('startTimerBtn');
const stopBtn = document.getElementById('stopTimerBtn');
const resetBtn = document.getElementById('resetTimerBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

function formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(seconds);
    totalTimeDisplay.textContent = formatTime(totalSeconds);
    sessionCountDisplay.textContent = sessionCount;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    statusDot.className = 'status-dot active';
    statusText.textContent = '⏳ Studying...';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    timerInterval = setInterval(() => {
        seconds++;
        totalSeconds++;
        localStorage.setItem('ict_total_seconds', String(totalSeconds));
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (!isRunning) return;
    isRunning = false;
    statusDot.className = 'status-dot inactive';
    statusText.textContent = '⏸️ Paused';
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (seconds > 0) {
        sessionCount++;
        localStorage.setItem('ict_session_count', String(sessionCount));
        updateTimerDisplay();
    }
    seconds = 0;
}

function resetTimer() {
    if (isRunning) stopTimer();
    seconds = 0;
    totalSeconds = 0;
    sessionCount = 0;
    localStorage.setItem('ict_total_seconds', '0');
    localStorage.setItem('ict_session_count', '0');
    statusDot.className = 'status-dot inactive';
    statusText.textContent = '🔄 Reset';
    updateTimerDisplay();
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
updateTimerDisplay();

// ============================================================
// NOTICE BOARD - with Google Sheets Integration
// ============================================================
const noticeInput = document.getElementById('noticeInput');
const postNoticeBtn = document.getElementById('postNoticeBtn');
const noticeList = document.getElementById('noticeList');
const refreshBtn = document.getElementById('refreshNoticesBtn');
const clearBtn = document.getElementById('clearLocalNoticesBtn');

let localNotices = [];

function addLocalNotice(text) {
    if (!text.trim()) return;
    const now = new Date();
    const timeStr =
        `📅 Posted: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const notice = { text: text.trim(), time: timeStr, source: 'local' };
    localNotices.push(notice);
    renderNotices();
    noticeInput.value = '';
    localStorage.setItem('ict_local_notices', JSON.stringify(localNotices));
}

function renderNotices() {
    const allNotices = [...sheetNotices, ...localNotices];
    if (allNotices.length === 0) {
        noticeList.innerHTML =
            `<div style="color:var(--text-gray);padding:0.5rem;text-align:center;font-size:0.85rem;">📭 No notices yet. Post one or refresh from Google Sheets.</div>`;
        return;
    }
    let html = '';
    allNotices.forEach((notice) => {
        const sourceTag = notice.source === 'sheet' ?
            `<span style="color:var(--primary-light);font-size:0.6rem;background:rgba(219,57,0,0.15);padding:0.1rem 0.4rem;border-radius:40px;margin-left:0.3rem;">📊 Sheet</span>` :
            `<span style="color:var(--text-gray);font-size:0.6rem;margin-left:0.3rem;">📝 Local</span>`;
        html += `
            <div class="notice-item">
                <div class="notice-text"><span class="notice-pin">📌</span> ${notice.text} ${sourceTag}</div>
                <div class="notice-time">${notice.time}</div>
            </div>
        `;
    });
    noticeList.innerHTML = html;
}

function loadLocalNotices() {
    const stored = localStorage.getItem('ict_local_notices');
    if (stored) {
        try {
            localNotices = JSON.parse(stored);
        } catch (e) { localNotices = []; }
    } else {
        if (localNotices.length === 0) {
            const demos = [
                { text: '📌 Welcome to the new ictfromabc Student Portal!', time: '📅 Posted: Today, 9:00 AM', source: 'local' },
                { text: '📌 New practical sessions starting next week. Check the schedule.', time: '📅 Posted: Yesterday, 6:30 PM', source: 'local' },
                { text: '📌 A/L 2026 past papers updated. Download from the portal.', time: '📅 Posted: 2 days ago', source: 'local' }
            ];
            localNotices = demos;
            localStorage.setItem('ict_local_notices', JSON.stringify(localNotices));
        }
    }
}

let sheetNotices = [];

async function fetchSheetNotices() {
    try {
        if (NOTICE_SHEET_URL.includes('YOUR_SHEET_ID')) {
            console.warn('📢 To enable Google Sheets notices, replace NOTICE_SHEET_URL with your published CSV URL.');
            sheetNotices = [];
            renderNotices();
            return;
        }
        const response = await fetch(NOTICE_SHEET_URL);
        if (!response.ok) throw new Error('Failed to fetch sheet');
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            sheetNotices = [];
            renderNotices();
            return;
        }
        const newNotices = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 3) {
                const timestamp = cols[0] || '';
                const message = cols[1] || '';
                const active = cols[2]?.toUpperCase() === 'TRUE' ||
                    cols[2]?.toUpperCase() === 'YES' ||
                    cols[2]?.toUpperCase() === '1';
                if (active && message) {
                    const timeStr = timestamp ? `📅 ${timestamp}` : '📅 Posted recently';
                    newNotices.push({ text: message, time: timeStr, source: 'sheet' });
                }
            }
        }
        sheetNotices = newNotices;
        renderNotices();
    } catch (err) {
        console.warn('Notice sheet error:', err);
        sheetNotices = [];
        renderNotices();
    }
}

postNoticeBtn.addEventListener('click', () => {
    addLocalNotice(noticeInput.value);
});
noticeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLocalNotice(noticeInput.value);
});

refreshBtn.addEventListener('click', async () => {
    refreshBtn.textContent = '⏳ Loading...';
    refreshBtn.disabled = true;
    await fetchSheetNotices();
    refreshBtn.textContent = '🔄 Refresh from Sheet';
    refreshBtn.disabled = false;
    const statusEl = document.createElement('div');
    statusEl.style.cssText = 'color:var(--primary-light);font-size:0.7rem;margin-top:0.3rem;text-align:center;';
    statusEl.textContent = '✅ Notices updated from Google Sheet!';
    noticeList.parentNode.appendChild(statusEl);
    setTimeout(() => statusEl.remove(), 2000);
});

clearBtn.addEventListener('click', () => {
    if (confirm('Delete all local notices? (Sheet notices will remain)')) {
        localNotices = [];
        localStorage.removeItem('ict_local_notices');
        renderNotices();
    }
});

loadLocalNotices();
fetchSheetNotices();

function openTutorialModal() {
    openModal('tutorialModal');
}
window.openTutorialModal = openTutorialModal;

// ============================================================
// PROFILE PHOTO UPLOAD
// ============================================================
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
    } catch (err) {
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

// ============================================================
// GOOGLE SHEETS NOTIFICATION FETCH (for notification bar)
// ============================================================
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
                const active = cols[2]?.toUpperCase() === 'TRUE' ||
                    cols[2]?.toUpperCase() === 'YES' ||
                    cols[2]?.toUpperCase() === '1';
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

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
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

// ============================================================
// SHOW DASHBOARD
// ============================================================
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
    setTimeout(() => {
        showGreeting(name);
    }, 600);
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
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

// ============================================================
// OTP
// ============================================================
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

// ============================================================
// AUTH STATE
// ============================================================
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

// ============================================================
// EVENT BINDINGS (Auth)
// ============================================================
loginBtn.addEventListener('click', () => loginUser(loginPhone.value.trim(), loginPass.value.trim()));
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
googleBtn.addEventListener('click', googleLogin);

document.getElementById('signupLink').addEventListener('click', (e) => { e.preventDefault();
    openModal('signupModal'); });
document.getElementById('forgotLink').addEventListener('click', (e) => { e.preventDefault();
    openModal('forgotModal'); });

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

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
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

// ============================================================
// LOGOUT
// ============================================================
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try { if (auth.currentUser) await signOut(auth); } catch (e) {}
    clearUserLocally();
    dashScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    notifBar.style.display = 'none';
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
    }
});

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('active'); }

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', function(e) { if (e.target === this)
        this.classList.remove('active'); }));

// ============================================================
// CALENDAR SYSTEM
// ============================================================
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
    calendarMonthYear.textContent = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long',
        year: 'numeric' });
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
        eventList.innerHTML =
            `<div class="no-events">📭 No events for ${dateStr}. Click a date to add one.</div>`;
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

// ============================================================
// SEARCH EVENTS
// ============================================================
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
    let html =
        `<div style="margin-bottom:0.5rem;color:var(--text-gray);font-size:0.8rem;">🔍 Found ${filtered.length} results for "${query}"</div>`;
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
// CHATBOT
// ============================================================
const chatToggle = document.getElementById('chatToggle');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessages = document.getElementById('chatMessages');
let chatContext = [];

chatToggle.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
        const userData = getUserLocally();
        if (userData.data?.fullName) {
            const lastMsg = chatMessages.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('bot') && lastMsg.innerText.includes('Hi!')) {
                // already greeted
            } else {
                addMessage(`👋 Welcome back, ${userData.data.fullName}! I'm your ICT assistant. How can I help?`,
                    'bot', '🤖 Assistant');
            }
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
    chatContext.push({ role: type === 'user' ? 'user' : 'bot', text });
    if (chatContext.length > 10) chatContext.shift();
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
    if (lower.includes('calendar') || lower.includes('event') || lower.includes('task'))
        return '📅 Use the Calendar section to add work hours, tasks, and class dates. You can search and manage all your events!';
    if (lower.includes('notice') || lower.includes('announcement') || lower.includes('board') || lower.includes('sheet'))
        return '📢 Check the Notice Board section for announcements. You can connect it to Google Sheets using the tutorial.';
    if (lower.includes('timer') || lower.includes('analyzer') || lower.includes('work'))
        return '⏱️ Use the Work Time Analyzer to track your study sessions. Start, stop, and reset to monitor your productivity!';
    if (lower.includes('book') || lower.includes('animation') || lower.includes('3d') || lower.includes('flip'))
        return '📖 Check out the 3D book animation on the home page! It shows the "Evolution of Computing" lesson with interactive page flips.';
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
        return '👋 Hello! How can I assist you with your ICT studies today?';
    if (lower.includes('thanks') || lower.includes('thank you'))
        return '😊 You\'re welcome! Let me know if you need anything else.';
    if (lower.includes('permission') || lower.includes('error') || lower.includes('denied'))
        return '🔐 If you see a permission error, check your Firebase security rules. They should allow authenticated users to read/write their own data.';
    if (lower.includes('subject') || lower.includes('topics'))
        return '📚 We cover Mathematics, Physics, Chemistry, and ICT. Check the Study Topics Overview on your dashboard for detailed progress.';

    return '🤔 I can help with class schedules, past papers, fees, contact info, institutes, calendar events, notice board, work analyzer, 3D book, and profile updates. Could you clarify your question?';
}

function handleChatInput() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, 'user', '👤 You');
    chatInput.value = '';
    showTypingIndicator();
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
// 3D BOOK ANIMATION CONTROLS
// ============================================================
const book = document.getElementById('book3d');
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const page3 = document.getElementById('page3');
const page4 = document.getElementById('page4');
const prevBtn = document.getElementById('prevPageBtn');
const nextBtn = document.getElementById('nextPageBtn');
const autoBtn = document.getElementById('autoFlipBtn');
const resetBtn = document.getElementById('resetBookBtn');

let currentPage = 0;
let isAutoFliping = false;
let autoFlipInterval = null;
const totalPages = 4;

function updateBookState() {
    // Reset all pages
    page1.classList.remove('flipped');
    page2.classList.remove('flipped');
    page3.classList.remove('flipped');
    page4.classList.remove('flipped');

    // Flip pages based on currentPage
    if (currentPage >= 1) page1.classList.add('flipped');
    if (currentPage >= 2) page2.classList.add('flipped');
    if (currentPage >= 3) page3.classList.add('flipped');
    if (currentPage >= 4) page4.classList.add('flipped');

    // Update button states
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages;

    // Update auto button text
    autoBtn.textContent = isAutoFliping ? '⏸️ Pause' : '▶ Auto Flip';
    autoBtn.classList.toggle('active-btn', isAutoFliping);
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateBookState();
    }
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        updateBookState();
    }
}

function toggleAutoFlip() {
    isAutoFliping = !isAutoFliping;
    if (isAutoFliping) {
        autoFlipInterval = setInterval(() => {
            if (currentPage < totalPages) {
                currentPage++;
                updateBookState();
            } else {
                // Reset to beginning after reaching end
                setTimeout(() => {
                    currentPage = 0;
                    updateBookState();
                }, 800);
                clearInterval(autoFlipInterval);
                isAutoFliping = false;
                autoBtn.textContent = '▶ Auto Flip';
                autoBtn.classList.remove('active-btn');
            }
        }, 2500);
        autoBtn.textContent = '⏸️ Pause';
        autoBtn.classList.add('active-btn');
    } else {
        clearInterval(autoFlipInterval);
        autoFlipInterval = null;
        autoBtn.textContent = '▶ Auto Flip';
        autoBtn.classList.remove('active-btn');
    }
}

function resetBook() {
    if (isAutoFliping) {
        clearInterval(autoFlipInterval);
        autoFlipInterval = null;
        isAutoFliping = false;
        autoBtn.textContent = '▶ Auto Flip';
        autoBtn.classList.remove('active-btn');
    }
    currentPage = 0;
    updateBookState();
}

// Event listeners for book controls
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);
autoBtn.addEventListener('click', toggleAutoFlip);
resetBtn.addEventListener('click', resetBook);

// Initialize book
updateBookState();

// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
    if (e.key === ' ') {
        e.preventDefault();
        toggleAutoFlip();
    }
});

// ============================================================
// PARTICLE ANIMATION
// ============================================================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let particleCount = 80;
let mouseX = 0,
    mouseY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.speedY = (Math.random() - 0.5) * 0.6;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = `rgba(219, 57, 0, ${this.opacity})`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
            const force = (150 - dist) / 150 * 0.02;
            this.x += dx * force;
            this.y += dy * force;
        }
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width) this.x = canvas.width;
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height) this.y = canvas.height;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (touch) {
        mouseX = touch.clientX;
        mouseY = touch.clientY;
    }
});

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(219, 57, 0, ${0.1 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

// ============================================================
// INIT
// ============================================================
console.log('🔥 Firebase connected!');
console.log('📢 Notice Board: Google Sheets integration ready.');
console.log('📖 3D Book Animation: Evolution of Computing lesson.');
console.log('📱 Mobile UI optimized.');
console.log('🤖 Advanced chatbot with context memory.');
console.log('⏱️ Work Time Analyzer active.');
