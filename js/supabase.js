// js/supabase.js
// Ganti 2 baris ini dengan milikmu:
const SUPABASE_URL = 'https://irujzlhwypioymdcunbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWp6bGh3eXBpb3ltZGN1bmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzc3MTUsImV4cCI6MjEwNTcxMzcxNX0.KMIGynxekjhtD-NXxxQPdQ6TnoOSnU9G3Lc2TuLWBJg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function requireLogin() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

async function login(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// ============================================================
// GLOBAL SEARCH — cari guru, navigasi ke riwayat dengan filter
// ============================================================
async function initGlobalSearch() {
  const wrap = document.querySelector('.searchbar');
  if (!wrap) return;
  const input = wrap.querySelector('input');
  if (!input) return;

  // Container dropdown hasil
  let dd = wrap.querySelector('.searchbar-results');
  if (!dd) {
    dd = document.createElement('div');
    dd.className = 'searchbar-results';
    dd.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg);margin-top:6px;max-height:340px;overflow-y:auto;display:none;z-index:200;';
    wrap.style.position = 'relative';
    wrap.appendChild(dd);
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { dd.style.display = 'none'; return; }

      const { data } = await supabaseClient
        .from('profiles')
        .select('id, nama_lengkap, nip, role')
        .or(`nama_lengkap.ilike.%${q}%,nip.ilike.%${q}%`)
        .eq('aktif', true)
        .limit(6);

      if (!data || data.length === 0) {
        dd.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:0.85rem;text-align:center;">Tidak ada hasil.</div>';
      } else {
        const roleLabel = (r) => r === 'super_admin' ? 'Super Admin' : r === 'admin_sekolah' ? 'Admin Sekolah' : 'Guru';
        dd.innerHTML = data.map(p => `
          <a href="riwayat-absen.html?guru=${p.id}" style="display:block;padding:10px 14px;border-bottom:1px solid var(--border);text-decoration:none;color:var(--ink);transition:background .15s;">
            <b style="font-size:0.9rem;">${p.nama_lengkap}</b>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">${p.nip || '-'} · ${roleLabel(p.role)}</div>
          </a>
        `).join('');
      }
      dd.style.display = 'block';
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) dd.style.display = 'none';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { dd.style.display = 'none'; input.blur(); }
  });
}

// ============================================================
// NOTIF — 5 aktivitas admin terbaru dari admin_logs
// ============================================================
async function initNotifDropdown() {
  const menu = document.getElementById('notifMenu');
  if (!menu) return;
  const body = menu.querySelector('.dropdown__body');
  const head = menu.querySelector('.dropdown__head h4');
  const foot = menu.querySelector('.dropdown__foot a');
  const btn = document.getElementById('notifBtn');
  const dot = btn ? btn.querySelector('.icon-btn__dot') : null;

  if (head) head.textContent = 'Aktivitas Admin';
  if (foot) { foot.textContent = 'Lihat semua riwayat'; foot.href = 'admin-log.html'; }

  const { data } = await supabaseClient
    .from('admin_logs')
    .select('action, reason, created_at, admin_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    if (body) body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:0.85rem;">Belum ada aktivitas.</div>';
    if (dot) dot.style.display = 'none';
    return;
  }

  const adminIds = [...new Set(data.map(d => d.admin_id))];
  const { data: admins } = await supabaseClient
    .from('profiles').select('id, nama_lengkap').in('id', adminIds);
  const pmap = Object.fromEntries((admins || []).map(p => [p.id, p]));

  const label = (a) => a === 'attendance_update' ? 'ubah absen'
    : a === 'izin_add_range' ? 'tambah izin'
    : a === 'izin_delete_bulk' ? 'hapus izin'
    : a;

  const timeAgo = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return `${d} dtk lalu`;
    if (d < 3600) return `${Math.floor(d / 60)} mnt lalu`;
    if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
    return `${Math.floor(d / 86400)} hari lalu`;
  };

  const iconFor = (a) => a === 'attendance_update' ? 'is-warning'
    : a === 'izin_add_range' ? 'is-success'
    : a === 'izin_delete_bulk' ? 'is-info'
    : 'is-info';

  body.innerHTML = data.map(l => {
    const admin = pmap[l.admin_id] || { nama_lengkap: '(?)' };
    return `
      <div class="notif" role="menuitem">
        <span class="notif__ic ${iconFor(l.action)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </span>
        <div>
          <p><b>${admin.nama_lengkap}</b> — ${label(l.action)}</p>
          <p style="font-size:0.75rem;color:var(--muted);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${l.reason || '-'}</p>
          <time>${timeAgo(l.created_at)}</time>
        </div>
      </div>
    `;
  }).join('');

  if (dot) dot.style.display = 'block';
}

// ============================================================
// ROLE GUARD — sembunyikan seksi Super Admin dari admin_sekolah
// ============================================================
async function applyRoleBasedSidebar() {
  try {
    const { data: sess } = await supabaseClient.auth.getSession();
    if (!sess || !sess.session) return;
    const { data: prof } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', sess.session.user.id)
      .single();
    const role = prof?.role || 'guru';

    // Cache untuk page load berikutnya (biar nggak flicker)
    try { localStorage.setItem('console-user-role', role); } catch (e) {}

    // Set attribute — CSS yang ngatur tampil/sembunyi
    document.documentElement.setAttribute('data-user-role', role);
  } catch (e) {
    console.warn('applyRoleBasedSidebar error:', e);
  }
}