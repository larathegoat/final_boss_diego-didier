// Importamos 'fs' que es el módulo de Node para leer y escribir archivos
const fs = require('fs')

// Importamos 'path' para construir rutas de archivos de forma segura
const path = require('path')

// Definimos dónde está nuestro archivo JSON
const filePath = path.join(__dirname, '../data/tasks.json')

// Lee el archivo JSON y devuelve todas las tareas
function getAll() {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
}

// Recibe el arreglo completo de tareas y lo guarda en el archivo JSON
function saveAll(tasks) {
    fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2))
}

// Exportamos las funciones para que otros archivos puedan usarlas
module.exports = { getAll, saveAll }