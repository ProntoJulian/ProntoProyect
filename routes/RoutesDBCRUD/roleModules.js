const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {insertIntoTableMultiple,
    updateTableMultiple,
    fetchDataFromTable,
    deleteFromTableMultiple,
    fetchOneFromTableMultiple,
    fetchAllFromTableByRoleId} = require("../../databases/CRUD");

const routerRoleModules = express.Router();

routerRoleModules.get("/roleModules/getRoleModules", /*authenticateToken,*/ async (req, res) => {
    try {
        const roleModules = await fetchDataFromTable('role_modules');
        res.status(200).json(roleModules);
    } catch (error) {
        console.error('Error al obtener los role_modules:', error);
        res.status(500).json({ message: "Error al obtener los role_modules" });
    }
});

routerRoleModules.post("/roleModules/createRoleModule", /*authenticateToken,*/ async (req, res) => {
    const roleModuleData = req.body;
    const columns = [
        'module_id',
        'role_id', 
        'access_type'
    ]; // Ajusta según sea necesario

    console.log("Datos enviados: ", roleModuleData);

    try {
        const result = await insertIntoTableMultiple('role_modules', roleModuleData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Role-Module creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el Role-Module" });
        }
    } catch (error) {
        console.error('Error al insertar Role-Module:', error);
        res.status(500).json({ message: "Error al crear el Role-Module" });
    }
});

routerRoleModules.put("/roleModules/updateRoleModule/:roleId/:moduleId", /*authenticateToken,*/ async (req, res) => {
    const { roleId, moduleId } = req.params;
    console.log('Received roleId:', roleId, 'moduleId:', moduleId); // Registro del roleId y moduleId recibidos
    const updateData = req.body;

    try {
        const result = await updateTableMultiple('role_modules', updateData, ['role_id', 'module_id'], [roleId, moduleId]);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Role-Module actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Role-Module no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar Role-Module:', error);
        res.status(500).json({ message: "Error al actualizar el Role-Module" });
    }
});

routerRoleModules.delete("/roleModules/deleteRoleModule/:roleId/:moduleId", /*authenticateToken,*/ async (req, res) => {
    const { roleId, moduleId } = req.params;
    try {
        const result = await deleteFromTableMultiple('role_modules', ['role_id', 'module_id'], [roleId, moduleId]);
        if (result.affectedRows > 0) {
            res.send({ message: "Role-Module eliminado con éxito" });
        } else {
            res.status(404).json({ message: "Role-Module no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar Role-Module:', error);
        res.status(500).json({ message: "Error al eliminar el Role-Module" });
    }
});

routerRoleModules.get("/roleModules/getRoleModule/:roleId/:moduleId", /*authenticateToken,*/ async (req, res) => {
    const { roleId, moduleId } = req.params;
    try {
        const roleModule = await fetchOneFromTableMultiple('role_modules', ['role_id', 'module_id'], [roleId, moduleId]);
        if (roleModule) {
            res.status(200).json(roleModule);
        } else {
            res.status(404).json({ message: "Role-Module no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el Role-Module:', error);
        res.status(500).json({ message: "Error al obtener el Role-Module" });
    }
});

routerRoleModules.get("/roleModules/getRoleModuleByID/:roleId", /*authenticateToken,*/ async (req, res) => {
    const { roleId } = req.params;
    try {
        const roleModule = await fetchAllFromTableByRoleId(roleId);
        if (roleModule) {
            res.status(200).json(roleModule);
        } else {
            res.status(404).json({ message: "Role-Module no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el Role-Module:', error);
        res.status(500).json({ message: "Error al obtener el Role-Module" });
    }
});

module.exports = routerRoleModules;
