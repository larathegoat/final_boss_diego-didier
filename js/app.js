// URL base del servidor backend (API REST).
// Todas las peticiones HTTP apuntarán a esta dirección.
const API_URL = 'http://localhost:3000'

// ESTADO GLOBAL DE LA APLICACIÓN

let tasks = []          // Arreglo que almacena todas las tareas cargadas desde el servidor
let draggedTaskId = null // ID de la tarea que el usuario está arrastrando en el tablero
let taskToDelete = null  // ID de la tarea que está pendiente de confirmación para eliminar

// REFERENCIAS A ELEMENTOS DEL DOM
// Se obtienen aquí una sola vez para no buscarlos en el DOM cada que se necesitan

const modalOverlay   = document.getElementById('modalOverlay')   // Overlay del modal "Nueva tarea"
const deleteOverlay  = document.getElementById('deleteOverlay')  // Overlay del modal "Eliminar tarea"
const taskTitleInput = document.getElementById('taskTitle')      // Input de texto del título
const taskDescInput  = document.getElementById('taskDesc')       // Textarea de la descripción
const errorTitle     = document.getElementById('errorTitle')     // Span donde se muestra el error de validación del título
const submitBtn      = document.getElementById('submitTask')     // Botón "Crear tarea"
const submitText     = document.getElementById('submitText')     // Texto dentro del botón de crear
const submitSpinner  = document.getElementById('submitSpinner')  // Spinner de carga dentro del botón de crear
const deleteTaskTitle = document.getElementById('deleteTaskTitle') // Span donde se muestra el nombre de la tarea a eliminar

// INICIALIZACIÓN

// Cuando el HTML termina de cargarse completamente, ejecuta estas dos acciones:
document.addEventListener('DOMContentLoaded', () => {
  loadTasks()   // 1. Carga las tareas desde el servidor y las pinta en el tablero
  bindEvents()  // 2. Registra todos los eventos de clic, teclado, etc.
})

// LLAMADAS A LA API (comunicación con el servidor)

/**
 * Carga todas las tareas desde el endpoint GET /tasks.
 * Si tiene éxito, guarda las tareas en el estado global y renderiza el tablero.
 * Si falla (sin conexión, error del servidor), muestra un toast de error.
 */
async function loadTasks() {
  try {
    const res = await fetch(`${API_URL}/tasks`)
    if (!res.ok) throw new Error('Error al cargar tareas') // Si el servidor responde con un código de error (4xx/5xx)
    tasks = await res.json()  // Convierte el cuerpo de la respuesta de JSON a objeto JS y lo guarda
    renderBoard()             // Pinta el tablero con las tareas recibidas
  } catch (err) {
    showToast('No se pudo conectar con el servidor', 'error')
    console.error(err) // Muestra el error en la consola del navegador para depuración
  }
}

/**
 * Crea una nueva tarea en el servidor mediante POST /tasks.
 * @param {string} title - Título de la tarea (obligatorio)
 * @param {string} description - Descripción de la tarea (opcional)
 * @returns {object} La tarea recién creada devuelta por el servidor (incluye su id)
 */
async function createTask(title, description) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // Le indica al servidor que mandamos JSON
    body: JSON.stringify({ title, description })      // Convierte el objeto a cadena JSON para enviarlo
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al crear tarea')
  return data // Retorna la tarea creada (con su id asignado por el servidor)
}

/**
 * Actualiza el estado (columna) de una tarea existente mediante PUT /tasks/:id.
 * @param {number} id - ID de la tarea a actualizar
 * @param {string} status - Nuevo estado: 'todo', 'doing' o 'done'
 * @returns {object} La tarea actualizada devuelta por el servidor
 */
async function updateTaskStatus(id, status) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }) // Solo se envía el campo que cambió
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al actualizar tarea')
  return data
}

/**
 * Elimina una tarea del servidor mediante DELETE /tasks/:id.
 * @param {number} id - ID de la tarea a eliminar
 * @returns {object} Respuesta del servidor confirmando la eliminación
 */
async function deleteTask(id) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE'
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al eliminar tarea')
  return data
}

// RENDERIZADO DEL TABLERO

/**
 * Dibuja (o redibuja) todas las tarjetas en sus columnas correspondientes.
 * Limpia las tarjetas existentes, filtra las tareas por estado y
 * actualiza los contadores de columnas y del footer.
 */
function renderBoard() {
  const statuses = ['todo', 'doing', 'done'] // Los tres estados posibles del tablero

  statuses.forEach(status => {
    const col   = document.getElementById(`col-${status}`)    // Contenedor de tarjetas de esta columna
    const empty = document.getElementById(`empty-${status}`)  // Mensaje de "sin tareas"
    const count = document.getElementById(`count-${status}`)  // Contador en el encabezado de columna

    // Elimina únicamente las tarjetas (.task-card) existentes; deja el mensaje de "vacío" intacto
    const existingCards = col.querySelectorAll('.task-card')
    existingCards.forEach(c => c.remove())

    // Filtra del estado global solo las tareas que pertenecen a esta columna
    const filtered = tasks.filter(t => t.status === status)
    count.textContent = filtered.length // Actualiza el número del encabezado

    if (filtered.length === 0) {
      // Si no hay tareas, muestra el mensaje de columna vacía
      empty.classList.remove('hidden')
    } else {
      // Si hay tareas, oculta el mensaje y agrega una tarjeta por cada tarea
      empty.classList.add('hidden')
      filtered.forEach(task => {
        col.appendChild(createTaskCard(task)) // Crea el elemento HTML de la tarjeta y lo inserta
      })
    }
  })

  // Actualiza los contadores del footer con el total global por estado
  document.getElementById('footer-todo').textContent  = tasks.filter(t => t.status === 'todo').length
  document.getElementById('footer-doing').textContent = tasks.filter(t => t.status === 'doing').length
  document.getElementById('footer-done').textContent  = tasks.filter(t => t.status === 'done').length
}

/**
 * Crea y devuelve el elemento HTML (<div>) de una tarjeta de tarea.
 * También registra los eventos de drag & drop sobre la tarjeta.
 * @param {object} task - Objeto con los datos de la tarea (id, title, description, status)
 * @returns {HTMLElement} El elemento div listo para insertarse en el DOM
 */
function createTaskCard(task) {
  const card = document.createElement('div')
  card.classList.add('task-card')
  card.setAttribute('data-id', task.id)         // Guarda el ID para referenciarlo luego
  card.setAttribute('data-status', task.status) // Guarda el estado para aplicar estilos CSS
  card.setAttribute('draggable', 'true')        // Permite arrastrar este elemento

  // Determina la clase CSS del badge según el estado de la tarea
  const badgeClass = {
    todo:  'badge-todo',
    doing: 'badge-doing',
    done:  'badge-done'
  }[task.status] || 'badge-todo' // Por defecto 'badge-todo' si el estado es desconocido

  // Texto legible del badge para mostrar al usuario
  const badgeLabel = {
    todo:  'To Do',
    doing: 'Doing',
    done:  'Done'
  }[task.status] || task.status

  // Genera el HTML interno de la tarjeta usando template literals
  // escapeHTML() se usa para evitar inyección de código malicioso (XSS)
  card.innerHTML = `
    <div class="task-card-top">
      <div class="task-title">${escapeHTML(task.title)}</div>
      <div class="task-actions">
        <!-- Botón de eliminar; pasa el id y título al modal de confirmación -->
        <button class="btn-icon btn-delete" title="Eliminar tarea" onclick="openDeleteModal(${task.id}, '${escapeAttr(task.title)}')">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>
    <!-- Solo renderiza el bloque de descripción si existe contenido -->
    ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
    <div class="task-footer">
      <span class="status-badge ${badgeClass}">${badgeLabel}</span>
      <span class="task-id">#${task.id}</span>
    </div>
  `

  // ── Eventos de Drag & Drop sobre la tarjeta ──

  // Al comenzar a arrastrar: guarda el ID de la tarea arrastrada y aplica estilo visual
  card.addEventListener('dragstart', (e) => {
    draggedTaskId = task.id             // Registra qué tarea se está moviendo
    card.classList.add('dragging')      // Aplica opacidad reducida a la tarjeta (estilo CSS)
    e.dataTransfer.effectAllowed = 'move' // Indica que la operación permitida es "mover"
  })

  // Al soltar o cancelar el arrastre: limpia el estado visual de la tarjeta y de todas las columnas
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging') // Quita la opacidad reducida
    draggedTaskId = null              // Limpia el ID guardado
    // Elimina el resaltado de "zona de drop" de todas las columnas
    document.querySelectorAll('.column-body').forEach(col => {
      col.classList.remove('drag-over')
    })
  })

  return card
}

// MANEJADORES DE DRAG & DROP (en las columnas)

/**
 * Se activa continuamente mientras una tarjeta es arrastrada sobre una columna.
 * Es necesario llamar e.preventDefault() para permitir el evento 'drop'.
 * @param {DragEvent} e - Evento nativo del navegador
 */
function handleDragOver(e) {
  e.preventDefault()                       // Sin esto, el drop no funcionaría
  e.dataTransfer.dropEffect = 'move'       // Muestra el cursor de "mover"
  const col = e.currentTarget              // La columna sobre la que se está arrastrando
  col.classList.add('drag-over')           // Resalta la columna visualmente como zona válida
}

/**
 * Se activa cuando el cursor sale de una columna durante el arrastre.
 * Solo elimina el resaltado si el cursor realmente salió de la columna
 * (no si entró en un elemento hijo como una tarjeta).
 * @param {DragEvent} e - Evento nativo del navegador
 */
function handleDragLeave(e) {
  const col = e.currentTarget
  // e.relatedTarget es el elemento al que entró el cursor al salir de la columna
  // Si ese elemento NO está dentro de la columna, significa que realmente salió
  if (!col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over')
  }
}

/**
 * Se activa cuando el usuario suelta la tarjeta sobre una columna (drop).
 * Aplica "Optimistic Update": actualiza la UI inmediatamente sin esperar al servidor,
 * y revierte si la petición falla.
 * @param {DragEvent} e - Evento nativo del navegador
 * @param {string} newStatus - Estado de la columna destino ('todo', 'doing' o 'done')
 */
async function handleDrop(e, newStatus) {
  e.preventDefault()
  const col = e.currentTarget
  col.classList.remove('drag-over') // Quita el resaltado de la columna destino

  if (!draggedTaskId) return // Protección: si no hay tarea siendo arrastrada, no hace nada

  const task = tasks.find(t => t.id === draggedTaskId) // Busca la tarea en el estado global
  if (!task || task.status === newStatus) return        // No hace nada si la columna es la misma

  const oldStatus = task.status // Guarda el estado anterior por si hay que revertir
  task.status = newStatus       // ① Actualización optimista: cambia el estado en memoria
  renderBoard()                 // ② Redibuja el tablero inmediatamente (UX fluida)

  try {
    await updateTaskStatus(draggedTaskId, newStatus) // ③ Confirma el cambio en el servidor
    showToast(`Tarea movida a "${statusLabel(newStatus)}"`, 'success')
  } catch (err) {
    // Si el servidor falla, revierte el cambio visual al estado anterior
    task.status = oldStatus
    renderBoard()
    showToast(err.message, 'error')
  }
}

// MODAL: NUEVA TAREA

/**
 * Abre el modal de nueva tarea, limpia los campos y pone el foco en el título.
 */
function openModal() {
  modalOverlay.classList.add('active') // La clase 'active' lo hace visible (ver CSS)
  taskTitleInput.value = ''            // Limpia el campo título
  taskDescInput.value = ''            // Limpia el campo descripción
  clearError()                         // Elimina mensajes de error anteriores
  setTimeout(() => taskTitleInput.focus(), 100) // Espera 100ms para que la animación termine antes de enfocar
}

/**
 * Cierra el modal de nueva tarea eliminando la clase 'active'.
 */
function closeModal() {
  modalOverlay.classList.remove('active')
}

/**
 * Limpia el mensaje de error de validación del campo título.
 */
function clearError() {
  errorTitle.textContent = ''
  taskTitleInput.classList.remove('error') // Quita el borde rojo del input
}

/**
 * Activa o desactiva el estado de carga del botón "Crear tarea".
 * Mientras carga: deshabilita el botón, cambia el texto y muestra el spinner.
 * @param {boolean} loading - true para activar el estado de carga, false para desactivarlo
 */
function setLoading(loading) {
  submitBtn.disabled = loading
  submitText.textContent = loading ? 'Creando...' : 'Crear tarea'
  submitSpinner.classList.toggle('d-none', !loading) // d-none = display:none de Bootstrap
}

/**
 * Maneja el envío del formulario de nueva tarea.
 * 1. Valida los campos del formulario en el frontend.
 * 2. Llama a la API para crear la tarea.
 * 3. Actualiza el tablero y cierra el modal si todo va bien.
 */
async function handleSubmit() {
  const title       = taskTitleInput.value.trim() // .trim() elimina espacios al inicio y al final
  const description = taskDescInput.value.trim()

  // ── Validación en el frontend (antes de tocar el servidor) ──
  clearError()

  if (!title) {
    // El título no puede estar vacío
    errorTitle.textContent = 'El título es obligatorio'
    taskTitleInput.classList.add('error')
    taskTitleInput.focus()
    return // Detiene la ejecución aquí
  }

  if (title.length < 3) {
    // El título debe tener al menos 3 caracteres
    errorTitle.textContent = 'El título debe tener al menos 3 caracteres'
    taskTitleInput.classList.add('error')
    taskTitleInput.focus()
    return
  }

  // ── Petición al servidor ──
  setLoading(true) // Activa el spinner y deshabilita el botón
  try {
    const newTask = await createTask(title, description) // Llama a POST /tasks
    tasks.push(newTask)  // Agrega la nueva tarea al estado global (sin recargar del servidor)
    renderBoard()        // Redibuja el tablero para mostrar la nueva tarjeta
    closeModal()
    showToast('Tarea creada correctamente', 'success')
  } catch (err) {
    // Si el servidor devuelve un error, lo muestra en el campo del formulario
    errorTitle.textContent = err.message
    taskTitleInput.classList.add('error')
  } finally {
    setLoading(false) // Siempre desactiva el spinner, haya error o no
  }
}

// MODAL: ELIMINAR TAREA

/**
 * Abre el modal de confirmación de eliminación y muestra el nombre de la tarea.
 * Es llamado desde el botón de basura de cada tarjeta (inline onclick en el HTML generado).
 * @param {number} id - ID de la tarea que se quiere eliminar
 * @param {string} title - Título de la tarea (para mostrarlo en el mensaje de confirmación)
 */
function openDeleteModal(id, title) {
  taskToDelete = id                             // Guarda el ID en el estado global
  deleteTaskTitle.textContent = `"${title}"`    // Muestra el nombre en el texto de confirmación
  deleteOverlay.classList.add('active')         // Hace visible el modal
}

/**
 * Cierra el modal de eliminación y limpia el ID guardado.
 */
function closeDeleteModal() {
  deleteOverlay.classList.remove('active')
  taskToDelete = null // Limpia el estado para evitar eliminaciones accidentales
}

/**
 * Ejecuta la eliminación de la tarea confirmada.
 * 1. Llama a DELETE /tasks/:id en el servidor.
 * 2. Si tiene éxito, elimina la tarea del estado local y redibuja el tablero.
 */
async function handleDelete() {
  if (!taskToDelete) return // Protección: no hace nada si no hay tarea pendiente de eliminar
  try {
    await deleteTask(taskToDelete)                           // Llama a DELETE /tasks/:id
    tasks = tasks.filter(t => t.id !== taskToDelete)         // Elimina la tarea del arreglo local
    renderBoard()
    closeDeleteModal()
    showToast('Tarea eliminada', 'info')
  } catch (err) {
    showToast(err.message, 'error')
    closeDeleteModal() // Cierra el modal incluso si hay error
  }
}

// NOTIFICACIONES TOAST

/**
 * Muestra una notificación flotante ("toast") en la esquina inferior derecha.
 * El toast desaparece automáticamente después de 3.5 segundos con una animación de salida.
 * @param {string} message - Texto a mostrar en la notificación
 * @param {string} type - Tipo de toast: 'success' (lila), 'error' (rojo), 'info' (naranja)
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer')

  // Íconos de Bootstrap Icons según el tipo de notificación
  const icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-exclamation-circle-fill',
    info:    'bi-info-circle-fill'
  }

  // Crea el elemento del toast dinámicamente
  const toast = document.createElement('div')
  toast.classList.add('toast-item', `toast-${type}`) // Clase base + clase de color según tipo
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info}"></i>
    <span>${escapeHTML(message)}</span>
  `

  container.appendChild(toast) // Lo añade al contenedor en el DOM

  // Después de 3.5 segundos, agrega la clase de animación de salida
  setTimeout(() => {
    toast.classList.add('toast-out')
    // Después de que termina la animación de salida (300ms), elimina el elemento del DOM
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// REGISTRO DE EVENTOS

/**
 * Registra todos los event listeners de la aplicación.
 * Se llama una sola vez al inicio (en DOMContentLoaded) para evitar duplicados.
 */
function bindEvents() {
  // ── Modal "Nueva tarea" ──
  document.getElementById('openModal').addEventListener('click', openModal)     // Botón del header
  document.getElementById('closeModal').addEventListener('click', closeModal)   // Botón × del modal
  document.getElementById('cancelModal').addEventListener('click', closeModal)  // Botón "Cancelar"
  document.getElementById('submitTask').addEventListener('click', handleSubmit) // Botón "Crear tarea"

  // Cierra el modal si el usuario hace clic en el fondo oscuro (fuera de la tarjeta blanca)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal() // Solo si el clic fue directamente en el overlay
  })

  // Permite enviar el formulario presionando Enter desde el input del título
  taskTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit()
  })

  // ── Modal "Eliminar tarea" ──
  document.getElementById('closeDelete').addEventListener('click', closeDeleteModal)   // Botón ×
  document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal)  // Botón "Cancelar"
  document.getElementById('confirmDelete').addEventListener('click', handleDelete)     // Botón "Eliminar"

  // Cierra el modal de eliminar si el usuario hace clic en el fondo oscuro
  deleteOverlay.addEventListener('click', (e) => {
    if (e.target === deleteOverlay) closeDeleteModal()
  })

  // Tecla Escape: cierra cualquier modal que esté abierto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal()
      closeDeleteModal()
    }
  })
}

// UTILIDADES

/**
 * Escapa caracteres especiales de HTML para prevenir ataques XSS (Cross-Site Scripting).
 * Si el usuario escribe <script> en el título, esta función lo convierte en texto inofensivo.
 * @param {string} str - Cadena a limpiar
 * @returns {string} Cadena con caracteres especiales escapados
 */
function escapeHTML(str) {
  if (!str) return ''
  return str
    .replace(/&/g,  '&amp;')   // & → &amp;
    .replace(/</g,  '&lt;')    // < → &lt;
    .replace(/>/g,  '&gt;')    // > → &gt;
    .replace(/"/g,  '&quot;')  // " → &quot;
    .replace(/'/g,  '&#39;')   // ' → &#39;
}

/**
 * Escapa comillas simples y dobles en cadenas que se insertan dentro de atributos HTML
 * (como el onclick="openDeleteModal(id, 'título')").
 * Esto evita que las comillas del título rompan la sintaxis del atributo.
 * @param {string} str - Cadena a escapar
 * @returns {string} Cadena con comillas escapadas con backslash
 */
function escapeAttr(str) {
  if (!str) return ''
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"')
}

/**
 * Convierte el identificador interno de estado en una etiqueta legible para el usuario.
 * @param {string} status - Estado interno: 'todo', 'doing' o 'done'
 * @returns {string} Etiqueta legible: 'To Do', 'Doing' o 'Done'
 */
function statusLabel(status) {
  return { todo: 'To Do', doing: 'Doing', done: 'Done' }[status] || status
}
