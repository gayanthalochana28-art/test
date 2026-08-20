// ============================================================
// FILE: script.js
// ============================================================

// ============================================================
// COMPLETE JAVASCRIPT - Admin Panel + Firebase Integration
// ============================================================

// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    updatePassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    update,
    get,
    child,
    push,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

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
const provider = new GoogleAuthProvider();

// ============================================================
// ADMIN CREDENTIALS (Hidden from UI)
// ============================================================
const ADMIN_EMAIL = 'gayanthalochana28@gmail.com';

// ============================================================
// DOM REFS
// ============================================================
const authScreen = document.getElementById('authScreen');
const dashScreen = document.getElementById('dashboardScreen');
const loginEmail = document.getElementById('loginEmailInput');
const loginPass = document.getElementById('loginPasswordInput');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');

// Header user badge
const headerAvatar = document.getElementById('headerAvatar');
const headerName = document.getElementById('headerName');
const headerRole = document.getElementById('headerRole');

// Sidebar
const roleBadge = document.getElementById('roleBadge');
const adminSections = document.getElementById('adminSections');

// Profile fields
const profileImgDisplay = document.getElementById('profileImgDisplay');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const profileEmailDisplay = document.getElementById('profileEmailDisplay');
const pFullName = document.getElementById('pFullName');
const pEmail = document.getElementById('pEmail');
const pRole = document.getElementById('pRole');
const dashName = document.getElementById('dashName');

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
    constructor() { this.reset(); }
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
        const dx = this.x - mouseX,
            dy = this.y - mouseY;
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
for (let i = 0; i < particleCount; i++) particles.push(new Particle());

document.addEventListener('mousemove', (e) => { mouseX = e.clientX;
    mouseY = e.clientY; });
document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (touch) { mouseX = touch.clientX;
        mouseY = touch.clientY; }
});

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update();
        p.draw(); });
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

function isAdmin(email) {
    return email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ============================================================
// SHOW DASHBOARD
// ============================================================
function showDashboard(userData) {
    authScreen.classList.add('hidden');
    dashScreen.classList.remove('hidden');

    const email = userData?.email || 'student@example.com';
    const name = userData?.fullName || userData?.name || 'Student';
    const isAdminUser = isAdmin(email);

    // Update header
    headerName.textContent = name;
    if (userData?.photo) {
        const img = headerAvatar.querySelector('img');
        if (img) img.src = userData.photo;
    }
    headerRole.textContent = isAdminUser ? 'Admin' : 'Student';
    headerRole.className = 'role-tag' + (isAdminUser ? ' admin' : '');

    // Update sidebar role badge
    if (isAdminUser) {
        roleBadge.textContent = 'Admin';
        roleBadge.style.background = 'linear-gradient(135deg, #db3900, #ff4d1a)';
        adminSections.style.display = 'block';
    } else {
        roleBadge.textContent = 'Student';
        roleBadge.style.background = 'var(--primary)';
        adminSections.style.display = 'none';
    }

    // Update profile
    dashName.textContent = name;
    profileNameDisplay.textContent = name;
    profileEmailDisplay.textContent = email;
    pFullName.textContent = name;
    pEmail.textContent = email;
    pRole.textContent = isAdminUser ? 'Admin' : 'Student';

    if (userData?.photo) {
        profileImgDisplay.src = userData.photo;
    }

    // Load admin data if admin
    if (isAdminUser) {
        loadAdminData();
        navigateTo('admin-dashboard');
    } else {
        navigateTo('home');
    }
}

// ============================================================
// ADMIN DATA LOADING
// ============================================================
let allStudents = [],
    allCourses = [],
    allPdfs = [];

function loadAdminData() {
    loadStudents();
    loadCourses();
    loadPdfs();
    updateAdminStats();
}

function loadStudents() {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        allStudents = [];
        if (data) {
            for (const [key, user] of Object.entries(data)) {
                if (!isAdmin(user.email)) {
                    allStudents.push({ uid: key, ...user });
                }
            }
        }
        renderStudentsTable();
        document.getElementById('adminTotalStudents').textContent = allStudents.length;
        document.getElementById('adminStudentCount').textContent = allStudents.length;
    });
}

function renderStudentsTable() {
    const tbody = document.getElementById('adminStudentsTable');
    if (allStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-gray);">No students registered yet.</td></tr>';
        return;
    }
    let html = '';
    allStudents.forEach((s, i) => {
        html += `
                    <tr>
                        <td>${i+1}</td>
                        <td>${s.fullName || s.name || 'Unknown'}</td>
                        <td>${s.email || '-'}</td>
                        <td>${s.phone || '-'}</td>
                        <td>${s.batch || 'N/A'}</td>
                    </tr>
                `;
    });
    tbody.innerHTML = html;
}

function loadCourses() {
    const coursesRef = ref(database, 'courses');
    onValue(coursesRef, (snapshot) => {
        const data = snapshot.val();
        allCourses = [];
        if (data) {
            for (const [key, course] of Object.entries(data)) {
                allCourses.push({ key, ...course });
            }
        }
        renderCourses();
        document.getElementById('adminTotalCourses').textContent = allCourses.length;
        document.getElementById('adminCourseCount').textContent = allCourses.length;
    });
}

function renderCourses() {
    const container = document.getElementById('courseList');
    if (allCourses.length === 0) {
        container.innerHTML = '<div class="list-item" style="color:var(--text-gray);">No courses added yet.</div>';
        return;
    }
    let html = '';
    allCourses.forEach(c => {
        html += `
                    <div class="list-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.3rem;">
                        <div>
                            <strong style="color:white;">${c.title}</strong>
                            <span style="color:var(--text-gray);font-size:0.75rem;margin-left:0.5rem;">${c.instructor || 'Unknown'}</span>
                            <span style="color:var(--text-gray);font-size:0.7rem;margin-left:0.5rem;">${c.description || ''}</span>
                        </div>
                        <div>
                            <button class="home-btn home-btn-danger" style="padding:0.2rem 0.6rem;font-size:0.7rem;" onclick="deleteCourse('${c.key}')">🗑️</button>
                        </div>
                    </div>
                `;
    });
    container.innerHTML = html;
}

window.deleteCourse = function(key) {
    if (confirm('Delete this course?')) {
        remove(ref(database, `courses/${key}`)).then(() => loadCourses());
    }
};

function loadPdfs() {
    const pdfsRef = ref(database, 'pdfs');
    onValue(pdfsRef, (snapshot) => {
        const data = snapshot.val();
        allPdfs = [];
        if (data) {
            for (const [key, pdf] of Object.entries(data)) {
                allPdfs.push({ key, ...pdf });
            }
        }
        renderPdfs();
        document.getElementById('adminTotalPdfs').textContent = allPdfs.length;
        document.getElementById('adminPdfCount').textContent = allPdfs.length;
    });
}

function renderPdfs() {
    const container = document.getElementById('pdfList');
    if (allPdfs.length === 0) {
        container.innerHTML = '<div class="list-item" style="color:var(--text-gray);">No PDFs uploaded yet.</div>';
        return;
    }
    let html = '';
    allPdfs.forEach(p => {
        html += `
                    <div class="list-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.3rem;">
                        <div>
                            <strong style="color:white;">📄 ${p.title}</strong>
                            <span style="color:var(--text-gray);font-size:0.75rem;margin-left:0.5rem;">${p.category || 'General'}</span>
                            <a href="${p.url}" target="_blank" style="color:var(--primary);font-size:0.75rem;margin-left:0.5rem;">🔗</a>
                        </div>
                        <div>
                            <button class="home-btn home-btn-danger" style="padding:0.2rem 0.6rem;font-size:0.7rem;" onclick="deletePdf('${p.key}')">🗑️</button>
                        </div>
                    </div>
                `;
    });
    container.innerHTML = html;
}

window.deletePdf = function(key) {
    if (confirm('Delete this PDF?')) {
        remove(ref(database, `pdfs/${key}`)).then(() => loadPdfs());
    }
};

function updateAdminStats() {
    // Already updated in each load function
}

// ============================================================
// ADMIN CRUD OPERATIONS
// ============================================================
function openCourseModal() {
    document.getElementById('courseTitle').value = '';
    document.getElementById('courseDesc').value = '';
    document.getElementById('courseInstructor').value = '';
    openModal('courseModal');
}
window.openCourseModal = openCourseModal;

document.getElementById('saveCourseBtn').addEventListener('click', () => {
    const title = document.getElementById('courseTitle').value.trim();
    const desc = document.getElementById('courseDesc').value.trim();
    const instructor = document.getElementById('courseInstructor').value.trim();
    if (!title) { alert('Please enter a course title.'); return; }
    const data = { title, description: desc, instructor, createdAt: Date.now() };
    push(ref(database, 'courses'), data).then(() => {
        alert('Course added!');
        closeModal('courseModal');
        loadCourses();
    });
});

function openPdfModal() {
    document.getElementById('pdfTitle').value = '';
    document.getElementById('pdfUrl').value = '';
    document.getElementById('pdfCategory').value = '';
    openModal('pdfModal');
}
window.openPdfModal = openPdfModal;

document.getElementById('savePdfBtn').addEventListener('click', () => {
    const title = document.getElementById('pdfTitle').value.trim();
    const url = document.getElementById('pdfUrl').value.trim();
    const category = document.getElementById('pdfCategory').value.trim();
    if (!title || !url) { alert('Please enter title and URL.'); return; }
    const data = { title, url, category, uploadedAt: Date.now() };
    push(ref(database, 'pdfs'), data).then(() => {
        alert('PDF uploaded!');
        closeModal('pdfModal');
        loadPdfs();
    });
});

// ============================================================
// AUTH FUNCTIONS
// ============================================================
async function loginUser(email, pass) {
    if (!email || !pass) { alert('Please enter email and password.'); return; }
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loader"></span> Logging in...';
    loginBtn.classList.add('btn-loading');
    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const user = cred.user;
        const snapshot = await get(child(ref(database), `users/${user.uid}`));
        const data = snapshot.val() || { fullName: 'Student', email: user.email };
        data.uid = user.uid;
        data.email = user.email;
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

async function signupUser(name, email, pass) {
    if (!name || !email || !pass) { alert('Please fill all fields.'); return; }
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const user = cred.user;
        const data = { fullName: name, email, role: 'student' };
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
                email: user.email,
                role: 'student',
                photo: user.photoURL || ''
            };
            await set(ref(database, `users/${user.uid}`), data);
        }
        data.uid = user.uid;
        data.email = user.email;
        if (user.photoURL) data.photo = user.photoURL;
        saveUserLocally(user.uid, data);
        showDashboard(data);
    } catch (err) {
        alert('Google login failed. Please try again.');
        console.error(err);
    }
}

async function changePassword(currentPass, newPass) {
    if (!currentPass || !newPass) { alert('Enter both passwords.'); return; }
    if (newPass.length < 6) { alert('New password must be at least 6 characters.'); return; }
    try {
        const user = auth.currentUser;
        if (user) {
            await updatePassword(user, newPass);
            alert('Password updated successfully!');
            closeModal('changePassModal');
        } else {
            alert('Please login again.');
        }
    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    }
}

async function saveProfile(name, phone) {
    const userData = getUserLocally();
    if (!userData.uid) { alert('Please login first.'); return; }
    try {
        const updates = {};
        if (name) updates.fullName = name;
        if (phone) updates.phone = phone;
        await update(ref(database, `users/${userData.uid}`), updates);
        const merged = { ...userData.data, ...updates };
        saveUserLocally(userData.uid, merged);
        showDashboard(merged);
        closeModal('profileModal');
        alert('Profile updated!');
    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    }
}

// ============================================================
// AUTH STATE
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snapshot = await get(child(ref(database), `users/${user.uid}`));
        const data = snapshot.val() || { fullName: 'Student', email: user.email };
        data.uid = user.uid;
        data.email = user.email;
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
// EVENT BINDINGS
// ============================================================
loginBtn.addEventListener('click', () => loginUser(loginEmail.value.trim(), loginPass.value.trim()));
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
googleBtn.addEventListener('click', googleLogin);

document.getElementById('signupLink').addEventListener('click', (e) => { e.preventDefault();
    openModal('signupModal'); });
document.getElementById('forgotLink').addEventListener('click', (e) => { e.preventDefault();
    openModal('forgotModal'); });

document.getElementById('signupBtn').addEventListener('click', () => {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPass').value.trim();
    signupUser(name, email, pass);
});

document.getElementById('resetPassBtn').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) { alert('Enter your email.'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset link sent to your email!');
        closeModal('forgotModal');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

document.getElementById('changePassBtn').addEventListener('click', () => {
    changePassword(
        document.getElementById('currentPass').value.trim(),
        document.getElementById('newPass').value.trim()
    );
});
document.getElementById('changePasswordBtn').addEventListener('click', () => openModal('changePassModal'));

document.getElementById('editProfileBtn').addEventListener('click', () => {
    const data = getUserLocally().data || {};
    document.getElementById('editFullName').value = data.fullName || '';
    document.getElementById('editPhone').value = data.phone || '';
    openModal('profileModal');
});

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    saveProfile(
        document.getElementById('editFullName').value.trim(),
        document.getElementById('editPhone').value.trim()
    );
});

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
function navigateTo(section) {
    document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));

    const target = document.getElementById('section-' + section);
    if (target) target.classList.remove('hidden');

    const navItem = document.querySelector(`.sidebar .nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');
}
window.navigateTo = navigateTo;

document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(item => {
    item.addEventListener('click', function() {
        navigateTo(this.dataset.section);
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
});

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('active'); }

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.openModal = openModal;
window.closeModal = closeModal;
document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
}));

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
            if (!lastMsg || !lastMsg.classList.contains('bot') || !lastMsg.innerText.includes('Hi!')) {
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
    if (lower.includes('class') || lower.includes('day') || lower.includes('schedule'))
        return '📅 Class days: Monday, Wednesday, Friday at 6:30 PM. All sessions are recorded.';
    if (lower.includes('admin') || lower.includes('course') || lower.includes('pdf') || lower.includes('student'))
        return '👑 Admin panel: Manage courses, PDFs, and students. Accessible only to administrators.';
    if (lower.includes('profile') || lower.includes('update'))
        return '👤 You can update your profile from the Profile section.';
    if (lower.includes('hello') || lower.includes('hi'))
        return '👋 Hello! How can I assist you with your ICT studies today?';
    if (lower.includes('thanks'))
        return '😊 You\'re welcome! Let me know if you need anything else.';
    return `🤔 I can help with class schedules, courses, PDFs, profile updates, and admin tasks. Could you clarify your question?`;
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
// INIT
// ============================================================
console.log('🔥 Firebase connected!');
console.log('👑 Admin: ' + ADMIN_EMAIL);
console.log('📱 ICT Student Portal with Admin Panel loaded.');
