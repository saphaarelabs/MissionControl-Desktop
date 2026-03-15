const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const PROTOCOL = 'missioncontrol';
const isDev = !app.isPackaged;
const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';
const backendBase = process.env.MISSION_CONTROL_BACKEND_URL || 'https://mission-control-backend-topaz.vercel.app';
const controlPlaneUrl = process.env.MISSION_CONTROL_CONTROL_PLANE_URL || 'https://mission-control-control-plane.vercel.app';
const appIconPath = path.join(__dirname, '..', 'build', 'icon.png');

let mainWindow = null;
let pendingDeepLink = null;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.setName('Magic Teams');
if (process.platform === 'win32') {
  app.setAppUserModelId('ai.openclaw.magicteams.desktop');
}

function stateFilePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      width: parsed.width || 1440,
      height: parsed.height || 940,
      x: parsed.x,
      y: parsed.y,
      isMaximized: Boolean(parsed.isMaximized),
    };
  } catch {
    return { width: 1440, height: 940, isMaximized: false };
  }
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const payload = {
    ...bounds,
    isMaximized: mainWindow.isMaximized(),
  };
  fs.writeFileSync(stateFilePath(), JSON.stringify(payload, null, 2));
}

function normalizeDeepLink(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== `${PROTOCOL}:`) return null;

    const routeParts = [parsed.hostname, parsed.pathname].filter(Boolean).join('');
    const route = routeParts.startsWith('/') ? routeParts : `/${routeParts || ''}`;

    return {
      rawUrl,
      route: route === '/' ? '/' : route.replace(/\/+$/, '') || '/',
      search: parsed.search || '',
    };
  } catch {
    return null;
  }
}

function openUrlExternally(url) {
  if (!url || typeof url !== 'string') return;
  shell.openExternal(url).catch(() => {});
}

function consumePendingDeepLink() {
  const payload = pendingDeepLink;
  pendingDeepLink = null;
  return payload;
}

function isAppNavigation(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('file://')) return true;
  if (url.startsWith(`${PROTOCOL}://`)) return true;
  if (isDev && url.startsWith(devServerUrl)) return true;
  if (url === 'about:blank') return true;
  return false;
}

function dispatchDeepLink(payload) {
  pendingDeepLink = payload;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('desktop:deep-link', payload);
}

function createMenu() {
  const template = [
    {
      label: 'Magic Teams',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerProtocol() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    minWidth: 1200,
    minHeight: 780,
    x: state.x,
    y: state.y,
    show: false,
    backgroundColor: '#f4f7fb',
    title: 'Magic Teams',
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    titleBarOverlay: process.platform === 'darwin'
      ? false
      : {
          color: '#ffffff',
          symbolColor: '#0f172a',
          height: 40,
        },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  const contents = mainWindow.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    if (isAppNavigation(url)) return { action: 'allow' };
    openUrlExternally(url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (isAppNavigation(url)) return;
    event.preventDefault();
    openUrlExternally(url);
  });

  contents.on('did-finish-load', () => {
    if (pendingDeepLink) {
      contents.send('desktop:deep-link', pendingDeepLink);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('desktop:get-launch-context', () => ({
  pendingDeepLink: consumePendingDeepLink(),
}));

ipcMain.handle('desktop:clear-pending-deep-link', () => {
  pendingDeepLink = null;
  return true;
});

ipcMain.handle('desktop:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !url.trim()) return false;
  await shell.openExternal(url);
  return true;
});

app.on('second-instance', (_event, argv) => {
  const protocolArg = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (protocolArg) {
    const normalized = normalizeDeepLink(protocolArg);
    if (normalized) dispatchDeepLink(normalized);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const normalized = normalizeDeepLink(url);
  if (normalized) dispatchDeepLink(normalized);
});

app.whenReady().then(() => {
  createMenu();
  registerProtocol();
  createWindow();

  const protocolArg = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (protocolArg) {
    const normalized = normalizeDeepLink(protocolArg);
    if (normalized) pendingDeepLink = normalized;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
