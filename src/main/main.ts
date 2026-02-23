import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase } from './memory/database'
import { BossAgent } from './agents/boss'
import { AgentRegistry } from './agents/registry'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a2e',
    show: true, // Show immediately instead of waiting for ready-to-show
  })

  // SIMPLIFIED DEV MODE: Always try localhost first during npm run dev
  // The dev:electron script runs after vite is ready, so this should work
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // Fallback if dev server isn't running
      console.error('Failed to connect to http://localhost:5173')
      mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html'))
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Boot sequence
app.whenReady().then(async () => {
  // Init SQLite memory database — wrapped so a native module error doesn't kill the window
  try {
    await initDatabase()
    AgentRegistry.init()
  } catch (err) {
    console.error('[Boot] Failed to init database or registry:', err)
    console.error('[Boot] Window will still open — memory features disabled until you run: npm run rebuild')
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Main entry point: user submits a job
ipcMain.handle('job:submit', async (_event, payload: { message: string }) => {
  try {
    const boss = new BossAgent()
    const result = await boss.handle(payload.message)
    return { success: true, result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// Fetch memory for a specific agent (for the memory viewer)
ipcMain.handle('memory:get', async (_event, agentId: string) => {
  const { getAgentMemory } = await import('./memory/database')
  return getAgentMemory(agentId)
})

// Fetch all jobs history
ipcMain.handle('jobs:history', async () => {
  const { getJobHistory } = await import('./memory/database')
  return getJobHistory()
})