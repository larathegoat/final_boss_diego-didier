//logica de negocio (reglas)

// Importamos el repository para poder leer y guardar tareas
const taskRepository = require('../repository/taskRepository')

// Devuelve todas las tareas
function getAllTasks() {
    return taskRepository.getAll()
}

// Crea una nueva tarea y la guarda
function createTask(title, description) {

    // Validamos que el título no venga vacío
    if (!title || title.trim() === '') {
        throw new Error('El título es obligatorio')
    }

    // Obtenemos todas las tareas actuales
    const tasks = taskRepository.getAll()

    // Verificamos que no exista una tarea con el mismo título
    const duplicate = tasks.find(t => t.title.toLowerCase() === title.toLowerCase())
    if (duplicate) {
        throw new Error('Ya existe una tarea con ese título')
    }

    // Creamos el objeto de la nueva tarea
    const newTask = {
        id: Date.now(), // Usamos la fecha actual como ID único
        title: title.trim(),
        description: description ? description.trim() : '',
        status: 'todo' // Estado inicial siempre es To Do
    }

    // Agregamos la nueva tarea al arreglo y guardamos
    tasks.push(newTask)
    taskRepository.saveAll(tasks)

    return newTask
}

// Cambia el estado de una tarea
function updateTaskStatus(id, status) {

    // Validamos que el estado sea uno de los permitidos
    const validStatuses = ['todo', 'doing', 'done']
    if (!validStatuses.includes(status)) {
        throw new Error('Estado inválido. Usa: todo, doing o done')
    }

    // Buscamos la tarea por ID
    const tasks = taskRepository.getAll()
    const task = tasks.find(t => t.id === parseInt(id))

    if (!task) {
        throw new Error('Tarea no encontrada')
    }

    // Actualizamos el estado
    task.status = status
    taskRepository.saveAll(tasks)

    return task
}

// Elimina una tarea por ID
function deleteTask(id) {
    const tasks = taskRepository.getAll()

    // Filtramos todas las tareas excepto la que queremos eliminar
    const filtered = tasks.filter(t => t.id !== parseInt(id))

    if (filtered.length === tasks.length) {
        throw new Error('Tarea no encontrada')
    }

    taskRepository.saveAll(filtered)
}

// Exportamos todas las funciones
module.exports = { getAllTasks, createTask, updateTaskStatus, deleteTask }