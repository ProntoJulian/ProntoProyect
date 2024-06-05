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

async function fetchProductById(config, productId) {
  const { storeHash } = config;
  const optionsGET = await getConfig(config);
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}`;

  try {
    const response = await fetch(url, optionsGET);
    if (!response.ok) {
      // Si el producto no se encuentra, lanzar un error
      throw new Error(`HTTP error! status 30 Products: ${response}`);
    }
    const productData = await response.json();
    return productData.data; // Retorna los datos del producto
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
}

async function getAvailableProducts(config, startPage, endPage) {
  const { storeHash } = config;
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
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
      tasks.push(processPages(config, segmentStartPage, segmentEndPage));
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

async function processPages(config, taskStartPage, taskEndPage) {
  const { storeHash } = config;
  const optionsGET = await getConfig(config);
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let validProductIds = [];
  let count = 0;

  for (let page = taskStartPage; page <= taskEndPage; page++) {
    const url = `${baseUrl}?price:min=0.01&availability=available&page=${page}&limit=300`;
    const response = await fetch(url, optionsGET);
    const data = await response.json();

    for (let product of data.data) {
      if (product.price > 0 && product.availability === "available") {
        const isValid = await checkCustomField(config, product.id);
        if (isValid) {
          validProductIds.push(product);
          count++;
        }
      }
    }
  }
  return { validProductIds, count };
}

async function getLimitedValidProducts(maxCount) {
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let validProductIds = [];
  let totalValidCount = 0; // Contador para los productos válidos
  let page = 1;
  let hasMorePages = true;

  console.time("getLimitedValidProducts");

  while (hasMorePages && totalValidCount < maxCount) {
    const url = `${baseUrl}?price:min=0.01&availability=available&page=${page}&limit=300`;
    const response = await fetch(url, optionsGET);
    if (!response.ok) {
      console.log(`HTTP error! status 196 Products: ${response.status}`);
      console.error(error);
      break;
    }
    const data = await response.json();
    for (let product of data.data) {
      if (totalValidCount >= maxCount) break; // Salir del bucle si ya alcanzamos el máximo requerido
      if (product.price > 0 && product.availability === "available") {
        const isValid = await checkCustomField(product.id);
        if (isValid) {
          validProductIds.push(product);
          totalValidCount++;
          console.log(`Conteo actual: ${totalValidCount}`);
        }
      }
    }
    page++;
    hasMorePages =
      data.meta.pagination.current_page < data.meta.pagination.total_pages;
  }

  console.timeEnd("getLimitedValidProducts");
  console.log(`Total de productos válidos encontrados: ${totalValidCount}`);
  return { validProductIds, totalValidCount };
}

async function manageProductProcessing(config,totalPages) {
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
    const result = await getAvailableProducts(config,currentPage, endPage);
    const validProductIds = result.allValidProductIds;
    totalValidCount += result.totalValidCount;

    const transformedProductos = await Promise.all(
      validProductIds.map((product) => transformProduct(config,product))
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

async function manageDeleteProductsProcessing(totalPages, googleMerchantSKUs) {
  const { deleteBatchProducts } = require("../api/googleMerchantAPI");

  const divisionOfPages = 10;
  const segmentSize = Math.ceil(totalPages / divisionOfPages);
  let currentPage = 1;
  let allBigCommerceSKUs = [];

  console.time("manageProductProcessing");

  for (let i = 0; i < divisionOfPages; i++) {
    const endPage = currentPage + segmentSize - 1 > totalPages ? totalPages : currentPage + segmentSize - 1;
    const products = await getAvailableProducts3(currentPage, endPage);

    // Extract SKUs from products
    const bigCommerceSKUs = products.allValidProductIds.map(product => product.sku);
    allBigCommerceSKUs = allBigCommerceSKUs.concat(bigCommerceSKUs);
    currentPage = endPage + 1;
  }

  // Determine SKUs present in Google Merchant but not in BigCommerce
  const skusToDelete = googleMerchantSKUs.filter(sku => !allBigCommerceSKUs.includes(sku));

  if (skusToDelete.length > 0) {
    await deleteBatchProducts(skusToDelete); // Assuming this function accepts an array of SKUs and handles batch deletion
    console.log(`Deleted ${skusToDelete.length} products from Google Merchant not present in BigCommerce.`);
  }

  console.timeEnd("manageProductProcessing");
  console.log(`Processed total of ${allBigCommerceSKUs.length} products from BigCommerce.`);
}

async function countPages(config) {
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

async function checkCustomField(config, productId) {
  const { storeHash } = config;
  const optionsGET = await getConfig(config);
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/custom-fields`;

  try {
    const response = await fetchWithRetry(url, optionsGET);
    if (response.ok) {
      const data = await response.json();
      return data.data.some(
        (field) => field.name === "__IMG" && field.value === "NWM"
      );
    } else {
      console.error(`HTTP error! status: ${response.status}`);
      console.error(error);
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

async function getProductsMatchingCustomField() {
  
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;

  let matchingProducts = [];
  let page = 1;
  let hasMorePages = true;

  console.time("getProductsMatchingCustomField");

  while (hasMorePages) {
    const url = `${baseUrl}?availability=available&page=${page}&limit=1000`; // Filtramos por disponibilidad

    try {
      const response = await fetch(url, optionsGET);
      if (!response.ok) {
        throw new Error(`HTTP error! status 460 Products: ${response}`);
      }
      const data = await response.json();

      // Map all products to check custom fields in parallel
      const checks = data.data.map((product) =>
        checkCustomField(product.id).then((hasField) =>
          hasField ? product : null
        )
      );

      // Wait for all checks to complete
      const results = await Promise.all(checks);
      matchingProducts = matchingProducts.concat(
        results.filter((product) => product !== null)
      );

      if (
        !data.meta ||
        !data.meta.pagination ||
        data.meta.pagination.current_page >= data.meta.pagination.total_pages
      ) {
        hasMorePages = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      break;
    }
  }

  console.timeEnd("getProductsMatchingCustomField");
  console.log(
    `Total products with specific custom field: ${matchingProducts.length}`
  );
  return matchingProducts;
}

async function getProductCustomFields(productId) {
  
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/custom-fields`;

  console.time("getProductCustomFields");

  try {
    const response = await fetch(url, optionsGET);
    if (!response.ok) {
      throw new Error(`HTTP error! status 529 Products: ${response}`);
    }
    const data = await response.json();
    console.timeEnd("getProductCustomFields");
    console.log(`Custom fields for product ${productId}:`, data.data);
    return data.data; // Retorna los custom fields del producto
  } catch (error) {
    console.timeEnd("getProductCustomFields");
    console.error("Error fetching custom fields:", error);
    return null; // Retorna null en caso de error
  }
}


async function countProductsByAvailability(config, availability) {
  const { storeHash } = config;
  const optionsGET = await getConfig(config);
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let totalCount = 0;
  let page = 1;
  let hasMorePages = true;

  console.time(`countProductsByAvailability-${availability}`);

  while (hasMorePages) {
    const url = `${baseUrl}?availability=${availability}&page=${page}&limit=250`; // Asumiendo que 250 es el límite máximo soportado

    try {
      const response = await fetch(url, optionsGET);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response}`);
      }
      const responseData = await response.json();
      totalCount += responseData.data.length;

      if (
        !responseData.meta ||
        !responseData.meta.pagination ||
        responseData.meta.pagination.current_page >=
        responseData.meta.pagination.total_pages
      ) {
        hasMorePages = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(
        `Error fetching products with availability ${availability}:`,
        error
      );
      hasMorePages = false; // Detiene el bucle si hay un error
    }
  }

  console.timeEnd(`countProductsByAvailability-${availability}`);
  console.log(
    `Total de productos con la disponibilidad '${availability}': ${totalCount}`
  );

  return totalCount;
}


async function countTotalProducts(config) {
  const { storeHash } = config;
  const optionsGET = await getConfig(config);
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let totalCount = 0;
  let page = 1;
  let hasMorePages = true;

  console.time(`countTotalProducts`);

  while (hasMorePages) {
    const url = `${baseUrl}?page=${page}&limit=250`; // Asumiendo que 250 es el límite máximo soportado

    try {
      const response = await fetch(url, optionsGET);
      if (!response.ok) {
        throw new Error(`HTTP error! status 604 Products: ${response}`);
      }
      const responseData = await response.json();
      totalCount += responseData.data.length;

      if (
        !responseData.meta ||
        !responseData.meta.pagination ||
        responseData.meta.pagination.current_page >=
        responseData.meta.pagination.total_pages
      ) {
        hasMorePages = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`Error fetching total products:`, error);
      hasMorePages = false; // Detiene el bucle si hay un error
    }
  }

  console.timeEnd(`countTotalProducts`);
  console.log(`Total de productos: ${totalCount}`);

  return totalCount;
}

module.exports = {
  fetchProductById,
  checkCustomField,
  getProductCustomFields,
  getProductsMatchingCustomField,
  countPages,
  getAvailableProducts,
  manageProductProcessing,
  getLimitedValidProducts,
  manageDeleteProductsProcessing,
  getConfig,
  countProductsByAvailability,
  countTotalProducts
};
