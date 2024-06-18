const express = require("express");
const { authenticateToken } = require("../../middleware/index");
const { encrypt, decrypt, logMemoryUsage, createSimpleCron, createCronJob } = require("../../helpers/helpers");
const { insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable, updateFeed } = require("../../databases/CRUD");
const { createWebhookToCreateProduct, createWebhookToUpdateProduct, fetchWebHooks } = require("../../api/webHooksBigCommerceApi")
const { getProductInfoGoogleMerchant, initializeGoogleAuth, listAllProducts, getInfoOfAllProducts, createExcel } = require("../../api/googleMerchantAPI")
const routerFeeds = express.Router();

const { countPages, countProductsByAvailability, manageProductProcessing, getConfig, countTotalProducts } = require("../../api/productsBigCommerceApi")
const { getConfigCategories } = require("../../api/categoriesBigCommerceApi");
const { getConfigImages } = require("../../api/imagesBigCommerceApi");

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
        'formulas',
        'company_id',
        'client_email',
        'private_key',
        'domain',
        'selectedDays',
        'intervalHour',
        'isActive',
        'active_products_gm',
        'total_products_bc',
        'preorder_products',
    ]; // Ajusta según sea necesario



    const intervalUnit = feedData.recurrence ? parseInt(feedData.recurrence.intervalUnit, 10) : undefined;
    const selectedDaysArray = feedData.recurrence ? feedData.recurrence.selectedDays : undefined;
    const selectedDays = selectedDaysArray ? selectedDaysArray.join(';') : undefined; // Convertir la lista en un string

    console.log("Datos: ----------------", intervalUnit, selectedDays);

    feedData.selectedDays = selectedDays;
    feedData.intervalHour = intervalUnit;
    feedData.isActive = feedData.recurrence ? Boolean(feedData.recurrence.isActive) : false;

    feedData.active_products_gm = feedData.active_products_gm || 0;
    feedData.total_products_bc = feedData.total_products_bc || 0;
    feedData.preorder_products = feedData.preorder_products || 0;

    // Console.log para mostrar la información recibida
    console.log('Feed Data Recibida:', feedData);

    try {
        delete feedData.recurrence;
        const result = await insertIntoTable('feeds', feedData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Feed created successfully" });
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
            res.render("pages/editFeeds", { feed: [feed], companies: companies });
        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });
    }
});

routerFeeds.get("/app/feeds/createFeed", authenticateToken, async (req, res) => {

    console.log("Funciona?")

    try {
        const companies = await fetchDataFromTable('companies');
        res.render("pages/createFeed", { companies: companies });
    } catch (error) {
        console.error('Error al obtener compañías:', error);
        res.status(500).json({ message: "Error al obtener las compañías" });
    }

});

routerFeeds.put("/feeds/update/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;
    console.log('Received feedId:', feedId); // Registro del feedId recibido
    const updateData = req.body;

    const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
    

    const lastUpdate = new Date(updateData.last_update);
    const formattedLastUpdate = lastUpdate.toISOString().replace('T', ' ').substring(0, 19);
    updateData.last_update = formattedLastUpdate;

    const storeHash = feed.store_hash;
    const accessToken = feed.x_auth_token;
    const privateKey = feed.private_key;
    const merchantId = feed.client_id;

    const config = {
        accessToken: accessToken,
        storeHash: storeHash,
        client_email: feed.client_email,
        private_key: privateKey,
        merchantId: merchantId,
        domain: feed.domain
    };

    console.log("Config: ",config)

    

    await getConfig(config);
    await initializeGoogleAuth(config);

    try {

        const merchantId = feed.client_id;
        /*
        const [totalProductsGM, totalProductsBC, preorderProducts] = await Promise.all([
            listAllProducts(merchantId),
            countTotalProducts(),
            countProductsByAvailability("preorder")
        ]);
        
        updateData.total_products_bc = totalProductsBC;
        updateData.active_products_gm = totalProductsGM;
        updateData.preorder_products = preorderProducts;
        */
        /*
            Configuración temporal

        */
        updateData.selectedDays = "";
        updateData.intervalHour = 1;
        updateData.isActive = updateData.recurrence ? Boolean(updateData.recurrence.isActive) : false;

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
            const privateKey = feed.private_key; // decrypt(JSON.parse(feed.private_key));
            const merchantId = feed.client_id;
            
            console.log("Store Hash: ", storeHash);
            console.log("Access Token: ", accessToken);

            const config = {
                accessToken: accessToken,
                storeHash: storeHash,
                client_email: feed.client_email,
                private_key: privateKey,
                merchantId: merchantId,
                domain: feed.domain
            };



            // Ejecutar las operaciones asíncronas en segundo plano
            setImmediate(async () => {
                try {
                    const conteoPages = await countPages(config);
                    const conteoByTipo = await manageProductProcessing(config, conteoPages);

                    console.log("Conteo: ", conteoPages);

                    const WebHooks = await fetchWebHooks(config);

                    if (WebHooks.data.length == 0) {
                        await createWebhookToCreateProduct(config, feedId);
                        await createWebhookToUpdateProduct(config, feedId);
                    }

                    // Ejecutar las operaciones de conteo en paralelo
                    const [totalProductsGM, totalProductsBC, preorderProducts] = await Promise.all([
                        listAllProducts(config),
                        countTotalProducts(config),
                        countProductsByAvailability(config, "preorder")
                    ]);

                    const updateData = {
                        total_products_bc: totalProductsBC,
                        active_products_gm: totalProductsGM,
                        preorder_products: preorderProducts
                    };

                    /*await createCronJob(feedId,configCron);*/

                    await updateFeed(feedId, updateData);

                    // Responder inmediatamente al cliente
                    res.status(200).json({ message: "Sincronización completada y feed actualizado" });
                } catch (error) {
                    console.error('Error durante la sincronización en segundo plano:', error);
                    // Manejo de errores adicional si es necesario
                    res.status(404).json({ message: "Hubo un error en la sincronización, verifique los datos ingresados" });
                }
            });

        } else {
            res.status(404).json({ message: "Feed no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });

    }
});

routerFeeds.get("/feeds/createJobs/:feedId", /*authenticateToken,*/ async (req, res) => {
    const { feedId } = req.params;
    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');

        const storeHash = feed.store_hash;
            const accessToken = feed.x_auth_token;
            const privateKey = feed.private_key; // decrypt(JSON.parse(feed.private_key));
            const merchantId = feed.client_id;

        const config = {
            accessToken: accessToken,
            storeHash: storeHash,
            client_email: feed.client_email,
            private_key: privateKey,
            merchantId: merchantId,
            domain: feed.domain
        };
    
        const configCron = {
            selectedDays: feed.selectedDays,
            intervalHour: feed.intervalHour,
            isActive: feed.isActive
        }
    
        await createCronJob(feedId, configCron);

        res.status(200).json({ message: "Se ha creado el cron" });
    } catch (error) {
        console.error('Error al obtener el feed:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener el feed" });

    }
});


routerFeeds.get("/feeds/downloadFeed/:feedId", authenticateToken, async (req, res) => {
    const { feedId } = req.params;

    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
        const storeHash = feed.store_hash;
        const accessToken = feed.x_auth_token;
        const privateKey = feed.private_key;
        const merchantId = feed.client_id;

        const config = {
            accessToken: accessToken,
            storeHash: storeHash,
            client_email: feed.client_email,
            private_key: privateKey,
            merchantId: merchantId,
            domain: feed.domain
        };

        const products = await getInfoOfAllProducts(config);

        // Llama a la función createExcel y obtiene el buffer
        const buffer = createExcel(products, true);

        // Configura las cabeceras de la respuesta para la descarga
        res.setHeader('Content-Disposition', 'attachment; filename=Products.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Envía el buffer como una respuesta
        res.send(buffer);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error generating Excel file");
    }
});



module.exports = routerFeeds;

