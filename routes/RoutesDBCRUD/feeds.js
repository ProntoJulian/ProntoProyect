const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {encrypt,decrypt} = require("../../helpers/helpers");
const {insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable} = require("../../databases/CRUD");
const {createWebhookToCreateProduct, createWebhookToUpdateProduct} = require("../../api/webHooksBigCommerceApi")
const {getProductInfoGoogleMerchant} = require("../../api/googleMerchantAPI")
const routerFeeds = express.Router();


routerFeeds.get("/feeds/getFeeds", authenticateToken, async (req, res) => {
    try {
        const feeds = await fetchDataFromTable('feeds');
        res.status(200).json(feeds);
    } catch (error) {
        console.error('Error al obtener feeds:', error);
        res.status(500).json({ message: "Error al obtener los feeds" });
    }
});


routerFeeds.post("/feeds/createFeed", authenticateToken, async (req, res) => {
    const feedData = req.body;
    const columns = [
        'feed_name', 
        'store_hash', 
        'x_auth_token', 
        'client_id', 
        'client_secret', 
        'formulas', 
        'company_id',
        'client_email', 
        'private_key',
        'active_products_gm', 
        'total_products_bc', 
        'preorder_products'
    ]; // Ajusta según sea necesario

    feedData.active_products_gm = feedData.active_products_gm || 0;
    feedData.total_products_bc = feedData.total_products_bc || 0;
    feedData.preorder_products = feedData.preorder_products || 0;

    try {
        // Encriptar la private_key antes de insertar
        /*
        const encryptedKey = encrypt(feedData.private_key);
        console.log("Encrypted Key: ", encryptedKey); // Verificar el valor cifrado antes de almacenar
        feedData.private_key = JSON.stringify(encryptedKey);
        */

        const result = await insertIntoTable('feeds', feedData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Feed creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el feed" });
        }
    } catch (error) {
        console.error('Error al insertar feed:', error);
        res.status(500).json({ message: "Error al crear el feed" });
    }
});




routerFeeds.get("/feeds/updateFeed/:feedId", authenticateToken, async (req, res) => {
    const companies = await fetchDataFromTable('companies');
    const { feedId } = req.params;
    const updateData = req.body;

    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
        if (feed) {
            res.render("pages/editFeeds",{feed:[feed], companies:companies});
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });
    }
});

routerFeeds.get("/feeds/createFeed", authenticateToken, async (req, res) => {

    try {
        const companies = await fetchDataFromTable('companies');
        res.render("pages/createFeed", {companies: companies });
    } catch (error) {
        console.error('Error al obtener compañías:', error);
        res.status(500).json({ message: "Error al obtener las compañías" });
    }
    
});

routerFeeds.put("/feeds/update/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;
    console.log('Received feedId:', feedId); // Registro del feedId recibido
    const updateData = req.body;

    const lastUpdate = new Date(updateData.last_update);
    const formattedLastUpdate = lastUpdate.toISOString().replace('T', ' ').substring(0, 19);
    updateData.last_update = formattedLastUpdate;

    try {
        // Encriptar la private_key antes de actualizar
        /*
        if (updateData.private_key) {
            const encryptedKey = encrypt(updateData.private_key);
            console.log("Encrypted Key: ", encryptedKey); // Verificar el valor cifrado antes de almacenar
            updateData.private_key = JSON.stringify(encryptedKey);

        }
*/
        const result = await updateTable('feeds', updateData, 'feed_id', feedId);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Feed actualizado con éxito" });
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar feed:', error);
        res.status(500).json({ message: "Error al actualizar el feed" });
    }
});

routerFeeds.delete("/feeds/deleteFeed/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;
    try {
        const result = await deleteFromTable('feeds', 'feed_id', feedId);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Feed eliminado con éxito" });
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar feed:', error);
        res.status(500).json({ message: "Error al eliminar el feed" });
    }
});



routerFeeds.get("/feeds/getFeed/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;
    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
        if (feed) {
            res.status(200).json(feed);
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });
    }
});

routerFeeds.get("/feeds/synchronize/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;
    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
        if (feed) {
            const storeHash = feed.store_hash;
            const accessToken = feed.x_auth_token;

            console.log("Store Hash: ", storeHash)
            console.log("Access Token: ", accessToken)
            
            // Agregar una demora de 15 segundos
            setTimeout(async () => {
                //await createWebhookToUpdateProduct(storeHash, accessToken);
                //await createWebhookToCreateProduct(storeHash, accessToken);
                const privateKey = feed.private_key //decrypt(JSON.parse(feed.private_key));
                const merchantId = feed.client_id

                console.log("Cliente Email: ", feed.client_email)
                console.log("merchantId: ", merchantId)
                console.log("privateKey: ", privateKey)

                const respuesta = await getProductInfoGoogleMerchant(feed.client_email,privateKey,merchantId,"127-3804");

                console.log("Respuesta: ", respuesta);

                
            }, 15000); // 15000 ms = 15 segundos
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });
    }
});


module.exports = routerFeeds;

