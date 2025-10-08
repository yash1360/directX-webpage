const STORAGE_KEY = 'profiles.v1';

/** @typedef {{ id: string; name: string; username: string; imageDataUrl?: string }} Profile */

const cardsRow = document.getElementById('cardsRow');
const addDialog = document.getElementById('addProfileDialog');
const addForm = document.getElementById('addProfileForm');
const cancelAddBtn = document.getElementById('cancelAdd');

// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    document.getElementById(id).classList.add('active');
  });
});

function readProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** @param {Profile[]} profiles */
function writeProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function normalizeInstagramUrl(url) {
  try {
    const u = new URL(url);
    if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, ''))) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const username = parts[0];
    if (!username) return null;
    return { username, url: `https://instagram.com/${username}` };
  } catch {
    return null;
  }
}

function instaDeepLink(username) {
  // instagram://user?username=USERNAME works on iOS/Android; fall back to web
  return {
    appUrl: `instagram://user?username=${encodeURIComponent(username)}`,
    webUrl: `https://instagram.com/${encodeURIComponent(username)}`
  };
}

function createAddCard() {
  const add = document.createElement('div');
  add.className = 'add-card';
  const btn = document.createElement('button');
  btn.className = 'add-btn';
  btn.setAttribute('aria-label', 'Add profile');
  btn.textContent = '+';
  const label = document.createElement('span');
  label.textContent = 'Add a profile';
  add.appendChild(btn);
  add.appendChild(label);
  btn.addEventListener('click', () => addDialog.showModal());
  return add;
}

function render(profiles) {
  cardsRow.innerHTML = '';
  const addCard = createAddCard();

  profiles.forEach(p => {
    const tpl = /** @type {HTMLTemplateElement} */ (document.getElementById('cardTemplate'));
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    const avatar = node.querySelector('.avatar');
    const name = node.querySelector('.name');
    const username = node.querySelector('.username');
    const openBtn = node.querySelector('.btn.open');

    name.textContent = p.name;
    username.textContent = `@${p.username}`;
    if (p.imageDataUrl) {
      avatar.style.backgroundImage = `url(${p.imageDataUrl})`;
    }

    openBtn.addEventListener('click', () => {
      const { appUrl, webUrl } = instaDeepLink(p.username);
      const now = Date.now();
      // Try to open the app link; after a short timeout, navigate to web
      window.location.href = appUrl;
      setTimeout(() => {
        // If app didn't open, this will take over
        if (Date.now() - now < 1800) {
          window.open(webUrl, '_blank');
        }
      }, 1200);
    });

    cardsRow.appendChild(node);
  });

  // Add button should appear after the last profile and keep moving forward
  cardsRow.appendChild(addCard);
}

async function fileToDataUrl(file) {
  if (!file) return undefined;
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formError = document.getElementById('formError');
  formError.hidden = true;
  formError.textContent = '';

  const name = /** @type {HTMLInputElement} */ (document.getElementById('personName')).value.trim();
  const url = /** @type {HTMLInputElement} */ (document.getElementById('instagramUrl')).value.trim();
  const file = /** @type {HTMLInputElement} */ (document.getElementById('profileImage')).files?.[0];

  if (!name) {
    formError.textContent = 'Please enter a name.';
    formError.hidden = false;
    return;
  }
  const norm = normalizeInstagramUrl(url);
  if (!norm) {
    formError.textContent = 'Please enter a valid Instagram profile URL.';
    formError.hidden = false;
    return;
  }

  const imageDataUrl = await fileToDataUrl(file);
  const profiles = readProfiles();
  const id = crypto.randomUUID();
  const profile = { id, name, username: norm.username, imageDataUrl };
  profiles.push(profile);
  writeProfiles(profiles);
  render(profiles);
  addDialog.close();
  addForm.reset();
});

cancelAddBtn.addEventListener('click', () => addDialog.close());

// Init
render(readProfiles());


