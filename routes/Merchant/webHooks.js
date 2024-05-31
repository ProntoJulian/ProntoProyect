const express = require("express");
const routerWebHooks = express.Router();

const { fetchWebHooks, createWebhookToUpdateProduct, deleteWebhook, activateAllWebHooks } = require("../../api/webHooksBigCommerceApi");
const { findProductByBigCommerceId,
    getProductInfoGoogleMerchant,
    updateGoogleMerchantProduct,
    deleteGoogleMerchantProduct,
    insertProductToGoogleMerchant,
    initializeGoogleAuth } = require("../../api/googleMerchantAPI");

const {fetchOneFromTable } = require("../../databases/CRUD");

const { transformProduct } = require("../../helpers/helpers")

const { fetchProductById, checkCustomField,getConfig } = require("../../api/productsBigCommerceApi");

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
    const { feedId } = req.params;
    const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');

    const storeHash = feed.store_hash;
    const accessToken = feed.x_auth_token;
    const privateKey = feed.private_key;
    const merchantId = feed.client_id;

    await getConfig(accessToken, storeHash);
    await initializeGoogleAuth(feed.client_email, privateKey, merchantId);


    console.clear();
    const productData = req.body;
    const productId = productData.data.id;

    console.log(`El producto recibido: ${JSON.stringify(productData, null, 2)}`);
    console.log(`ID del Producto: `, productId);

    // Obtener información del producto de BigCommerce.
    const infoProductBigCommerce = await fetchProductById(productId);
    if (!infoProductBigCommerce) {
        console.log("Producto no encontrado en BigCommerce.");
        return res.status(404).send("Producto no encontrado en BigCommerce.");
    }

    const hasImage = await checkCustomField(productId);
    console.log("¿El producto tiene imagen correcta?: ", hasImage)
    if (hasImage) {
        console.log("El producto tiene imagen adecuada.");
    }

    try {
        const infoProductGoogle = await getProductInfoGoogleMerchant(infoProductBigCommerce.sku);
        if (infoProductBigCommerce.price === 0 || !infoProductBigCommerce.is_visible || infoProductBigCommerce.availability === "disabled" || !hasImage) {
            console.log(`El producto ${productId} no está activo o su precio es 0, procediendo a eliminar en Google Merchant.`);
            await deleteGoogleMerchantProduct(infoProductGoogle.id);
            console.log("Producto eliminado en Google Merchant.");
            return res.status(200).send("Producto inactivo o a precio cero, no se requiere acción adicional en Google Merchant.");
        } else {
            console.log(`Actualizando el producto ${productId} en Google Merchant.`);
            await updateGoogleMerchantProduct(infoProductGoogle.id, infoProductBigCommerce);
            console.log("Producto actualizado en Google Merchant.");
            return res.status(200).send("Producto actualizado en Google Merchant.");
        }
    } catch (error) {
        console.log(`Producto no encontrado en Google Merchant, intentando crear.`);
        if (infoProductBigCommerce.price !== 0 && infoProductBigCommerce.is_visible && hasImage && infoProductBigCommerce.availability !== "disabled") {
            const transformedProduct = await transformProduct(infoProductBigCommerce);
            await insertProductToGoogleMerchant(transformedProduct);
            console.log("Producto creado en Google Merchant.");
        } else {
            console.log("Producto no cumple con las condiciones para ser creado en Google Merchant.");
        }

    }
});


routerWebHooks.post("/createdProduct/:feedID", async (req, res) => {
    const { feedId } = req.params;
    const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');

    const storeHash = feed.store_hash;
    const accessToken = feed.x_auth_token;
    const privateKey = feed.private_key;
    const merchantId = feed.client_id;

    await getConfig(accessToken, storeHash);
    await initializeGoogleAuth(feed.client_email, privateKey, merchantId);
    /s
    try {
        const productData = req.body;
        const idProduct = productData.data.id;

        console.log(`El producto creado: ${JSON.stringify(productData, null, 2)}`);
        console.log(`ID del Producto: `, idProduct);

        const hasImage = await checkCustomField(idProduct);

        if (hasImage) {
            const product = await fetchProductById(idProduct);
            const transformedProducto = await transformProduct(product);
            const response = await insertProductToGoogleMerchant(transformedProducto);

            console.log("Producto insertado en Google Merchant con éxito: ", response);
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

module.exports = routerWebHooks;