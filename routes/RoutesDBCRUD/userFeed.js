const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
} = require("../../databases/CRUD");
const routerUserFeeds = express.Router();

// Obtener todas las relaciones User-Feed
routerUserFeeds.get("/userFeeds/getUserFeeds", authenticateToken, async (req, res) => {
    try {
        const userFeeds = await fetchDataFromTable('user_feeds');
        res.status(200).json(userFeeds);
    } catch (error) {
        console.error('Error al obtener user_feeds:', error);
        res.status(500).json({ message: "Error al obtener las asignaciones de usuario-feed" });
    }
});

// Crear una nueva relación User-Feed
routerUserFeeds.post("/userFeeds/createUserFeed", authenticateToken, async (req, res) => {
    const userFeedData = req.body;
    const columns = ['user_id', 'feed_id']; // Especificar los nombres de columna
    try {
        const result = await insertIntoTable('user_feeds', userFeedData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Asignación de usuario-feed creada con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar la asignación de usuario-feed" });
        }
    } catch (error) {
        console.error('Error al insertar user_feed:', error);
        res.status(500).json({ message: "Error al crear la asignación de usuario-feed" });
    }
});

/*
// Actualizar una relación User-Feed
routerUserFeeds.put("/userFeeds/updateUserFeed/:id", async (req, res) => {
    const { id } = req.params; // Suponiendo que hay un identificador único, si no, ajustar según la lógica de identificación.
    const updateData = req.body;
    try {
        const result = await updateTable('user_feeds', updateData, 'id', id); // Asegúrate de que el ID y el nombre de la columna sean correctos
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Asignación de usuario-feed actualizada con éxito" });
        } else {
            res.status(404).json({ message: "Asignación de usuario-feed no encontrada" });
        }
    } catch (error) {
        console.error('Error al actualizar user_feed:', error);
        res.status(500).json({ message: "Error al actualizar la asignación de usuario-feed" });
    }
});
*/

// Eliminar una relación User-Feed
routerUserFeeds.delete("/userFeeds/deleteUserFeed/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await deleteFromTable('user_feeds', 'user_id', id); // Asegúrate de que el ID y el nombre de la columna sean correctos
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Asignación de usuario-feed eliminada con éxito" });
        } else {
            res.status(404).json({ message: "Asignación de usuario-feed no encontrada" });
        }
    } catch (error) {
        console.error('Error al eliminar user_feed:', error);
        res.status(500).json({ message: "Error al eliminar la asignación de usuario-feed" });
    }
});

// Obtener una relación User-Feed específica
routerUserFeeds.get("/userFeeds/getUserFeed/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const userFeed = await fetchOneFromTable('user_feeds', id, 'user_id'); // Asegúrate de que el ID y el nombre de la columna sean correctos
        if (userFeed) {
            res.status(200).json(userFeed);
        } else {
            res.status(404).json({ message: "Asignación de usuario-feed no encontrada" });
        }
    } catch (error) {
        console.error('Error al obtener la asignación de usuario-feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener la asignación de usuario-feed" });
    }
});

module.exports = routerUserFeeds;
