const express = require("express");
const {authenticateToken,superUsuarioPages} = require("../../middleware/index");
const {insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable} = require("../../databases/CRUD");
const routerRoles = express.Router();


routerRoles.get("/roles/getRoles", authenticateToken,superUsuarioPages, async (req, res) => {
    try {
        const roles = await fetchDataFromTable('roles');
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ message: "Error al obtener los roles" });
    }
});


routerRoles.post("/roles/createRole", authenticateToken, superUsuarioPages, async (req, res) => {
    const { roleName, companyId, permissions } = req.body;
    const columns = ['role_name', 'company_id'];  // Columnas específicas para la tabla roles

    if (!roleName || roleName === '') {
        return res.status(400).send({ message: 'El nombre es requerido' });
    }

    console.log("Role Name: ", roleName);
    console.log("Company ID: ", companyId);
    console.log("Permissions: ", permissions);

    try {
        const result = await insertIntoTable('roles', { role_name: roleName, company_id: companyId }, columns);
        if (result.affectedRows > 0) {
            const roleId = result.insertId;  // Obtener el ID del rol recién creado

            // Crear entradas en role_modules basadas en los permisos seleccionados
            for (const permission of permissions) {
                console.log(`Crear role_module para role_id: ${roleId}, module_id: ${permission.module}, access_type: ${permission.permission}`);
                await insertIntoTableMultiple('role_modules', { role_id: roleId, module_id: permission.module, access_type: permission.permission }, ['role_id', 'module_id', 'access_type']);
            }

            res.send({ message: "Rol creado con éxito" });
        } else {
            res.status(500).send({ message: 'Hubo un error al crear el rol' });
        }
    } catch (error) {
        console.error('Error al insertar el rol:', error);
        res.status(500).send({ message: 'Hubo un error al insertar el rol' });
    }
});





routerRoles.delete("/roles/deleteRole/:roleId", authenticateToken,superUsuarioPages, async (req, res) => {
    const { roleId } = req.params;
    try {
        const result = await deleteFromTable('roles', 'role_id', roleId);
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


routerRoles.put("/roles/updateRole/:roleId", authenticateToken, superUsuarioPages, async (req, res) => {
    const { roleId } = req.params;
    const { newName, companyId, permissions } = req.body;

    console.log("Rol: ", newName);
    console.log("Compañia: ", companyId);
    console.log("Permissions: ", permissions);

    if (!newName) {
        return res.status(400).json({ message: "El nuevo nombre del rol es requerido" });
    }
    try {
        const result = await updateTable('roles', { role_name: newName, company_id: companyId }, 'role_id', roleId);
        if (result.affectedRows > 0) {
            // Eliminar las entradas existentes en role_modules para este rol
            await deleteFromTableMultiple('role_modules', ['role_id'], [roleId]);

            // Insertar nuevas entradas en role_modules basadas en los permisos seleccionados
            for (const permission of permissions) {
                console.log(`Crear role_module para role_id: ${roleId}, module_id: ${permission.module}, access_type: ${permission.permission}`);
                await insertIntoTableMultiple('role_modules', { role_id: roleId, module_id: permission.module, access_type: permission.permission }, ['role_id', 'module_id', 'access_type']);
            }

            res.send({ message: "Rol actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Rol no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ message: "Error al actualizar el rol" });
    }
});



routerRoles.get("/roles/getRole/:roleId", authenticateToken,superUsuarioPages, async (req, res) => {
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