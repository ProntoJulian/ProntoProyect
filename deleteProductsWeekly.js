const { listAllProductIds } = require("./api/googleMerchantAPI")
const { manageDeleteProductsProcessing, countPages } = require("./api/productsBigCommerceApi")
const { fetchOneFromTable } = require("./databases/CRUD");


async function deleteFeedCron(feedId) {
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

        const products = await listAllProductIds(config);
        const conteoPages = await countPages(config);
        await manageDeleteProductsProcessing(conteoPages, products, config);

    } catch (error) {
        console.error('Error in deleteFeedCron:', error);
    }
}


// Obtener el feedId desde los argumentos de la línea de comandos
const args = process.argv.slice(2);
const feedId = args[0];

if (!feedId) {
    console.error('Error: FEED_ID no proporcionado');
    process.exit(1);
}

// Simulación de la ejecución del cron
deleteFeedCron(feedId).catch(error => {
    console.error('Error en deleteFeedCron:', error.message);
    process.exit(1);
});
