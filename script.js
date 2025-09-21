const STORAGE_KEY = 'smart-study-planner:tasks:v1'

// Elements
const taskForm = document.getElementById('taskForm')
const titleInput = document.getElementById('title')
const descInput = document.getElementById('description')
const startInput = document.getElementById('startDate')
const dueInput = document.getElementById('dueDate')
const priorityInput = document.getElementById('priority')
const progressInput = document.getElementById('progress')
const tasksList = document.getElementById('tasksList')
const totalCount = document.getElementById('totalCount')
const timelineCanvas = document.getElementById('timelineCanvas')
const ctx = timelineCanvas.getContext('2d')
const requestNotifBtn = document.getElementById('requestNotif')
const exportBtn = document.getElementById('exportBtn')
const importBtn = document.getElementById('importBtn')
const fileInput = document.getElementById('fileInput')
const clearBtn = document.getElementById('clearBtn')
const searchInput = document.getElementById('search')
let tasks = []
let filter = 'all'

// Utilities
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY)
  tasks = raw ? JSON.parse(raw) : []
  tasks.forEach((t) => t.due && (t.due = t.due)) // keep as string
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function renderTasks() {
  const q = searchInput.value.toLowerCase()
  const visible = tasks
    .filter((t) => {
      if (filter === 'active' && t.status === 'completed') return false
      if (filter === 'completed' && t.status !== 'completed') return false
      if (
        q &&
        !(
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        )
      )
        return false
      return true
    })
    .sort(
      (a, b) =>
        (a.status === 'completed') - (b.status === 'completed') ||
        new Date(a.due || 0) - new Date(b.due || 0)
    )

  tasksList.innerHTML = ''
  visible.forEach((t) => {
    const el = document.createElement('div')
    el.className = 'task'
    const left = document.createElement('div')
    left.className = 'task-left'
    const title = document.createElement('div')
    title.innerHTML = `<strong>${escapeHtml(
      t.title
    )}</strong> <span class="meta"> - ${t.due || 'No due'}</span>`
    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.innerHTML = `${t.priority} • ${t.status || 'active'}`
    const progWrap = document.createElement('div')
    progWrap.className = 'progress'
    const progBar = document.createElement('i')
    progBar.style.width = (t.progress || 0) + '%'
    progWrap.appendChild(progBar)
    left.appendChild(title)
    left.appendChild(meta)
    left.appendChild(progWrap)

    const right = document.createElement('div')
    right.style.display = 'flex'
    right.style.gap = '8px'
    right.style.alignItems = 'center'

    const editBtn = document.createElement('button')
    editBtn.className = 'small btn ghost'
    editBtn.textContent = 'Edit'
    editBtn.onclick = () => loadIntoForm(t.id)

    const delBtn = document.createElement('button')
    delBtn.className = 'small btn ghost'
    delBtn.textContent = 'Delete'
    delBtn.onclick = () => {
      if (confirm('Delete task?')) {
        tasks = tasks.filter((x) => x.id !== t.id)
        saveTasks()
        renderAll()
      }
    }

    const completeBtn = document.createElement('button')
    completeBtn.className = 'small btn'
    completeBtn.textContent =
      t.status === 'completed' ? 'Mark Active' : 'Complete'
    completeBtn.onclick = () => {
      t.status = t.status === 'completed' ? 'active' : 'completed'
      saveTasks()
      renderAll()
    }

    // priority badge
    const badge = document.createElement('span')
    badge.className =
      'badge ' +
      (t.priority === 'high'
        ? 'prio-high'
        : t.priority === 'medium'
        ? 'prio-med'
        : 'prio-low')
    badge.textContent = t.priority

    right.appendChild(badge)
    right.appendChild(editBtn)
    right.appendChild(completeBtn)
    right.appendChild(delBtn)

    el.appendChild(left)
    el.appendChild(right)
    tasksList.appendChild(el)
  })

  totalCount.textContent = tasks.length
  renderTimeline()
}

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(
    /[&<>\"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        c
      ])
  )
}

function addOrUpdateTask(task) {
  const existing = tasks.find((t) => t.id === task.id)
  if (existing) {
    Object.assign(existing, task)
  } else tasks.push(task)
  saveTasks()
  renderAll()
}

function loadIntoForm(id) {
  const t = tasks.find((x) => x.id === id)
  if (!t) return
  document.getElementById('taskId').value = t.id
  titleInput.value = t.title
  descInput.value = t.description || ''
  startInput.value = t.start || ''
  dueInput.value = t.due || ''
  priorityInput.value = t.priority || 'medium'
  progressInput.value = t.progress || 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const id = document.getElementById('taskId').value || uid()
  const newTask = {
    id,
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    start: startInput.value || null,
    due: dueInput.value || null,
    priority: priorityInput.value,
    progress: Number(progressInput.value) || 0,
    status: Number(progressInput.value) >= 100 ? 'completed' : 'active',
    createdAt: new Date().toISOString(),
  }
  addOrUpdateTask(newTask)
  taskForm.reset()
  document.getElementById('taskId').value = ''
})

clearBtn.addEventListener('click', () => {
  taskForm.reset()
  document.getElementById('taskId').value = ''
})

// filters
document.getElementById('filterAll').onclick = () => {
  filter = 'all'
  renderAll()
}
document.getElementById('filterActive').onclick = () => {
  filter = 'active'
  renderAll()
}
document.getElementById('filterComplete').onclick = () => {
  filter = 'completed'
  renderAll()
}
searchInput.addEventListener('input', () => renderAll())

function renderAll() {
  renderTasks()
}

// Timeline drawing
function renderTimeline() {
  const W = (timelineCanvas.width =
    timelineCanvas.clientWidth * devicePixelRatio)
  const H = (timelineCanvas.height = 160 * devicePixelRatio)
  ctx.resetTransform()
  ctx.clearRect(0, 0, W, H)
  ctx.scale(devicePixelRatio, devicePixelRatio)
  const visible = tasks
    .filter((t) => t.start && t.due)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  if (!visible.length) {
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('No tasks with start & due dates to show timeline', 12, 24)
    return
  }
  // compute range
  const dates = visible.flatMap((t) => [new Date(t.start), new Date(t.due)])
  const min = Math.min(...dates.map((d) => d.getTime()))
  const max = Math.max(...dates.map((d) => d.getTime()))
  const pad = (max - min) * 0.06 || 24 * 3600 * 1000
  const left = 12,
    right = timelineCanvas.clientWidth - 12,
    width = right - left

  // draw timeline ticks
  const days = Math.max(1, Math.round((max - min) / (24 * 3600 * 1000)))
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i <= Math.min(days, 10); i++) {
    const x = left + (i / Math.min(days, 10)) * width
    ctx.fillRect(x, 0, 1, timelineCanvas.clientHeight / devicePixelRatio)
    const ts = new Date(min + (i / Math.min(days, 10)) * (max - min))
    ctx.font = '11px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(ts.toISOString().slice(0, 10), x + 4, 12)
  }

  // draw bars
  visible.forEach((t, idx) => {
    const y = 30 + idx * 28
    const startX =
      left + ((new Date(t.start).getTime() - min) / (max - min + pad)) * width
    const endX =
      left + ((new Date(t.due).getTime() - min) / (max - min + pad)) * width
    const barW = Math.max(8, endX - startX)
    // background
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(left, y - 6, width, 18)
    // bar
    const grad = ctx.createLinearGradient(startX, y, startX + barW, y)
    grad.addColorStop(0, '#ff385c')
    grad.addColorStop(1, '#ff8aa0')
    ctx.fillStyle = grad
    ctx.fillRect(startX, y - 6, barW, 14)
    // text
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillText(t.title, startX + 6, y + 3)
  })

  // resize canvas CSS height remains
  timelineCanvas.style.height = '160px'
}

// Notification reminders: check tasks with a due date within next X minutes
let notifEnabled = false
requestNotifBtn.addEventListener('click', async () => {
  if (!('Notification' in window))
    return alert('Notifications not supported in this browser')
  const perm = await Notification.requestPermission()
  notifEnabled = perm === 'granted'
  requestNotifBtn.textContent = notifEnabled
    ? 'Notifications Enabled'
    : 'Enable Notifications'
})

function checkReminders() {
  if (!notifEnabled) return
  const now = Date.now()
  tasks.forEach((t) => {
    if (!t.due || t._reminded) return
    const due = new Date(t.due).getTime()
    // if due within next 60 minutes, remind
    if (due - now <= 60 * 60 * 1000 && due - now > -60 * 60 * 1000) {
      new Notification('Task due soon: ' + t.title, {
        body: t.description || '',
      })
      t._reminded = true // avoid duplicates until reload
    }
  })
}

// periodically check every minute
setInterval(checkReminders, 60 * 1000)

importBtn.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result)
      if (Array.isArray(imported)) {
        tasks = imported
        saveTasks()
        renderAll()
        alert('Imported tasks')
      } else alert('Invalid JSON')
    } catch (err) {
      alert('Failed to parse file')
    }
  }
  reader.readAsText(f)
})

// simple auto-save for progress slider while editing
progressInput.addEventListener('input', () => {
  // show percent value next to slider? quick UX: title changes
})

// helper to initialize demo if empty
function seedIfEmpty() {
  if (tasks.length) return
  tasks = [
    {
      id: uid(),
      title: 'Math - Algebra practice',
      description: 'Chapters 3 & 4',
      start: addDaysISO(0),
      due: addDaysISO(2),
      priority: 'high',
      progress: 20,
      status: 'active',
    },
    {
      id: uid(),
      title: 'History - WWII notes',
      description: 'Read and summarize',
      start: addDaysISO(1),
      due: addDaysISO(5),
      priority: 'medium',
      progress: 0,
      status: 'active',
    },
    {
      id: uid(),
      title: 'Chemistry - Lab report',
      description: 'Complete experiment 7',
      start: addDaysISO(3),
      due: addDaysISO(4),
      priority: 'low',
      progress: 50,
      status: 'active',
    },
  ]
  saveTasks()
}
function addDaysISO(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// small UI polish: keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    searchInput.focus()
  }
})

// initial
loadTasks()
seedIfEmpty()
renderAll()

// run reminders check once on load
if ('Notification' in window && Notification.permission === 'granted')
  notifEnabled = true
checkReminders()
