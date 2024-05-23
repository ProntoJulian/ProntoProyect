const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable} = require("../../databases/CRUD");

const routerModules = express.Router();


routerModules.get("/modules/getModules", /*authenticateToken ,*/ async (req, res) => {
    try {
        const feeds = await fetchDataFromTable('modules');
        res.status(200).json(feeds);
    } catch (error) {
        console.error('Error al obtener los modules:', error);
        res.status(500).json({ message: "Error al obtener los modules" });
    }
});

routerModules.post("/modules/createModule", async (req, res) => {
    const moduleData = req.body;
    const columns = [
        'module_name', 
        'description'
    ]; // Ajusta según sea necesario

    console.log("Datos enviados: ", moduleData)

    try {
        const result = await insertIntoTable('modules', moduleData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Módulo creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el módulo" });
        }
    } catch (error) {
        console.error('Error al insertar módulo:', error);
        res.status(500).json({ message: "Error al crear el módulo" });
    }
});

routerModules.put("/modules/updateModule/:moduleId", async (req, res) => {
    const { moduleId } = req.params;
    console.log('Received moduleId:', moduleId); // Registro del moduleId recibido
    const updateData = req.body;

    try {
        const result = await updateTable('modules', updateData, 'module_id', moduleId);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Módulo actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Módulo no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar módulo:', error);
        res.status(500).json({ message: "Error al actualizar el módulo" });
    }
});

routerModules.delete("/modules/deleteModule/:moduleId", authenticateToken, async (req, res) => {
    const { moduleId } = req.params;
    try {
        const result = await deleteFromTable('modules', 'module_id', moduleId);
        if (result.affectedRows > 0) {
            res.send({ message: "Rol eliminado con éxito" });
        } else {
            res.status(404).json({ message: "Rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        res.status(500).json({ message: "Error al eliminar el rol" });
    }
});



module.exports = routerModules;