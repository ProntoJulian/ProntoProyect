const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable} = require("../../databases/CRUD");
const routerUsers = express.Router();

routerUsers.get("/users/getUsers", authenticateToken, async (req, res) => {
    try {
        const users = await fetchDataFromTable('users');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: "Error al obtener los usuarios" });
    }
});

routerUsers.post("/users/createUser", authenticateToken, async (req, res) => {
    const userData = req.body;
    const columns = ['company_id', 'username', 'password_hash', 'role_id']; // Asegúrate de que estos campos están presentes en userData
    try {
        const result = await insertIntoTable('users', userData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Usuario creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el usuario" });
        }
    } catch (error) {
        console.error('Error al insertar usuario:', error);
        res.status(500).json({ message: "Error al crear el usuario" });
    }
});


routerUsers.put("/users/updateUser/:userId", authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { username, password, newPassword, companyId, roleId } = req.body;

    try {
        // Obtener el usuario actual de la base de datos
        const user = await fetchOneFromTable('users', userId, 'user_id');
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Verificar la contraseña actual
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Contraseña actual incorrecta" });
        }

        // Preparar los datos para la actualización
        const updateData = {
            username,
            company_id: companyId,
            role_id: roleId
        };

        // Si se proporciona una nueva contraseña, encriptarla
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(newPassword, salt);
        }

        // Actualizar el usuario en la base de datos
        const result = await updateTable('users', updateData, 'user_id', userId);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Usuario actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ message: "Error al actualizar el usuario" });
    }
});



routerUsers.delete("/users/deleteUser/:userId", authenticateToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await deleteFromTable('users', 'user_id', userId);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Usuario eliminado con éxito" });
        } else {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: "Error al eliminar el usuario" });
    }
});


routerUsers.get("/users/getUser/:userId", authenticateToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await fetchOneFromTable('users', userId,idColumnName = 'user_id');
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el usuario" });
    }
});

module.exports = routerUsers;

