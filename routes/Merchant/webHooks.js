const express = require("express");
const routerWebHooks = express.Router();

const { fetchWebHooks, createWebhookToUpdateProduct, deleteWebhook, activateAllWebHooks } = require("../../api/webHooksBigCommerceApi");
const { findProductByBigCommerceId,
    getProductInfoGoogleMerchant,
    updateGoogleMerchantProduct,
    deleteGoogleMerchantProduct,
    insertProductToGoogleMerchant,
    initializeGoogleAuth } = require("../../api/googleMerchantAPI");

const { fetchOneFromTable } = require("../../databases/CRUD");

const { transformProduct } = require("../../helpers/helpers")

const { fetchProductById, checkCustomField, getConfig } = require("../../api/productsBigCommerceApi");
const { getConfigCategories } = require("../../api/categoriesBigCommerceApi");
const { getConfigImages } = require("../../api/imagesBigCommerceApi");

routerWebHooks.get("/webhooks/fetchWebHooks", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const totalWebHooks = await fetchWebHooks();
    //console.log("WebHooks: ", totalWebHooks);
})

routerWebHooks.get("/webhooks/activateAllWebHooks", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const totalWebHooks = await activateAllWebHooks();
    //console.log("WebHooks: ", totalWebHooks);
});

routerWebHooks.get("/webhooks/createWebhookToUpdateProduct", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const idProducto = 87345;
    const totalWebHooks = await createWebhookToUpdateProduct(idProducto);
    console.log("WebHook Creado para: ", idProducto);
})

routerWebHooks.get("/webhooks/createWebhookToDeleteProduct", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const totalWebHooks = await createWebhookToDeleteProduct();
})



routerWebHooks.post("/updatedProduct/:feedID", async (req, res) => {
    const { feedID } = req.params;
    const feed = await fetchOneFromTable('feeds', feedID, 'feed_id');

    console.log("Feed: ", feed)
    console.log("feedID: ", feedID)

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


    console.clear();
    const productData = req.body;
    const productId = productData.data.id;

    console.log(`ID del Producto: `, productId);

    // Obtener información del producto de BigCommerce.
    const infoProductBigCommerce = await fetchProductById(config, productId);
    if (!infoProductBigCommerce) {
        console.log("Producto no encontrado en BigCommerce.");
        return res.status(404).send("Producto no encontrado en BigCommerce.");
    }

    const hasImage = await checkCustomField(config, productId);
    console.log("¿El producto tiene imagen correcta?: ", hasImage)
    if (hasImage) {
        console.log("El producto tiene imagen adecuada.");
    }

    try {
        const infoProductGoogle = await getProductInfoGoogleMerchant(config, infoProductBigCommerce.sku);
        if (infoProductBigCommerce.price === 0 || !infoProductBigCommerce.is_visible || infoProductBigCommerce.availability === "disabled" || !hasImage) {
            console.log(`El producto ${productId} no está activo o su precio es 0, procediendo a eliminar en Google Merchant.`);
            await deleteGoogleMerchantProduct(config, infoProductGoogle.id);
            console.log("Producto eliminado en Google Merchant.");
            return res.status(200).send("Producto inactivo o a precio cero, no se requiere acción adicional en Google Merchant.");
        } else {
            console.log(`Actualizando el producto ${productId} en Google Merchant.`);
            await updateGoogleMerchantProduct(config, infoProductGoogle.id, infoProductBigCommerce);
            console.log("Producto actualizado en Google Merchant.");
            return res.status(200).send("Producto actualizado en Google Merchant.");
        }
    } catch (error) {
        console.log(`Producto no encontrado en Google Merchant, intentando crear.`);
        if (infoProductBigCommerce.price !== 0 && infoProductBigCommerce.is_visible && hasImage && infoProductBigCommerce.availability !== "disabled") {
            const transformedProduct = await transformProduct(config, infoProductBigCommerce);
            await insertProductToGoogleMerchant(config, transformedProduct);
            console.log("Producto creado en Google Merchant.");
        } else {
            console.log("Producto no cumple con las condiciones para ser creado en Google Merchant.");
        }

    }
});


routerWebHooks.post("/createdProduct/:feedID", async (req, res) => {
    const { feedID } = req.params;
    const feed = await fetchOneFromTable('feeds', feedID, 'feed_id');

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

    try {
        const productData = req.body;
        const idProduct = productData.data.id;

        console.log(`El producto creado: ${JSON.stringify(productData, null, 2)}`);
        console.log(`ID del Producto: `, idProduct);

        const hasImage = await checkCustomField(config, idProduct);

        if (hasImage) {
            const product = await fetchProductById(config, idProduct);
            const transformedProducto = await transformProduct(config, product);
            const response = await insertProductToGoogleMerchant(config, transformedProducto);

            console.log("Producto insertado en Google Merchant con éxito: ");
            res.status(200).send("Producto creado y sincronizado correctamente con Google Merchant.");
        }

    } catch (error) {
        console.error("Error al crear y sincronizar el producto con Google Merchant: ", error);
        res.status(500).send("Error al procesar la solicitud de creación de producto");
    }
});


routerWebHooks.post("/deletedProduct", async (req, res) => {
    try {
        const productData = req.body;
        const idProduct = productData.data.id;

        console.log(`El producto eliminado: ${JSON.stringify(productData, null, 2)}`);
        console.log(`ID del Producto: `, idProduct);

        const infoProductGoogle = await findProductByBigCommerceId(idProduct);
        const idGoogleProduct = infoProductGoogle.id;

        await deleteGoogleMerchantProduct(idGoogleProduct);
        res.status(200).send("Producto eliminado y sincronizado correctamente en Google Merchant.");
    } catch (error) {
        console.error("Error al procesar la eliminación del producto: ", error);
    }
});

routerWebHooks.get("/webhooks/deleteWebhook", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const idWebHook = 28127186;
    const totalWebHooks = await deleteWebhook(idWebHook);
    //console.log("WebHooks: ", totalWebHooks);
})

const { CloudSchedulerClient } = require('@google-cloud/scheduler');
const client = new CloudSchedulerClient();

routerWebHooks.get('/createCronJob', async (req, res) => {
    const projectId = 'sincere-stack-421919'; // Reemplaza con tu ID de proyecto
    const locationId = 'us-central1'; // Ejemplo: 'us-central1'
    const url = 'https://pronto-proyect-4gzkueldfa-uc.a.run.app/createCronJob';
    const jobName = `projects/${projectId}/locations/${locationId}/jobs/your-job-id`;

    // Define el trabajo
    const job = {
        name: jobName,
        httpTarget: {
            uri: url,
            httpMethod: 'GET',
        },
        schedule: '* * * * *', // Frecuencia en formato cron (cada minuto en este ejemplo)
        timeZone: 'America/Los_Angeles', // Ajusta según tu zona horaria
    };

    try {
        // Crea el trabajo
        const [response] = await client.createJob({
            parent: `projects/${projectId}/locations/${locationId}`,
            job: job,
        });
        res.status(200).send(`Trabajo creado: ${response.name}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear el trabajo de cron');
    }
});

routerWebHooks.get('/runCronTask', (req, res) => {
    console.log('Hola mundo');
    res.send('Hola mundo, funciona el cron correctamente');
});

const pm2 = require('pm2');

routerWebHooks.get('/pm2Cron', (req, res) => {
    const cronPattern = '* * * * *';  // Cada minuto (puedes ajustar el patrón cron según tus necesidades)
    //const scriptPath = require("./cron-task")
    const scriptPath = './cron-task.js';


    pm2.connect((err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al conectar con PM2');
            return;
        }

        pm2.start({
            script: scriptPath,
            name: 'cron-task',
            cron: cronPattern,
            autorestart: false
        }, (err, apps) => {
            pm2.disconnect();  // Desconecta PM2
            if (err) {
                console.error(err);
                res.status(500).send('Error al crear el trabajo cron');
                return;
            }

            res.status(200).send('Trabajo cron creado exitosamente');
        });
    });
});

module.exports = routerWebHooks;