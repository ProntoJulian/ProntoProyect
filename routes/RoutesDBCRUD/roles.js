const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable} = require("../../databases/CRUD");
const routerRoles = express.Router();


routerRoles.get("/roles/getRoles", authenticateToken, async (req, res) => {
    try {
        const roles = await fetchDataFromTable('roles');
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ message: "Error al obtener los roles" });
    }
});


routerRoles.post("/roles/createRole", authenticateToken, async (req, res) => {
    const { roleName } = req.body;
    const columns = ['role_name'];  // Columnas específicas para la tabla roles
    if (!roleName || roleName == '') {
        res.render("app/roles", {error_msg: 'El nombre es requerido'});
        
    }
    try {
        const result = await insertIntoTable('roles', { role_name: roleName }, columns);
        if (result.affectedRows > 0) {
            res.render("app/roles", { success_msg: "Rol creado con éxito" });
        } else {
            res.render("app/roles", { error_msg: 'Hubo un error al crear el rol' });
        }
    } catch (error) {
        res.render("app/roles", { error_msg: 'Hubo un error al insertar el rol' });
    }
});


routerRoles.delete("/roles/deleteRole/:roleId", authenticateToken, async (req, res) => {
    const { roleId } = req.params;
    try {
        const result = await deleteFromTable('roles', 'role_id', roleId);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Rol eliminado con éxito" });
        } else {
            res.status(404).json({ message: "Rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        res.status(500).json({ message: "Error al eliminar el rol" });
    }
});


routerRoles.put("/roles/updateRole/:roleId", authenticateToken, async (req, res) => {
    const { roleId } = req.params;
    const { newName } = req.body;
    if (!newName) {
        return res.status(400).json({ message: "El nuevo nombre del rol es requerido" });
    }
    try {
        const result = await updateTable('roles', { role_name: newName }, 'role_id', roleId);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Rol actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ message: "Error al actualizar el rol" });
    }
});


routerRoles.get("/roles/getRole/:roleId", authenticateToken, async (req, res) => {
    const { roleId } = req.params;
    try {
        const role = await fetchOneFromTable('roles', roleId, 'role_id');
        if (role) {
            res.status(200).json(role);
        } else {
            res.status(404).json({ message: "Rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el rol:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el rol" });
    }
});


module.exports = routerRoles;