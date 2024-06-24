const fetch = require("node-fetch");
require("dotenv").config();

const {
    fetchWithRetry,
} = require("../helpers/helpers");

async function getConfig(config) {
    const { accessToken, storeHash } = config;

    return {
        method: "GET",
        headers: {
            "X-Auth-Token": accessToken,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    };
}

async function checkCustomFieldFeed(config, productId) {
    // Si no se pasan customFields, devolver true inmediatamente
    const { apiInfo, storeHash } = config;
    const customFields = apiInfo.customFields;
    if (!customFields || customFields.length === 0) {
        return true;
    }
    const optionsGET = await getConfig(config);
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/custom-fields`;

    try {
        const response = await fetchWithRetry(url, optionsGET);
        if (response.ok) {
            const data = await response.json();
            return customFields.every(customField =>
                data.data.some(
                    field => field.name === customField.name && field.value === customField.value
                )
            );
        } else {
            console.error(`HTTP error! 41  status: ${response.status}`);
            console.log("Response:", await response.text());
            return false;
        }
    } catch (error) {
        console.error(
            "Error fetching custom fields for product:",
            productId,
            error
        );
        return false;
    }
}


async function getAvailableProductsFeed(config, startPage, endPage) {
    const { storeHash, apiInfo } = config;
    //const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
    const baseUrl = apiInfo.url;
    let totalValidCount = 0; // Contador para todos los productos válidos

    const totalPages = endPage - startPage + 1;
    console.log("Total de páginas: ", totalPages);
    console.log("Pag de inicio: ", startPage);
    console.log("Pag de Final: ", endPage);
    console.log("StoreHash: ", storeHash);
    const segmentSize = Math.ceil(totalPages / 20); // Divide en 20 partes o segmentos
    const tasks = [];

    console.time("getAvailableProducts-Concurrent");

    for (let i = 0; i < 20; i++) {
        const segmentStartPage = startPage + i * segmentSize;
        const segmentEndPage =
            segmentStartPage + segmentSize - 1 <= endPage
                ? segmentStartPage + segmentSize - 1
                : endPage;
        if (segmentStartPage <= segmentEndPage) {

            tasks.push(processPagesFeed(config, segmentStartPage, segmentEndPage));
        }
    }

    const results = await Promise.all(tasks);
    let allValidProductIds = []; // Array para juntar todos los IDs válidos
    results.forEach((result) => {
        totalValidCount += result.count; // Suma de todos los productos válidos encontrados en todos los segmentos
        allValidProductIds = allValidProductIds.concat(result.validProductIds); // Concatena los IDs de productos válidos de cada segmento
    });

    console.timeEnd("getAvailableProducts-Concurrent");
    console.log(`Total valid products processed: ${totalValidCount}`);
    return { allValidProductIds, totalValidCount };
}

async function processPagesFeed(config, taskStartPage, taskEndPage) {
    const { storeHash, apiInfo } = config;
    const optionsGET = await getConfig(config);

    //const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
    const baseUrl = apiInfo.url;
    let validProductIds = [];
    let count = 0;

    for (let page = taskStartPage; page <= taskEndPage; page++) {
        //const url = `${baseUrl}&page=${page}&limit=300`;
        //const url = `${baseUrl}?price:min=0.01&availability=available&page=${page}&limit=300`;
        const url = `${baseUrl}&page=${page}&limit=300`;
        const response = await fetch(url, optionsGET);
        const data = await response.json();


        //console.log("URL: ",url)
        for (let product of data.data) {
            //if (product.price > 0 && product.availability === "available") {
            const isValid = await checkCustomFieldFeed(config, product.id);

            if (isValid) {
                validProductIds.push(product);
                count++;
            }
            //}
        }
    }
    return { validProductIds, count };
}


async function manageProductProcessingFeed(config, totalPages) {
    const { transformProduct } = require("../helpers/helpers");
    const { insertBatchProducts } = require("../api/googleMerchantAPI");

    const divisionOfPages = 10;
    const segmentSize = Math.ceil(totalPages / divisionOfPages); // Divide las páginas en 10 partes
    let currentPage = 1;
    let totalValidCount = 0; // Contador total para todos los productos válidos

    console.time("manageProductProcessing");

    for (let i = 0; i < divisionOfPages; i++) {
        const endPage =
            currentPage + segmentSize - 1 > totalPages
                ? totalPages
                : currentPage + segmentSize - 1;



        const result = await getAvailableProductsFeed(config, currentPage, endPage);
        const validProductIds = result.allValidProductIds;
        totalValidCount += result.totalValidCount;

        const transformedProductos = await Promise.all(
            validProductIds.map((product) => transformProduct(config, product))
        );

        await insertBatchProducts(config,transformedProductos);

        currentPage = endPage + 1;
    }

    console.log(
        `Total valid products in manageProductProcessing: ${totalValidCount}`
    ); // Muestra el total de productos válidos procesados

    console.timeEnd("manageProductProcessing");
    return totalValidCount;
}


async function countPagesFeed(config) {
    const { storeHash } = config;
    const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
    const options = await getConfig(config);

    console.time("countPagesConcurrently");

    // Inicialmente, haz una petición para obtener la primera página y determinar el total de páginas
    const initialUrl = `${baseUrl}?price:min=0.01&availability=available&page=1&limit=300`;
    const initialResponse = await fetch(initialUrl, options);
    const initialData = await initialResponse.json();
    const totalPages = initialData.meta.pagination.total_pages;

    // Creamos un array de promesas para cada página
    let promises = [];
    for (let page = 1; page <= totalPages; page++) {
        const pageUrl = `${baseUrl}?price:min=0.01&availability=available&page=${page}&limit=300`;
        promises.push(fetch(pageUrl, options).then((response) => response.json()));
    }

    // Esperamos a que todas las promesas se resuelvan
    const results = await Promise.all(promises);
    console.timeEnd("countPagesConcurrently");
    console.log(`Total pages processed concurrently: ${results.length}`);
    return results.length;
}

module.exports = {
    manageProductProcessingFeed,
    countPagesFeed,
    checkCustomFieldFeed
}