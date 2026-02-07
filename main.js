const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let appDir;
let configPath;

let config = {
  default_open_dir: '',
  default_save_dir: '',
  theme: 'dark',
  recent_files: [],
  date_format: 'YY-MM-DD',
  include_date: true,
  date_text: ''
};

async function loadConfig() {
  if (app.isPackaged) {
    appDir = path.dirname(process.execPath);
  } else {
    appDir = __dirname;
  }
  
  configPath = path.join(appDir, 'not_pad_config.txt');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('default_open_dir=')) {
        config.default_open_dir = line.split('=')[1].trim();
      } else if (line.startsWith('default_save_dir=')) {
        config.default_save_dir = line.split('=')[1].trim();
      } else if (line.startsWith('theme=')) {
        config.theme = line.split('=')[1].trim();
      } else if (line.startsWith('recent_files=')) {
        const filesStr = line.split('=')[1].trim();
        config.recent_files = filesStr ? filesStr.split('|').filter(f => f) : [];
      } else if (line.startsWith('date_format=')) {
        config.date_format = line.split('=')[1].trim();
      } else if (line.startsWith('include_date=')) {
        config.include_date = line.split('=')[1].trim() === 'true';
      } else if (line.startsWith('date_text=')) {
        config.date_text = line.split('=')[1].trim();
      }
    }
  } catch (err) {
    await saveConfig();
  }
}

async function saveConfig() {
  const recentFilesStr = config.recent_files.join('|');
  const content = `default_open_dir=${config.default_open_dir}
default_save_dir=${config.default_save_dir}
theme=${config.theme}
recent_files=${recentFilesStr}
date_format=${config.date_format}
include_date=${config.include_date}
date_text=${config.date_text}`;
  await fs.writeFile(configPath, content, 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: config.theme === 'dark' ? '#1e1e1e' : '#ffffff',
    show: false,
    title: 'not_pad'
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-quick-save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        {
          label: 'Close File',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow.webContents.send('menu-close')
        },
        { type: 'separator' },
        {
          label: 'Preview',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow.webContents.send('menu-preview')
        },
        {
          label: 'Print',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-print')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
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
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu-find')
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow.webContents.send('menu-replace')
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-preferences')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  await loadConfig();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-config', () => config);

ipcMain.handle('save-config', async (event, newConfig) => {
  config = { ...config, ...newConfig };
  await saveConfig();
  return config;
});

ipcMain.handle('open-file', async () => {
  const initialPath = config.default_open_dir || app.getPath('documents');
  
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: initialPath,
    filters: [
      { name: 'Markdown files', extensions: ['md'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) return null;

  const filepath = result.filePaths[0];
  const content = await fs.readFile(filepath, 'utf-8');
  
  return { filepath, content };
});

ipcMain.handle('save-file-dialog', async () => {
  const today = new Date();
  const year = String(today.getFullYear()).slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const defaultName = `${year}-${month}-${day}_`;
  
  const initialPath = config.default_save_dir || app.getPath('documents');

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(initialPath, defaultName),
    filters: [
      { name: 'Markdown files', extensions: ['md'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('write-file', async (event, filepath, content) => {
  await fs.writeFile(filepath, content, 'utf-8');
  return true;
});

ipcMain.handle('read-file', async (event, filepath) => {
  return await fs.readFile(filepath, 'utf-8');
});

ipcMain.handle('add-recent-file', async (event, filepath) => {
  config.recent_files = config.recent_files.filter(f => f !== filepath);
  config.recent_files.unshift(filepath);
  config.recent_files = config.recent_files.slice(0, 10);
  await saveConfig();
});

ipcMain.on('show-context-menu', (event) => {
  const contextMenu = Menu.buildFromTemplate([
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'delete' },
    { type: 'separator' },
    { role: 'selectAll' }
  ]);
  contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle('select-directory', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title,
    properties: ['openDirectory']
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});
