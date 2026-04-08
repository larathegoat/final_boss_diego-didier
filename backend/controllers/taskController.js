//recibe peticiones del frontend

// Importamos el service para que haga el trabajo
const taskService = require('../services/taskService')

// Devuelve todas las tareas → GET /tasks
function getAll(req, res) {
    try {
        const tasks = taskService.getAllTasks()
        res.json(tasks)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Crea una nueva tarea → POST /tasks
function create(req, res) {
    try {
        // Extraemos título y descripción del cuerpo de la petición
        const { title, description } = req.body
        const task = taskService.createTask(title, description)
        res.status(201).json(task)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

// Actualiza el estado de una tarea → PUT /tasks/:id
function updateStatus(req, res) {
    try {
        // El id viene en la URL y el status en el cuerpo
        const { id } = req.params
        const { status } = req.body
        const task = taskService.updateTaskStatus(id, status)
        res.json(task)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

// Elimina una tarea → DELETE /tasks/:id
function remove(req, res) {
    try {
        const { id } = req.params
        taskService.deleteTask(id)
        res.json({ message: 'Tarea eliminada correctamente' })
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

// Exportamos las funciones
module.exports = { getAll, create, updateStatus, remove }