// Importamos express para crear el servidor
const express = require('express')

// Importamos cors para permitir que el frontend se comunique con el backend
const cors = require('cors')

// Importamos el controller que maneja las tareas
const taskController = require('./controllers/taskController')

const app = express()

// Permitimos peticiones desde el frontend
app.use(cors())

// Le decimos a express que entienda JSON en las peticiones
app.use(express.json())

// Definimos las rutas y qué función del controller las maneja
app.get('/tasks', taskController.getAll)
app.post('/tasks', taskController.create)
app.put('/tasks/:id', taskController.updateStatus)
app.delete('/tasks/:id', taskController.remove)

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})