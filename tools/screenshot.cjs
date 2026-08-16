const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 390,
    height: 844,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await win.loadFile(path.join(__dirname, '..', 'index.html'))
  await new Promise((resolve) => setTimeout(resolve, 1800))
  await win.webContents.executeJavaScript(`(() => {
    const canvas = document.querySelector('#still')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 320, 240)
    gradient.addColorStop(0, '#f8fafc')
    gradient.addColorStop(1, '#0f172a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 320, 240)
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(96, 72, 26, 0, Math.PI * 2)
    ctx.fill()
    document.querySelector('#analyzeBtn').click()
    return true
  })()`)
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const report = await win.webContents.executeJavaScript(`({
    text: document.body.innerText,
    analyzeButton: document.querySelector('#analyzeBtn').textContent,
    analyzeDisabled: document.querySelector('#analyzeBtn').disabled,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    sheetHeight: document.querySelector('.sheet').getBoundingClientRect().height
  })`)
  console.log(JSON.stringify(report, null, 2))
  const image = await win.webContents.capturePage()
  fs.writeFileSync(path.join(__dirname, '..', 'screenshot.png'), image.toPNG())
  app.quit()
})
