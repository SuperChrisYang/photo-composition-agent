const video = document.querySelector('#camera')
const still = document.querySelector('#still')
const stage = document.querySelector('#stage')
const gridEl = document.querySelector('#grid')
const subjectMarker = document.querySelector('#subjectMarker')
const fileInput = document.querySelector('#fileInput')
const shutterBtn = document.querySelector('#shutterBtn')
const retakeBtn = document.querySelector('#retakeBtn')
const albumBtn = document.querySelector('#albumBtn')
const analyzeBtn = document.querySelector('#analyzeBtn')
const applyBtn = document.querySelector('#applyBtn')
const planShootBtn = document.querySelector('#planShootBtn')
const closeCameraBtn = document.querySelector('#closeCameraBtn')
const liveBadge = document.querySelector('#liveBadge')

const state = {
  mode: 'landscape',
  grid: 'thirds',
  subject: null,
  stream: null,
  frozen: false,
  starting: false,
  analyzing: false,
  settings: null,
}

const MODE_COPY = {
  landscape: '风景',
  portrait: '人物',
  environment: '环境',
  night: '夜景',
  architecture: '建筑',
}

const GRID_PRESETS = {
  thirds: 'thirds',
  golden: 'golden',
  diagonal: 'diagonal',
  symmetry: 'symmetry',
  none: '',
}

const MODE_TEMPLATES = {
  landscape: {
    baseline: { iso: 100, shutter: '1/250', ev: 0, whiteBalance: '自动', focus: '无限远', hdr: '关' },
    composition: ['用前景或道路形成纵深感，让画面有近中远三层'],
    params: ['ISO 100，保留天空与地面细节', '快门 1/250 秒，适合日间风光', 'EV 0，测光点放在主体', '白平衡自动，对焦无限远'],
    position: ['蹲低或贴近地面，降低机位', '左右移动，寻找引导线进入画面的角度'],
    edit: ['裁剪到三分线，去掉边缘杂物', '小幅提升对比度和色彩饱和', '天空过曝时压高光，地面提阴影'],
    next: { iso: 100, shutter: '1/250', ev: 0, whiteBalance: '自动', focus: '无限远', hdr: '关', tip: '清晨/傍晚光线更柔和' },
  },
  portrait: {
    baseline: { iso: 200, shutter: '1/125', ev: 0.3, whiteBalance: '自动', focus: '眼部', hdr: '关' },
    composition: ['人物眼睛保持在画面上三分之一处，避免头顶裁切'],
    params: ['ISO 200，兼顾快门与画质', '快门 1/125 秒，减少手持抖动', 'EV +0.3，提亮肤色', '对焦锁定在靠近镜头的眼睛'],
    position: ['机位与人物眼睛同高或略低', '让人物侧身 30-45 度，增加轮廓层次'],
    edit: ['轻微提亮肤色，降低橙色饱和', '背景虚化不足时可局部柔化', '裁掉头顶多余空间，保持视线留白'],
    next: { iso: 200, shutter: '1/125', ev: 0.3, whiteBalance: '自动', focus: '眼部', hdr: '关', tip: '顺光或侧逆光更显立体' },
  },
  environment: {
    baseline: { iso: 100, shutter: '1/200', ev: 0, whiteBalance: '自动', focus: '区域', hdr: '开' },
    composition: ['寻找门窗、树枝或建筑边缘作为自然画框'],
    params: ['ISO 100，保证环境细节', '快门 1/200 秒，捕捉瞬间', 'EV 0，HDR 开，兼顾明暗', '对焦区域模式，覆盖主要环境'],
    position: ['后退一步，把环境纳入画面', '沿环境边缘平移，让重复元素形成节奏'],
    edit: ['恢复高光和阴影细节', '增强环境线条的清晰度', '统一色温，突出空间氛围'],
    next: { iso: 100, shutter: '1/200', ev: 0, whiteBalance: '自动', focus: '区域', hdr: '开', tip: '雨后或薄雾天更有氛围' },
  },
  night: {
    baseline: { iso: 800, shutter: '1/30', ev: -0.3, whiteBalance: '自动', focus: '最亮点', hdr: '关' },
    composition: ['优先找灯光反光面与暗部形成明暗对比'],
    params: ['ISO 800，暗光下平衡噪点与亮度', '快门 1/30 秒，需要稳定支撑', 'EV -0.3，保留暗部氛围', '手动对焦到最亮点，关闭长曝光补偿'],
    position: ['寻找稳定支撑或使用三脚架，避免手抖', '避免数码变焦，用脚步靠近主体'],
    edit: ['降低阴影噪点，适当压暗环境', '提高灯光高光的锐度', '色温略偏暖，保留夜景氛围'],
    next: { iso: 800, shutter: '1/30', ev: -0.3, whiteBalance: '自动', focus: '最亮点', hdr: '关', tip: '蓝调时刻比纯夜拍更容易出片' },
  },
  architecture: {
    baseline: { iso: 100, shutter: '1/250', ev: 0, whiteBalance: '日光', focus: '中心', hdr: '开' },
    composition: ['保证垂直线条与画面边缘平行，优先对称构图'],
    params: ['ISO 100，获得清晰建筑纹理', '快门 1/250 秒，适合白天', 'EV 0，HDR 开，保留天空与阴影', '白平衡日光，对焦中心'],
    position: ['后退或移动脚步，把完整建筑收进画面', '站到中轴线位置，减少透视畸变'],
    edit: ['校正透视，拉直垂直线', '增强结构线条与阴影对比', '裁剪掉抢眼的路牌或行人'],
    next: { iso: 100, shutter: '1/250', ev: 0, whiteBalance: '日光', focus: '中心', hdr: '开', tip: '顺光时段建筑细节最清楚' },
  },
}

async function startCamera() {
  if (state.starting) return
  state.starting = true
  liveBadge.textContent = '启动中'
  stopCamera()
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    video.srcObject = state.stream
    video.hidden = false
    await video.play()
    await new Promise((resolve) => {
      if (video.readyState >= 2) resolve()
      else video.addEventListener('loadeddata', resolve, { once: true })
    })
    liveBadge.textContent = '点击拍摄'
  } catch {
    liveBadge.textContent = '相机不可用'
  } finally {
    state.starting = false
  }
}

function stopCamera() {
  state.stream?.getTracks().forEach((track) => track.stop())
  state.stream = null
}

function setFrozen(frozen) {
  state.frozen = frozen
  video.hidden = frozen
  still.hidden = !frozen
  retakeBtn.hidden = !frozen
  liveBadge.textContent = frozen ? '已取景' : '预览中'
}

function drawFrame(source) {
  still.width = source.videoWidth || source.naturalWidth || 1280
  still.height = source.videoHeight || source.naturalHeight || 960
  const ctx = still.getContext('2d')
  ctx.drawImage(source, 0, 0, still.width, still.height)
  setFrozen(true)
  void runAnalysis()
}

shutterBtn.addEventListener('click', async () => {
  if (state.frozen) return
  if (!state.stream || !video.videoWidth) {
    await startCamera()
    return
  }
  drawFrame(video)
})

liveBadge.addEventListener('click', async () => {
  if (state.frozen) return
  if (!state.stream || !video.videoWidth) await startCamera()
})

retakeBtn.addEventListener('click', () => {
  setFrozen(false)
  startCamera()
})

albumBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    still.width = image.naturalWidth
    still.height = image.naturalHeight
    const ctx = still.getContext('2d')
    ctx.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)
    setFrozen(true)
    void runAnalysis()
  }
  image.src = url
})

stage.addEventListener('pointerdown', (event) => {
  const rect = stage.getBoundingClientRect()
  state.subject = {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  }
  subjectMarker.style.left = `${state.subject.x * 100}%`
  subjectMarker.style.top = `${state.subject.y * 100}%`
  subjectMarker.classList.add('visible')
})

document.querySelectorAll('.mode-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('is-active'))
    button.classList.add('is-active')
    state.mode = button.dataset.mode
    renderTemplate(state.mode)
    if (state.frozen) void runAnalysis()
  })
})

document.querySelectorAll('.grid-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.grid-btn').forEach((b) => b.classList.remove('is-active'))
    button.classList.add('is-active')
    state.grid = button.dataset.grid
    gridEl.className = `grid ${GRID_PRESETS[state.grid]}`
  })
})

analyzeBtn.addEventListener('click', () => {
  if (still.width) {
    void runAnalysis()
    return
  }
  if (state.stream && video.videoWidth) {
    drawFrame(video)
    return
  }
  startCamera()
})
applyBtn.addEventListener('click', applyToCamera)
planShootBtn.addEventListener('click', async () => {
  if (!state.settings) {
    document.querySelector('#applyStatus').textContent = '请先启动场景分析。'
    return
  }
  await applyToCamera()
  if (state.stream && video.videoWidth && !state.frozen) drawFrame(video)
  else if (!state.stream) await startCamera()
})
closeCameraBtn.addEventListener('click', () => {
  stopCamera()
  video.hidden = true
  still.hidden = true
  state.frozen = false
  retakeBtn.hidden = true
  liveBadge.textContent = '点击开启相机'
})

function nearestThirdIntersection(x, y) {
  const points = [
    [1 / 3, 1 / 3],
    [2 / 3, 1 / 3],
    [1 / 3, 2 / 3],
    [2 / 3, 2 / 3],
  ]
  return points.reduce((best, point) => {
    const distance = Math.hypot(x - point[0], y - point[1])
    return distance < best.distance ? { point, distance } : best
  }, { point: points[0], distance: Infinity })
}

function sampleImage() {
  const width = 160
  const height = 120
  const temp = document.createElement('canvas')
  temp.width = width
  temp.height = height
  const ctx = temp.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(still, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

function analyze() {
  if (!still.width) return
  const data = sampleImage().data
  const luma = []
  let sum = 0
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let edgeSum = 0

  for (let y = 0; y < 120; y += 1) {
    for (let x = 0; x < 160; x += 1) {
      const i = (y * 160 + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const l = r * 0.299 + g * 0.587 + b * 0.114
      luma.push(l)
      sum += l
      rSum += r
      gSum += g
      bSum += b
    }
  }

  const count = luma.length
  const avg = sum / count
  const variance = luma.reduce((acc, l) => acc + (l - avg) ** 2, 0) / count
  const std = Math.sqrt(variance)
  const rAvg = rSum / count
  const gAvg = gSum / count
  const bAvg = bSum / count
  const tempOffset = rAvg - bAvg

  for (let y = 1; y < 119; y += 1) {
    for (let x = 1; x < 159; x += 1) {
      const i = y * 160 + x
      const dx = Math.abs(luma[i + 1] - luma[i - 1])
      const dy = Math.abs(luma[i + 160] - luma[i - 160])
      edgeSum += dx + dy
    }
  }

  const edgeDensity = edgeSum / (119 * 158) / 510
  const exposure = avg < 70 ? 'underexposed' : avg > 185 ? 'overexposed' : 'balanced'
  const contrast = std < 32 ? 'low' : std > 72 ? 'high' : 'balanced'
  const edges = edgeDensity < 0.06 ? 'sparse' : edgeDensity > 0.18 ? 'busy' : 'balanced'
  const colorTone = tempOffset > 12 ? 'warm' : tempOffset < -12 ? 'cool' : 'neutral'

  const subject = state.subject ?? { x: 0.5, y: 0.5 }
  const target = nearestThirdIntersection(subject.x, subject.y)
  const subjectOffset = target.distance

  const result = buildAdvice({
    mode: state.mode,
    exposure,
    contrast,
    edges,
    colorTone,
    subjectOffset,
    subject,
  })
  state.settings = result.template
  render(result)
}

async function runAnalysis() {
  if (state.analyzing) return
  state.analyzing = true
  analyzeBtn.disabled = true
  analyzeBtn.textContent = '分析中'
  await new Promise((resolve) => setTimeout(resolve, 420))
  try {
    analyze()
    analyzeBtn.textContent = '分析完成'
  } finally {
    state.analyzing = false
    analyzeBtn.disabled = false
    setTimeout(() => {
      if (!state.analyzing) analyzeBtn.textContent = '启动场景分析'
    }, 1600)
  }
}

function buildAdvice({ mode, exposure, contrast, edges, colorTone, subjectOffset, subject }) {
  const base = MODE_TEMPLATES[mode]
  const composition = [...base.composition]
  const params = [...base.params]
  const position = [...base.position]
  const edit = [...base.edit]
  const template = { ...base.baseline }
  const next = { ...base.next }
  let score = 88

  if (subjectOffset > 0.16) {
    composition.push('把主体移到九宫格交叉点附近，留出视线方向的空间')
    score -= 12
  } else {
    composition.push('主体已接近三分点，保持呼吸空间')
  }

  if (edges === 'sparse') {
    composition.push('画面层次偏平，加入前景或改变角度制造纵深')
    edit.push('用裁剪或提亮前景增强空间感')
    score -= 6
  } else if (edges === 'busy') {
    composition.push('元素较密，适当简化背景，突出一个主体')
    edit.push('弱化边缘杂物，用局部模糊清理背景')
    score -= 4
  }

  if (exposure === 'underexposed') {
    template.iso = mode === 'night' ? 1600 : 400
    template.shutter = mode === 'night' ? '1/15' : '1/60'
    template.ev = 0.7
    next.iso = template.iso
    next.shutter = template.shutter
    next.ev = template.ev
    params.push(`当前偏暗：ISO ${template.iso}，快门 ${template.shutter}，EV +0.7`)
    edit.push('提亮阴影，控制高光不过曝')
    score -= 8
  } else if (exposure === 'overexposed') {
    template.iso = 50
    template.shutter = mode === 'night' ? '1/60' : '1/500'
    template.ev = -0.7
    next.iso = template.iso
    next.shutter = template.shutter
    next.ev = template.ev
    params.push(`当前偏亮：ISO ${template.iso}，快门 ${template.shutter}，EV -0.7`)
    edit.push('压高光，恢复天空或白色物体细节')
    score -= 8
  } else {
    params.push('当前曝光接近正常，保持测光点在主体上')
  }

  if (contrast === 'low') {
    template.hdr = '开'
    next.hdr = '开'
    params.push('开启 HDR，适当提高对比度')
    edit.push('提高对比度，增强画面立体感')
    score -= 3
  } else if (contrast === 'high') {
    template.hdr = '开'
    next.hdr = '开'
    params.push('以高光为测光依据，必要时开 HDR 保留暗部')
    edit.push('降低高光，微提阴影，避免死黑死白')
  }

  if (colorTone === 'warm') {
    template.whiteBalance = '微冷'
    next.whiteBalance = '微冷'
    params.push('白平衡向冷色调微调，恢复自然肤色')
    edit.push('色温略微下调，让画面更干净')
  } else if (colorTone === 'cool') {
    template.whiteBalance = '微暖'
    next.whiteBalance = '微暖'
    params.push('白平衡向暖色调微调，增强画面氛围')
    edit.push('色温略微上调，增加氛围感')
  } else {
    params.push('白平衡保持自动，后期微调色温')
  }

  if (mode === 'portrait') {
    params.push('对焦锁定在靠近镜头的眼睛')
    edit.push('轻微磨皮时保留皮肤纹理')
  } else if (mode === 'night') {
    params.push('手动对焦到最亮点，关闭夜间长曝光补偿')
    edit.push('降低噪点，保留灯光高光')
  } else {
    params.push('点击主体锁定对焦与测光')
  }

  if (subject.x < 0.3) position.push('向右平移，让主体回到三分线右侧')
  else if (subject.x > 0.7) position.push('向左平移，让主体回到三分线左侧')
  if (subject.y > 0.65) position.push('抬高机位或后移，避免主体过满')
  else if (subject.y < 0.25) position.push('降低机位或靠近，避免主体过小')

  const conclusion = `${MODE_COPY[mode]}场景：${exposureLabel(exposure)}、${contrastLabel(contrast)}。建议 ISO ${template.iso}、快门 ${template.shutter}、EV ${formatEv(template.ev)}，按机位提示调整后即可拍摄。`

  return {
    score: Math.max(58, Math.min(98, score)),
    conclusion,
    composition: composition.slice(0, 4),
    params: params.slice(0, 6),
    position: position.slice(0, 5),
    edit: edit.slice(0, 5),
    template,
    next,
  }
}

function exposureLabel(value) {
  return value === 'underexposed' ? '曝光偏暗' : value === 'overexposed' ? '曝光偏亮' : '曝光正常'
}

function contrastLabel(value) {
  return value === 'low' ? '对比度偏低' : value === 'high' ? '对比度偏高' : '对比度适中'
}

function formatEv(value) {
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

function templateCells(template) {
  return [
    ['ISO', template.iso],
    ['快门', template.shutter],
    ['EV', formatEv(template.ev)],
    ['白平衡', template.whiteBalance],
    ['对焦', template.focus],
    ['HDR', template.hdr],
  ]
}

function renderTemplate(mode) {
  const template = MODE_TEMPLATES[mode]
  const preview = document.querySelector('#templatePreview')
  preview.innerHTML = `<span>${MODE_COPY[mode]}模板</span><strong>ISO ${template.baseline.iso}</strong><strong>${template.baseline.shutter}</strong><strong>EV ${formatEv(template.baseline.ev)}</strong><strong>${template.baseline.whiteBalance}</strong>`
  document.querySelector('#templateGrid').replaceChildren(...templateCells(template.baseline).map(([label, value]) => {
    const div = document.createElement('div')
    div.className = 'template-cell'
    div.innerHTML = `<span>${label}</span><strong>${value}</strong>`
    return div
  }))
}

function render(result) {
  document.querySelector('#scoreTitle').textContent = result.conclusion
  document.querySelector('#compositionText').textContent = result.composition.join('；')
  document.querySelector('#scoreValue').textContent = String(result.score)
  document.querySelector('#scoreRing').style.setProperty('--score', `${result.score}%`)

  const paramsList = document.querySelector('#paramsList')
  const positionList = document.querySelector('#positionList')
  const editList = document.querySelector('#editList')
  fillList(paramsList, result.params)
  fillList(positionList, result.position)
  fillList(editList, result.edit)

  document.querySelector('#templateGrid').replaceChildren(...templateCells(result.template).map(([label, value]) => {
    const div = document.createElement('div')
    div.className = 'template-cell'
    div.innerHTML = `<span>${label}</span><strong>${value}</strong>`
    return div
  }))

  const nextGrid = document.querySelector('#nextTemplateGrid')
  const nextCells = templateCells(result.next).concat([['提示', result.next.tip]])
  nextGrid.replaceChildren(...nextCells.map(([label, value]) => {
    const div = document.createElement('div')
    div.className = 'template-cell'
    div.innerHTML = `<span>${label}</span><strong>${value}</strong>`
    return div
  }))

  document.querySelector('#applyStatus').textContent = ''
}

function fillList(list, items) {
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement('li')
    li.textContent = item
    return li
  }))
}

async function applyToCamera() {
  const status = document.querySelector('#applyStatus')
  const track = state.stream?.getVideoTracks()[0]
  if (!track) {
    status.textContent = '当前未连接摄像头，请先在实时预览中分析，或切换到拍摄模式。'
    return
  }
  if (!state.settings) {
    status.textContent = '请先拍摄或分析一张画面。'
    return
  }

  const capabilities = track.getCapabilities?.() ?? {}
  const constraints = { advanced: [] }
  const applied = []

  if (capabilities.iso && state.settings.iso >= capabilities.iso.min && state.settings.iso <= capabilities.iso.max) {
    constraints.advanced.push({ iso: state.settings.iso })
    applied.push(`ISO ${state.settings.iso}`)
  }
  if (capabilities.exposureCompensation) {
    const value = Number(state.settings.ev)
    const clamped = Math.max(capabilities.exposureCompensation.min, Math.min(capabilities.exposureCompensation.max, value))
    constraints.advanced.push({ exposureCompensation: clamped })
    applied.push(`EV ${formatEv(clamped)}`)
  }
  if (capabilities.whiteBalanceMode?.length && capabilities.whiteBalanceMode.includes('continuous')) {
    constraints.advanced.push({ whiteBalanceMode: 'continuous' })
    applied.push('自动白平衡')
  }
  if (capabilities.focusMode?.length && capabilities.focusMode.includes('continuous')) {
    constraints.advanced.push({ focusMode: 'continuous' })
    applied.push('连续对焦')
  }

  if (constraints.advanced.length === 0) {
    status.textContent = '当前浏览器未开放 ISO/快门/EV 控制，请按上方参数在系统相机或专业模式中手动设置。'
    return
  }

  try {
    await track.applyConstraints(constraints)
    status.textContent = `已尝试应用：${applied.join('、')}。快门和部分白平衡仍需系统相机手动设置。`
  } catch (error) {
    status.textContent = `自动设置被系统拒绝（${error.message}），请按模板手动设置。`
  }
}

renderTemplate(state.mode)
liveBadge.textContent = '点击开启相机'
window.addEventListener('beforeunload', stopCamera)
