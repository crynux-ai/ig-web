const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

Menu.setApplicationMenu(null)
app.commandLine.appendSwitch("enable-experimental-web-platform-features");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
    color: '#ffffff',
    symbolColor: '#999999',
    height: 30
  }
  })

  // win.openDevTools()
  win.loadFile('dist/index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
