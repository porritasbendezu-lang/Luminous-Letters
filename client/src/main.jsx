import React from 'react';
import ReactDOM from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Crown,
  Edit3,
  Eye,
  FileImage,
  FolderClosed,
  Image as ImageIcon,
  Layers3,
  LogIn,
  LogOut,
  Mail,
  Palette,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Stamp,
  Trash2,
  Upload,
  Users,
  X,
  Bold,
  Italic,
  Underline,
  Type,
  AlignLeft,
  ChevronDown,
  PanelTop,
  CircleDot,
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL?.trim() || '';

const THEMES = {
  midnight: { label: 'Midnight', className: 'theme-midnight', accent: '#8b5cf6' },
  pearl: { label: 'Pearl', className: 'theme-pearl', accent: '#6366f1' },
  rose: { label: 'Rose', className: 'theme-rose', accent: '#fb7185' },
  forest: { label: 'Forest', className: 'theme-forest', accent: '#34d399' },
  amber: { label: 'Amber', className: 'theme-amber', accent: '#f59e0b' },
  ocean: { label: 'Ocean', className: 'theme-ocean', accent: '#38bdf8' },
  violet: { label: 'Violet', className: 'theme-violet', accent: '#a855f7' },
  paper: { label: 'Paper', className: 'theme-paper', accent: '#64748b' },
};

function safeParseJSON(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function useLocalSettings() {
  const [settings, setSettings] = React.useState(() => safeParseJSON(localStorage.getItem('lv_settings'), null));
  React.useEffect(() => {
    if (settings) localStorage.setItem('lv_settings', JSON.stringify(settings));
  }, [settings]);
  return [settings, setSettings];
}

async function api(path, options = {}) {
  const init = {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  };
  const res = await fetch(API + path, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data?.message || 'Error');
  return data;
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(API + '/api/uploads/image', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'No se pudo subir la imagen');
  return data.url;
}

function AppLogo({ src, size = 44, className = '' }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <div className={`app-logo-image ${className}`} style={style}>
        <img src={src} alt="Logo" />
      </div>
    );
  }

  return (
    <div className={`app-logo-fallback ${className}`} style={style}>
      <Mail size={Math.max(16, Math.round(size * 0.48))} />
    </div>
  );
}

function App() {
  const [user, setUser] = React.useState(null);
  const [booting, setBooting] = React.useState(true);
  const [serverSettings, setServerSettings] = React.useState(null);
  const [localSettings, setLocalSettings] = useLocalSettings();
  const [tab, setTab] = React.useState('cards');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const me = await api('/api/me');
      setUser(me.user);
      const settings = await api('/api/settings');
      setServerSettings(settings);
      if (!localSettings) setLocalSettings(settings);
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, [localSettings, setLocalSettings]);

  React.useEffect(() => {
    load();
  }, [load]);

  const activeSettings = localSettings || serverSettings || { theme: 'midnight', accent: '#8b5cf6', radius: 18, compact: false, pageBg: '', logoUrl: '' };

  React.useEffect(() => {
    const root = document.documentElement;
    const themeKey = activeSettings.theme || 'midnight';
    const theme = THEMES[themeKey] || THEMES.midnight;
    root.dataset.theme = themeKey;
    root.style.setProperty('--accent', activeSettings.accent || theme.accent);
    root.style.setProperty('--radius', `${activeSettings.radius ?? 18}px`);
    root.style.setProperty('--page-bg', activeSettings.pageBg ? `url("${activeSettings.pageBg}")` : 'none');
  }, [activeSettings]);

  React.useEffect(() => {
    if (user?.role !== 'admin' && tab === 'resources') setTab('cards');
  }, [user?.role, tab]);

  const flash = React.useCallback((msg) => {
    setNotice(msg);
    window.clearTimeout(window.__lvToastTimer);
    window.__lvToastTimer = window.setTimeout(() => setNotice(''), 2400);
  }, []);

  if (booting) return <BootScreen />;
  if (!user) {
    return (
      <LoginScreen
        settings={activeSettings}
        onLogin={async (credentials) => {
          await api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
          await load();
          flash('Bienvenido');
        }}
      />
    );
  }

  return (
    <div className="shell">
      {notice && <div className="toast">{notice}</div>}
      <Sidebar
        tab={tab}
        setTab={setTab}
        user={user}
        settings={activeSettings}
        onLogout={async () => {
          await api('/api/auth/logout', { method: 'POST' });
          setUser(null);
          setTab('cards');
        }}
      />
      <main className="content">
        <Topbar settings={activeSettings} user={user} />
        <AnimatePresence mode="wait">
          {tab === 'cards' && <CardsSection key="cards" user={user} flash={flash} />}
          {tab === 'resources' && user.role === 'admin' && <ResourcesSection key="resources" flash={flash} />}
          {tab === 'settings' && <SettingsSection key="settings" user={user} settings={activeSettings} setSettings={setLocalSettings} flash={flash} refreshServer={async () => { const settings = await api('/api/settings'); setServerSettings(settings); setLocalSettings(settings); }} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BootScreen() {
  return (
    <div className="boot">
      <motion.div
        animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="boot-mark"
      >
        <div className="boot-envelope">
          <div className="boot-envelope-glow" />
          <Mail size={34} strokeWidth={1.85} />
        </div>
        <div className="boot-text">
          <span>Luminous Letters</span>
          <div className="boot-dots">
            <i />
            <i />
            <i />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function LoginScreen({ settings, onLogin }) {
  const [form, setForm] = React.useState({ username: 'admin', password: 'admin123!' });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  return (
    <div className="login-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="login-card">
        <div className="brand">
          <AppLogo src={settings?.logoUrl} size={62} className="brand-badge" />
          <div>
            <h1>Luminous Letters</h1>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              await onLogin(form);
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <label>
            Usuario
            <input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label>
            Contraseña
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Ingresando...' : (<><LogIn size={16} /> Entrar</>)}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function Sidebar({ tab, setTab, user, settings, onLogout }) {
  const items = [
    { id: 'cards', label: 'Cartas', icon: Mail },
    ...(user.role === 'admin' ? [{ id: 'resources', label: 'Recursos', icon: FolderClosed }] : []),
    { id: 'settings', label: 'Configuración', icon: Settings2 },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <AppLogo src={settings.logoUrl} size={28} className="header-logo" />
          <span>Luminous Letters</span>
        </div>
        <p className="sidebar-copy">Diseña cartas, sobres y recursos visuales desde un solo lugar.</p>
      </div>

      <nav className="nav-list">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button type="button" key={it.id} className={tab === it.id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(it.id)}>
              <Icon size={18} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="user-chip">
          <Crown size={16} />
          <div>
            <strong>{user.displayName || user.username}</strong>
            <small>{user.role === 'admin' ? 'Administrador' : 'Luana'}</small>
          </div>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}><LogOut size={16} /> Salir</button>
      </div>
    </aside>
  );
}

function Topbar({ settings, user }) {
  const theme = THEMES[settings.theme || 'midnight'] || THEMES.midnight;
  return (
    <header className="topbar">
      <div>
        <h2>Cartas con estilo para momentos especiales</h2>
      </div>
      <div className="topbar-card">
        <Palette size={16} />
        <span>{theme.label}</span>
      </div>
    </header>
  );
}

function CardsSection({ user, flash }) {
  const canManage = user.role === 'admin';
  const [cards, setCards] = React.useState([]);
  const [papers, setPapers] = React.useState([]);
  const [envelopes, setEnvelopes] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [viewing, setViewing] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);

  const load = React.useCallback(async () => {
    const [cardList, paperList, envelopeList] = await Promise.all([
      api('/api/cards'),
      canManage ? api('/api/papers') : Promise.resolve([]),
      canManage ? api('/api/envelopes') : Promise.resolve([]),
    ]);

    const paperMap = new Map(paperList.map((item) => [item.id, item]));
    const envelopeMap = new Map(envelopeList.map((item) => [item.id, item]));

    const enriched = cardList.map((card) => ({
      ...card,
      paperName: paperMap.get(card.paperId)?.name || card.paperName || '',
      paperColor: paperMap.get(card.paperId)?.color || card.paperColor || '',
      paperDesignImageUrl: paperMap.get(card.paperId)?.designImageUrl || card.paperDesignImageUrl || '',
      envelopeName: envelopeMap.get(card.envelopeId)?.name || card.envelopeName || '',
      envelopeColor: envelopeMap.get(card.envelopeId)?.color || card.envelopeColor || '',
      envelopeDesignImageUrl: envelopeMap.get(card.envelopeId)?.designImageUrl || card.envelopeDesignImageUrl || '',
    }));

    setCards(enriched);
    setPapers(paperList);
    setEnvelopes(envelopeList);
  }, [canManage]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = cards.filter((c) => `${c.title} ${c.content}`.toLowerCase().includes(query.toLowerCase()));

  const submit = async (payload) => {
    if (!canManage) return;
    if (editing) await api(`/api/cards/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/api/cards', { method: 'POST', body: JSON.stringify(payload) });
    await load();
    setEditing(null);
    setShowForm(false);
    flash(editing ? 'Carta actualizada' : 'Carta creada');
  };

  const remove = async (id) => {
    if (!canManage) return;
    if (!window.confirm('¿Eliminar esta carta?')) return;
    await api(`/api/cards/${id}`, { method: 'DELETE' });
    await load();
    flash('Carta eliminada');
  };

  return (
    <motion.section className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="section-head">
        <div>
          <h3>Lista de Cartas</h3>
        </div>
        <div className="actions-row">
          <input className="search" placeholder="Buscar carta..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {canManage && (
            <button type="button" className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={16} /> Nueva carta
            </button>
          )}
        </div>
      </div>

      <div className="card-grid">
        {filtered.map((card) => (
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            key={card.id}
            className="card-tile"
            style={tileStyle(card)}
            onClick={() => setViewing(card)}
          >
            <div className="card-tile-glass" />
            <div className="card-tile-visual">
              <div
                className="card-tile-envelope-preview"
                style={miniEnvelopeStyle(card)}
                aria-hidden="true"
              >
                <div className="card-tile-envelope-flap" />
                <div className="card-tile-envelope-seal" />
              </div>
            </div>
            <div className="card-tile-body">
              <h4>{card.title}</h4>
              <p>Contenido privado · Ábrela para leerla</p>
            </div>
            <div className="card-tile-foot">
              <span><Eye size={14} /> Abrir</span>
              {canManage && <span><Edit3 size={14} /> Editar</span>}
            </div>
          </motion.button>
        ))}
      </div>

      {!filtered.length && <div className="empty-state">No hay cartas que coincidan con la búsqueda.</div>}

      <AnimatePresence>
        {showForm && canManage && (
          <CardFormModal
            key="form"
            card={editing}
            papers={papers}
            envelopes={envelopes}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={submit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && (
          <CardPreviewModal
            key="preview"
            card={viewing}
            canManage={canManage}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setShowForm(true); setViewing(null); }}
            onDelete={() => { remove(viewing.id); setViewing(null); }}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function tileStyle(card) {
  return {
    backgroundColor: card.envelopeColor || card.cardColor || card.paperColor || 'var(--panel)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.16))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}

function miniEnvelopeStyle(card) {
  return {
    backgroundColor: card.envelopeColor || '#1e293b',
    backgroundImage: card.envelopeDesignImageUrl
      ? `linear-gradient(135deg, rgba(255,255,255,.18), rgba(0,0,0,.08)), url("${card.envelopeDesignImageUrl}")`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}

function getPaperResource(papers, id) {
  return papers.find((p) => p.id === id) || null;
}

function getEnvelopeResource(envelopes, id) {
  return envelopes.find((e) => e.id === id) || null;
}

function CardFormModal({ card, papers, envelopes, onClose, onSave }) {
  const [form, setForm] = React.useState(card || defaultCard());
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState('');

  React.useEffect(() => {
    setForm(card || defaultCard());
  }, [card]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const doUpload = async (field, file) => {
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadImage(file);
      set({ [field]: url });
    } finally {
      setUploading('');
    }
  };

  const selectedPaper = getPaperResource(papers, form.paperId);
  const selectedEnvelope = getEnvelopeResource(envelopes, form.envelopeId);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="modal editor-modal"
      >
        <div className="modal-head">
          <div>
            <h3>{card ? 'Editar carta' : 'Nueva carta'}</h3>
            <p>Controla la tipografía, la hoja, el sobre y las imágenes PNG para un resultado más elegante.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="editor-grid">
          <div className="form-panel">
            <div className="form-grid two">
              <label>
                Título
                <input value={form.title} onChange={(e) => set({ title: e.target.value })} />
              </label>

              <label>
                Fuente
                <select value={form.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
                  <option value="Inter">Inter</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </label>

              <label>
                Tamaño
                <input type="number" min="12" max="44" value={form.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
              </label>

              <label>
                Interlineado
                <input type="number" step="0.1" min="0.9" max="3" value={form.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) })} />
              </label>

              <label>
                Color del texto
                <input type="color" value={form.textColor} onChange={(e) => set({ textColor: e.target.value })} />
              </label>

              <label>
                Color general
                <input type="color" value={form.cardColor} onChange={(e) => set({ cardColor: e.target.value })} />
              </label>

              <label>
                Hoja
                <select value={form.paperId} onChange={(e) => set({ paperId: e.target.value })}>
                  <option value="">Sin hoja guardada</option>
                  {papers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>

              <label>
                Sobre
                <select value={form.envelopeId} onChange={(e) => set({ envelopeId: e.target.value })}>
                  <option value="">Sin sobre guardado</option>
                  {envelopes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </label>
            </div>

            <label>
              Contenido
              <textarea rows="8" value={form.content} onChange={(e) => set({ content: e.target.value })} />
            </label>

            <div className="toggle-row">
              <Toggle label="Negrita" icon={Bold} value={form.bold} onChange={(v) => set({ bold: v })} />
              <Toggle label="Itálica" icon={Italic} value={form.italic} onChange={(v) => set({ italic: v })} />
              <Toggle label="Subrayado" icon={Underline} value={form.underline} onChange={(v) => set({ underline: v })} />
            </div>

            <div className="upload-grid">
              <UploadCard
                label={uploading === 'logoImageUrl' ? 'Subiendo...' : 'Logo'}
                value={form.logoImageUrl}
                onPick={(file) => doUpload('logoImageUrl', file)}
                onRemove={() => set({ logoImageUrl: '' })}
              />
              <UploadCard
                label={uploading === 'sealImageUrl' ? 'Subiendo...' : 'Sello'}
                value={form.sealImageUrl}
                onPick={(file) => doUpload('sealImageUrl', file)}
                onRemove={() => set({ sealImageUrl: '' })}
              />
              <UploadCard
                label={uploading === 'backgroundImageUrl' ? 'Subiendo...' : 'Fondo de carta'}
                value={form.backgroundImageUrl}
                onPick={(file) => doUpload('backgroundImageUrl', file)}
                onRemove={() => set({ backgroundImageUrl: '' })}
              />
            </div>
          </div>

          <div className="preview-panel">
            <div className="preview-panel-head">
              <div>
                <p className="preview-label">Vista previa</p>
                <h4>{form.title || 'Nueva carta'}</h4>
              </div>
              <div className="preview-chip">{selectedPaper?.name || 'Hoja'}</div>
            </div>
            <PreviewScene
              card={form}
              paper={selectedPaper}
              envelope={selectedEnvelope}
              compact
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button type="button"
            className="primary-btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  ...form,
                  fontSize: Number(form.fontSize),
                  lineHeight: Number(form.lineHeight),
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Guardando...' : (<><Save size={16} /> Guardar</>)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UploadCard({ label, value, onPick, onRemove }) {
  return (
    <div className="upload-card">
      <div className="upload-head">
        <span>{label}</span>
        {value ? <button type="button" className="mini-btn" onClick={onRemove}><Trash2 size={14} /></button> : null}
      </div>
      <label className="upload-box">
        {value ? <img src={value} alt="preview" /> : <div><Upload size={18} /><span>Subir imagen</span></div>}
        <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
    </div>
  );
}

function Toggle({ label, icon: Icon, value, onChange }) {
  return (
    <button type="button" className={value ? 'toggle active' : 'toggle'} onClick={() => onChange(!value)}>
      {Icon ? <Icon size={15} /> : null}
      {label}
    </button>
  );
}


function CardPreviewModal({ card, canManage, onClose, onEdit, onDelete }) {
  return (
    <div className="modal-backdrop preview-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.96, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 14, opacity: 0 }}
        className="preview-frame"
      >
        <div className="preview-card-actions">
          {canManage ? (
            <>
              <button type="button" className="preview-action" onClick={onEdit} aria-label="Editar carta" title="Editar">
                <Edit3 size={16} />
              </button>
              <button type="button" className="preview-action danger" onClick={onDelete} aria-label="Eliminar carta" title="Eliminar">
                <Trash2 size={16} />
              </button>
            </>
          ) : null}
          <button type="button" className="preview-action" onClick={onClose} aria-label="Cerrar carta" title="Cerrar">
            <X size={16} />
          </button>
        </div>

        <PreviewScene card={card} mode="user" />
      </motion.div>
    </div>
  );
}

function PreviewScene({ card, paper, envelope, compact = false, mode = 'editor' }) {
  const paperResource = paper || (card?.paperDesignImageUrl ? {
    name: card.paperName || '',
    color: card.paperColor || card.cardColor || '',
    designImageUrl: card.paperDesignImageUrl,
  } : null);
  const envelopeResource = envelope || (card?.envelopeDesignImageUrl ? {
    name: card.envelopeName || '',
    color: card.envelopeColor || '',
    designImageUrl: card.envelopeDesignImageUrl,
  } : null);
  const paperBg = paperResource?.designImageUrl
    ? `linear-gradient(rgba(255,255,255,.08), rgba(0,0,0,.02)), url("${paperResource.designImageUrl}")`
    : undefined;
  const envelopeBg = envelopeResource?.designImageUrl
    ? `linear-gradient(rgba(255,255,255,.06), rgba(0,0,0,.08)), url("${envelopeResource.designImageUrl}")`
    : undefined;

  const userBackground = paperResource?.designImageUrl || card.paperDesignImageUrl
    ? `linear-gradient(rgba(255,255,255,.08), rgba(0,0,0,.02)), url("${paperResource?.designImageUrl || card.paperDesignImageUrl}")`
    : undefined;

  const style = {
    fontFamily: card.fontFamily,
    fontSize: `${card.fontSize}px`,
    lineHeight: card.lineHeight,
    color: card.textColor,
    fontWeight: card.bold ? 700 : 400,
    fontStyle: card.italic ? 'italic' : 'normal',
    textDecoration: card.underline ? 'underline' : 'none',
    backgroundColor: paperResource?.color || card.paperColor || card.cardColor,
    backgroundImage: mode === 'user'
      ? userBackground
      : (card.backgroundImageUrl
        ? `linear-gradient(rgba(255,255,255,.06), rgba(0,0,0,.08)), url("${card.backgroundImageUrl}")`
        : paperBg),
  };

  if (mode === 'user') {
    return (
      <div className={compact ? 'scene compact' : 'scene'}>
        <div className="paper-stage user-stage">
          <motion.div
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="letter paper-only user-letter"
            style={style}
          >
            <div className="letter-top user-letter-top">
              <div className="letter-brand user-letter-brand">
                {card.logoImageUrl ? (
                  <img src={card.logoImageUrl} alt="Logo de la carta" />
                ) : (
                  <div className="letter-brand-fallback">✦</div>
                )}
                <div>
                  <strong>{card.title || 'Nueva carta'}</strong>
                </div>
              </div>
            </div>

            <p>{card.content || 'Escribe el contenido de la carta para ver la vista previa aquí.'}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'scene compact' : 'scene'}>
      <div className="envelope-stage">
        <motion.div
          className="envelope-shell"
          initial={{ x: -24, rotate: -3, opacity: 0 }}
          animate={{ x: 0, rotate: -1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundColor: envelopeResource?.color || card.envelopeColor || 'rgba(255,255,255,.08)',
            backgroundImage: envelopeBg,
          }}
        >
          {envelopeResource?.designImageUrl || card.envelopeDesignImageUrl ? (
            <div
              className="envelope-art"
              style={{
                backgroundImage: `url("${envelopeResource?.designImageUrl || card.envelopeDesignImageUrl}")`,
              }}
              aria-hidden="true"
            />
          ) : null}
          <div className="envelope-glow" />
          <div className="envelope-flap" />
          <div className="seal" style={{ backgroundImage: card.sealImageUrl ? `url("${card.sealImageUrl}")` : undefined }} />
          <div className="envelope-label">
            <PanelTop size={14} />
            <span>{envelopeResource?.name || card.envelopeName || 'Sobre elegante'}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="letter"
          style={style}
        >
          <p>{card.content || 'Escribe el contenido de la carta para ver la vista previa aquí.'}</p>
        </motion.div>
      </div>
    </div>
  );
}

function ResourcesSection({ flash }) {
  const [active, setActive] = React.useState('papers');
  const [papers, setPapers] = React.useState([]);
  const [envelopes, setEnvelopes] = React.useState([]);
  const [paper, setPaper] = React.useState(defaultResource('paper'));
  const [envelope, setEnvelope] = React.useState(defaultResource('envelope'));

  const load = React.useCallback(async () => {
    const [p, e] = await Promise.all([api('/api/papers'), api('/api/envelopes')]);
    setPapers(p);
    setEnvelopes(e);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async (kind, data) => {
    await api(`/api/${kind}${data.id ? `/${data.id}` : ''}`, {
      method: data.id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
    await load();
    flash('Recurso guardado');
  };

  const remove = async (kind, id) => {
    if (!window.confirm('¿Eliminar recurso?')) return;
    await api(`/api/${kind}/${id}`, { method: 'DELETE' });
    await load();
    flash('Recurso eliminado');
  };

  return (
    <motion.section className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="section-head">
        <div>
          <h3>Recursos</h3>
        </div>
        <div className="tabs">
          <button type="button" className={active === 'papers' ? 'tab active' : 'tab'} onClick={() => setActive('papers')}>Hojas</button>
          <button type="button" className={active === 'envelopes' ? 'tab active' : 'tab'} onClick={() => setActive('envelopes')}>Sobres</button>
        </div>
      </div>

      {active === 'papers' ? (
        <ResourceEditor
          title="Hojas"
          data={paper}
          setData={setPaper}
          items={papers}
          onSave={(d) => save('papers', d)}
          onEdit={setPaper}
          onDelete={(id) => remove('papers', id)}
          kind="paper"
        />
      ) : (
        <ResourceEditor
          title="Sobres"
          data={envelope}
          setData={setEnvelope}
          items={envelopes}
          onSave={(d) => save('envelopes', d)}
          onEdit={setEnvelope}
          onDelete={(id) => remove('envelopes', id)}
          kind="envelope"
        />
      )}
    </motion.section>
  );
}

function ResourceEditor({ title, data, setData, items, onSave, onEdit, onDelete, kind }) {
  const reset = () => setData(defaultResource(kind));
  return (
    <div className="resource-layout">
      <div className="resource-form">
        <h4>Crear {kind === 'paper' ? 'hoja' : 'sobre'}</h4>
        <label>
          Nombre
          <input value={data.name} onChange={(e) => setData((s) => ({ ...s, name: e.target.value }))} />
        </label>
        <label>
          Color
          <input type="color" value={data.color} onChange={(e) => setData((s) => ({ ...s, color: e.target.value }))} />
        </label>
        <label>
          Descripción
          <textarea rows="4" value={data.description} onChange={(e) => setData((s) => ({ ...s, description: e.target.value }))} />
        </label>
        <UploadField
          label="Imagen de diseño PNG"
          value={data.designImageUrl}
          onPick={async (file) => {
            const url = await uploadImage(file);
            setData((s) => ({ ...s, designImageUrl: url }));
          }}
          onRemove={() => setData((s) => ({ ...s, designImageUrl: '' }))}
        />
        <button type="button" className="primary-btn" onClick={async () => { await onSave(data); reset(); }}>
          <Save size={16} /> Guardar
        </button>
      </div>

      <div className="resource-list">
        {items.map((item) => (
          <div key={item.id} className="resource-item">
            <div className="resource-preview">
              <div className="resource-swatch" style={{ backgroundColor: item.color, backgroundImage: item.designImageUrl ? `url("${item.designImageUrl}")` : undefined }} />
              <div>
                <strong>{item.name}</strong>
                <p>{item.description || 'Sin descripción'}</p>
              </div>
            </div>
            <div className="actions-row">
              <button type="button" className="ghost-btn" onClick={() => onEdit(item)}><Edit3 size={14} /> Editar</button>
              <button type="button" className="danger-btn" onClick={() => onDelete(item.id)}><Trash2 size={14} /> Eliminar</button>
            </div>
          </div>
        ))}
        {!items.length && <div className="empty-state">Todavía no hay recursos guardados.</div>}
      </div>
    </div>
  );
}

function UploadField({ label, value, onPick, onRemove }) {
  return (
    <div className="upload-card single">
      <div className="upload-head">
        <span>{label}</span>
        {value ? <button type="button" className="mini-btn" onClick={onRemove}><Trash2 size={14} /></button> : null}
      </div>
      <label className="upload-box">
        {value ? <img src={value} alt="preview" /> : <div><ImageIcon size={18} /><span>Subir imagen</span></div>}
        <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
    </div>
  );
}

function SettingsSection({ user, settings, setSettings, flash, refreshServer }) {
  const [local, setLocal] = React.useState(settings);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const set = (patch) => setLocal((s) => ({ ...s, ...patch }));

  const save = async () => {
    setBusy(true);
    try {
      const saved = await api('/api/settings', { method: 'PUT', body: JSON.stringify(local) });
      setSettings(saved);
      localStorage.setItem('lv_settings', JSON.stringify(saved));
      await refreshServer();
      flash('Configuración guardada');
    } finally {
      setBusy(false);
    }
  };

  const uploadBg = async (file) => {
    if (!file) return;
    const url = await uploadImage(file);
    set({ pageBg: url });
  };

  return (
    <motion.section className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="section-head">
        <div>
          <h3>Configuración</h3>
        </div>
        <div className="user-card">
          <Users size={16} />
          {user.displayName || user.username}
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-panel">
          <h4>Theme</h4>
          <div className="theme-grid">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button type="button" key={key} className={local.theme === key ? 'theme-card active' : 'theme-card'} onClick={() => set({ theme: key })}>
                <span className={`theme-sample ${key}`} />
                <strong>{theme.label}</strong>
              </button>
            ))}
          </div>

          <UploadField
            label="Logo principal"
            value={local.logoUrl || ''}
            onPick={async (file) => {
              if (!file) return;
              const url = await uploadImage(file);
              set({ logoUrl: url });
            }}
            onRemove={() => set({ logoUrl: '' })}
          />

          <UploadField
            label="Fondo global"
            value={local.pageBg}
            onPick={uploadBg}
            onRemove={() => set({ pageBg: '' })}
          />
        </div>

        <div className="settings-panel">
          <h4>Preferencias rápidas</h4>
          <label>
            Color de acento
            <input type="color" value={local.accent || '#8b5cf6'} onChange={(e) => set({ accent: e.target.value })} />
          </label>
          <label>
            Radio visual
            <input type="range" min="12" max="28" value={local.radius || 18} onChange={(e) => set({ radius: Number(e.target.value) })} />
          </label>
          <label className="checkline">
            <input type="checkbox" checked={!!local.compact} onChange={(e) => set({ compact: e.target.checked })} />
            Modo compacto
          </label>
          <button type="button" className="primary-btn" onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : (<><Save size={16} /> Guardar cambios</>)}
          </button>
          <div className="settings-note">
            Los cambios visuales se aplican al instante en la sesión actual.
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function defaultCard() {
  return {
    title: 'Nueva carta',
    content: '',
    fontFamily: 'Inter',
    fontSize: 18,
    lineHeight: 1.7,
    bold: false,
    italic: false,
    underline: false,
    textColor: '#f8fafc',
    cardColor: '#161b2e',
    backgroundImageUrl: '',
    logoImageUrl: '',
    sealImageUrl: '',
    paperId: '',
    envelopeId: '',
  };
}

function defaultResource(kind) {
  return {
    id: '',
    name: kind === 'paper' ? 'Hoja elegante' : 'Sobre elegante',
    description: '',
    color: kind === 'paper' ? '#f8f1e4' : '#c7b299',
    designImageUrl: '',
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
