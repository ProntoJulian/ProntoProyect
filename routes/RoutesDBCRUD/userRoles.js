const { insertIntoTableMultiple,
    updateTableMultiple,
    fetchDataFromTable,
    deleteFromTableMultiple,
    fetchOneFromTableMultiple,
    fetchAllFromTableUserRolByUserId } = require("../../databases/CRUD");

const express = require("express");
const routerUserRoles = express.Router();

routerUserRoles.get("/userRoles/getUserRoles", /*authenticateToken,*/ async (req, res) => {
    try {
        const userCompany = await fetchDataFromTable('user_roles');
        res.status(200).json(userCompany);
    } catch (error) {
        console.error('Error al obtener los users companies:', error);
        res.status(500).json({ message: "Error al obtener los user_roles" });
    }
});

routerUserRoles.post("/userRoles/createUserRol", /*authenticateToken,*/ async (req, res) => {
    const userRolData = [req.body];
    const columns = ['user_id', 'role_id'];

    console.log("Datos enviados: ", userRolData);

    try {
        let totalAffectedRows = 0;

        for (const userCompany of userRolData) {
            const result = await insertIntoTableMultiple('user_roles', userCompany, columns);
            totalAffectedRows += result.affectedRows;
        }

        if (totalAffectedRows > 0) {
            res.status(201).json({ message: "User Rol creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el User Rol" });
        }
    } catch (error) {
        console.error('Error al insertar User-Rol:', error);
        res.status(500).json({ message: "Error al crear el User-Rol" });
    }
});


routerUserRoles.put("/userRoles/updateUserRol/:userId/:rolId", /*authenticateToken,*/ async (req, res) => {
    const { userId, rolId } = req.params;
    console.log('Received userId:', userId, 'rolId:', rolId); // Registro del roleId y moduleId recibidos
    const updateData = req.body;

    try {
        const result = await updateTableMultiple('user_roles', updateData, ['user_id', 'role_id'], [userId, rolId]);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "User-rol actualizado con éxito" });
        } else {
            res.status(404).json({ message: "User-rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar User-rol:', error);
        res.status(500).json({ message: "Error al actualizar el User-rol" });
    }
});


routerUserRoles.delete("/userRoles/deleteUserRol/:userId/:rolId", /*authenticateToken,*/ async (req, res) => {
    const { userId, rolId } = req.params;
    try {
        const result = await deleteFromTableMultiple('user_roles', ['user_id', 'role_id'], [userId, rolId]);
        if (result.affectedRows > 0) {
            res.send({ message: "User-role eliminado con éxito" });
        } else {
            res.status(404).json({ message: "User-role no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar User-role:', error);
        res.status(500).json({ message: "Error al eliminar el User-role" });
    }
});

routerUserRoles.get("/userCompanies/getUserCompanyByID/:userId", /*authenticateToken,*/ async (req, res) => {
    const { userId } = req.params;
    try {
        const roleModule = await fetchAllFromTableUserRolByUserId(userId);
        if (roleModule) {
            res.status(200).json(roleModule);
        } else {
            res.status(404).json({ message: "User-Company no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el User-Company:', error);
        res.status(500).json({ message: "Error al obtener el User-Company" });
    }
});

module.exports = routerUserRoles;