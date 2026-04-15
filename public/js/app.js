/* =============================================
   Shared JS Utilities
   ============================================= */

// ---- Toast Notifications ----
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ---- API Helper ----
async function apiRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    credentials: 'include',
    headers: {}
  };
  if (body && !(body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  } else if (body) {
    options.body = body;
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---- Session / Auth ----
async function getSession() {
  const { data } = await apiRequest('/api/auth/me');
  return data;
}

async function requireLogin(redirectTo = '/login') {
  const session = await getSession();
  if (!session.loggedIn) {
    window.location.href = redirectTo;
    return null;
  }
  return session.user;
}

async function requireGuest(redirectTo = '/dashboard') {
  const session = await getSession();
  if (session.loggedIn) {
    window.location.href = redirectTo;
  }
}

// ---- Navbar Auth State ----
async function updateNavbar() {
  const session = await getSession();
  const loginLink = document.getElementById('nav-login');
  const registerLink = document.getElementById('nav-register');
  const userInfo = document.getElementById('nav-user-info');
  const logoutBtn = document.getElementById('nav-logout');
  const uploadLink = document.getElementById('nav-upload');

  if (session.loggedIn) {
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (userInfo) { userInfo.style.display = 'flex'; userInfo.querySelector('span').textContent = `👤 ${session.user.name}`; }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (uploadLink) uploadLink.style.display = 'inline-flex';
  } else {
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (registerLink) registerLink.style.display = 'inline-flex';
    if (userInfo) userInfo.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (uploadLink) uploadLink.style.display = 'none';
  }
}

// ---- Logout ----
async function logout() {
  await apiRequest('/api/auth/logout', 'POST');
  window.location.href = '/';
}

// ---- File Size Formatter ----
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---- Date Formatter ----
function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- File Icon ----
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝',
    ppt: '📊', pptx: '📊',
    txt: '📃', png: '🖼️', jpg: '🖼️', jpeg: '🖼️'
  };
  return icons[ext] || '📁';
}

// ---- Note Card Builder ----
function buildNoteCard(note, showDelete = false) {
  return `
    <div class="note-card" id="note-${note.id}">
      <span class="card-subject-tag">${escHtml(note.subject)}</span>
      <div class="card-title">${escHtml(note.title)}</div>
      <div class="card-desc">${note.description ? escHtml(note.description) : '<em>No description</em>'}</div>
      <div class="card-meta">
        <span class="uploader">👤 ${escHtml(note.uploader_name)}</span>
        <span>🕒 ${formatDate(note.upload_date)}</span>
      </div>
      <div class="card-meta" style="border-top:none;padding-top:0;margin-bottom:0">
        <span>${getFileIcon(note.file_name)} ${escHtml(note.file_name.length > 22 ? note.file_name.substring(0,22)+'...' : note.file_name)}</span>
        <span>⬇️ ${note.download_count} downloads</span>
      </div>
      <div class="card-actions" style="margin-top:14px">
        <a href="/api/notes/download/${note.id}" class="btn btn-primary btn-sm" style="flex:1;justify-content:center">
          ⬇ Download
        </a>
        ${showDelete ? `<button onclick="deleteNote(${note.id})" class="btn btn-danger btn-sm">🗑</button>` : ''}
      </div>
    </div>
  `;
}

// ---- HTML Escaper ----
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

// ---- Hamburger menu ----
document.addEventListener('DOMContentLoaded', () => {
  const ham = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (ham && navLinks) {
    ham.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
  updateNavbar();
});
