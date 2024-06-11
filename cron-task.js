// cron-task.js


const { fetchOneFromTable, updateFeed } = require("./databases/CRUD");
const { createWebhookToCreateProduct, createWebhookToUpdateProduct, fetchWebHooks } = require("./api/webHooksBigCommerceApi")
const { listAllProducts } = require("./api/googleMerchantAPI")
const { countPages, countProductsByAvailability, manageProductProcessing, countTotalProducts } = require("./api/productsBigCommerceApi")

// Obtener el feedId de las variables de entorno
const args = process.argv.slice(2);
const feedId = args[0];

if (!feedId) {
    console.error('Error: FEED_ID no proporcionado');
    process.exit(1);
}

// Función principal de sincronización
async function synchronizeFeedCron(feedId) {

    console.log("El cron funciona correctamente y el Feed id es: ", feedId)

    try {
        const feed = await fetchOneFromTable('feeds', feedId, 'feed_id');
        if (feed) {
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

            console.log("Config: ", config);

            // Ejecutar las operaciones asíncronas en segundo plano
            setImmediate(async () => {
                try {
                    const conteoPages = await countPages(config);
                    console.log("Conteo: ", conteoPages);
                    const conteoByTipo = await manageProductProcessing(config, conteoPages);


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

                    await updateFeed(feedId, updateData);

                    console.log("Sincronización completada y feed actualizado");
                } catch (error) {
                    console.error('Error durante la sincronización en segundo plano:', error);
                }
            });

        } else {
            console.error('Feed no encontrado');
        }
    } catch (error) {
        console.error('Error al obtener el feed:', error);
    }

}

// Ejecutar la función de sincronización
synchronizeFeedCron(feedId);
