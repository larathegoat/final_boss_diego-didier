/* =========================================
   TASKFLOW — app.js
   Consume API REST, render Kanban, Drag & Drop
   ========================================= */

const API_URL = 'http://localhost:3000'

// ──────────────────────────────────────────
// STATE
// ──────────────────────────────────────────
let tasks = []
let draggedTaskId = null
let taskToDelete = null

// ──────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────
const modalOverlay  = document.getElementById('modalOverlay')
const deleteOverlay = document.getElementById('deleteOverlay')
const taskTitleInput = document.getElementById('taskTitle')
const taskDescInput  = document.getElementById('taskDesc')
const errorTitle     = document.getElementById('errorTitle')
const submitBtn      = document.getElementById('submitTask')
const submitText     = document.getElementById('submitText')
const submitSpinner  = document.getElementById('submitSpinner')
const deleteTaskTitle = document.getElementById('deleteTaskTitle')

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTasks()
  bindEvents()
})

// ──────────────────────────────────────────
// API CALLS
// ──────────────────────────────────────────

async function loadTasks() {
  try {
    const res = await fetch(`${API_URL}/tasks`)
    if (!res.ok) throw new Error('Error al cargar tareas')
    tasks = await res.json()
    renderBoard()
  } catch (err) {
    showToast('No se pudo conectar con el servidor', 'error')
    console.error(err)
  }
}

async function createTask(title, description) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al crear tarea')
  return data
}

async function updateTaskStatus(id, status) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al actualizar tarea')
  return data
}

async function deleteTask(id) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE'
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al eliminar tarea')
  return data
}

// ──────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────

function renderBoard() {
  const statuses = ['todo', 'doing', 'done']

  statuses.forEach(status => {
    const col = document.getElementById(`col-${status}`)
    const empty = document.getElementById(`empty-${status}`)
    const count = document.getElementById(`count-${status}`)

    // Remove existing cards (keep empty state element)
    const existingCards = col.querySelectorAll('.task-card')
    existingCards.forEach(c => c.remove())

    const filtered = tasks.filter(t => t.status === status)
    count.textContent = filtered.length

    if (filtered.length === 0) {
      empty.classList.remove('hidden')
    } else {
      empty.classList.add('hidden')
      filtered.forEach(task => {
        col.appendChild(createTaskCard(task))
      })
    }
  })

  // Actualizar footer stats
  document.getElementById('footer-todo').textContent  = tasks.filter(t => t.status === 'todo').length
  document.getElementById('footer-doing').textContent = tasks.filter(t => t.status === 'doing').length
  document.getElementById('footer-done').textContent  = tasks.filter(t => t.status === 'done').length
}

function createTaskCard(task) {
  const card = document.createElement('div')
  card.classList.add('task-card')
  card.setAttribute('data-id', task.id)
  card.setAttribute('data-status', task.status)
  card.setAttribute('draggable', 'true')

  const badgeClass = {
    todo: 'badge-todo',
    doing: 'badge-doing',
    done: 'badge-done'
  }[task.status] || 'badge-todo'

  const badgeLabel = {
    todo: 'To Do',
    doing: 'Doing',
    done: 'Done'
  }[task.status] || task.status

  card.innerHTML = `
    <div class="task-card-top">
      <div class="task-title">${escapeHTML(task.title)}</div>
      <div class="task-actions">
        <button class="btn-icon btn-delete" title="Eliminar tarea" onclick="openDeleteModal(${task.id}, '${escapeAttr(task.title)}')">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>
    ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
    <div class="task-footer">
      <span class="status-badge ${badgeClass}">${badgeLabel}</span>
      <span class="task-id">#${task.id}</span>
    </div>
  `

  // Drag events
  card.addEventListener('dragstart', (e) => {
    draggedTaskId = task.id
    card.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  })

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging')
    draggedTaskId = null
    document.querySelectorAll('.column-body').forEach(col => {
      col.classList.remove('drag-over')
    })
  })

  return card
}

// ──────────────────────────────────────────
// DRAG & DROP HANDLERS
// ──────────────────────────────────────────

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const col = e.currentTarget
  col.classList.add('drag-over')
}

function handleDragLeave(e) {
  // Only remove if leaving the column itself, not its children
  const col = e.currentTarget
  if (!col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over')
  }
}

async function handleDrop(e, newStatus) {
  e.preventDefault()
  const col = e.currentTarget
  col.classList.remove('drag-over')

  if (!draggedTaskId) return

  const task = tasks.find(t => t.id === draggedTaskId)
  if (!task || task.status === newStatus) return

  // Optimistic update
  const oldStatus = task.status
  task.status = newStatus
  renderBoard()

  try {
    await updateTaskStatus(draggedTaskId, newStatus)
    showToast(`Tarea movida a "${statusLabel(newStatus)}"`, 'success')
  } catch (err) {
    // Revert on error
    task.status = oldStatus
    renderBoard()
    showToast(err.message, 'error')
  }
}

// ──────────────────────────────────────────
// MODAL: NUEVA TAREA
// ──────────────────────────────────────────

function openModal() {
  modalOverlay.classList.add('active')
  taskTitleInput.value = ''
  taskDescInput.value = ''
  clearError()
  setTimeout(() => taskTitleInput.focus(), 100)
}

function closeModal() {
  modalOverlay.classList.remove('active')
}

function clearError() {
  errorTitle.textContent = ''
  taskTitleInput.classList.remove('error')
}

function setLoading(loading) {
  submitBtn.disabled = loading
  submitText.textContent = loading ? 'Creando...' : 'Crear tarea'
  submitSpinner.classList.toggle('d-none', !loading)
}

async function handleSubmit() {
  const title = taskTitleInput.value.trim()
  const description = taskDescInput.value.trim()

  // Frontend validation
  clearError()
  if (!title) {
    errorTitle.textContent = 'El título es obligatorio'
    taskTitleInput.classList.add('error')
    taskTitleInput.focus()
    return
  }

  if (title.length < 3) {
    errorTitle.textContent = 'El título debe tener al menos 3 caracteres'
    taskTitleInput.classList.add('error')
    taskTitleInput.focus()
    return
  }

  setLoading(true)
  try {
    const newTask = await createTask(title, description)
    tasks.push(newTask)
    renderBoard()
    closeModal()
    showToast('Tarea creada correctamente', 'success')
  } catch (err) {
    errorTitle.textContent = err.message
    taskTitleInput.classList.add('error')
  } finally {
    setLoading(false)
  }
}

// ──────────────────────────────────────────
// MODAL: ELIMINAR
// ──────────────────────────────────────────

function openDeleteModal(id, title) {
  taskToDelete = id
  deleteTaskTitle.textContent = `"${title}"`
  deleteOverlay.classList.add('active')
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('active')
  taskToDelete = null
}

async function handleDelete() {
  if (!taskToDelete) return
  try {
    await deleteTask(taskToDelete)
    tasks = tasks.filter(t => t.id !== taskToDelete)
    renderBoard()
    closeDeleteModal()
    showToast('Tarea eliminada', 'info')
  } catch (err) {
    showToast(err.message, 'error')
    closeDeleteModal()
  }
}

// ──────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer')

  const icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-exclamation-circle-fill',
    info:    'bi-info-circle-fill'
  }

  const toast = document.createElement('div')
  toast.classList.add('toast-item', `toast-${type}`)
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info}"></i>
    <span>${escapeHTML(message)}</span>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-out')
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// ──────────────────────────────────────────
// EVENTS
// ──────────────────────────────────────────

function bindEvents() {
  // Modal nueva tarea
  document.getElementById('openModal').addEventListener('click', openModal)
  document.getElementById('closeModal').addEventListener('click', closeModal)
  document.getElementById('cancelModal').addEventListener('click', closeModal)
  document.getElementById('submitTask').addEventListener('click', handleSubmit)

  // Cerrar con overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal()
  })

  // Submit con Enter en el input de título
  taskTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit()
  })

  // Modal eliminar
  document.getElementById('closeDelete').addEventListener('click', closeDeleteModal)
  document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal)
  document.getElementById('confirmDelete').addEventListener('click', handleDelete)

  deleteOverlay.addEventListener('click', (e) => {
    if (e.target === deleteOverlay) closeDeleteModal()
  })

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal()
      closeDeleteModal()
    }
  })
}

// ──────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────

function escapeHTML(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(str) {
  if (!str) return ''
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"')
}

function statusLabel(status) {
  return { todo: 'To Do', doing: 'Doing', done: 'Done' }[status] || status
}
