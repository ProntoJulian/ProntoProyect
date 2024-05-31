const fetch = require("node-fetch");
require("dotenv").config();

const {
  fetchWithRetry,
} = require("../helpers/helpers");

let accessToken; 
let storeHash;
let optionsGET;

async function getConfig(accessToken1, storeHash1) {
  accessToken = accessToken1;
  storeHash = storeHash1;

  optionsGET = {
    method: "GET",
    headers: {
      "X-Auth-Token": accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

}

/**
 * Función asíncrona para recuperar los detalles de un producto específico por su ID desde la API de BigCommerce.
 * La función realiza una solicitud GET usando el ID del producto para acceder a su información detallada.
 *
 * Parámetros:
 * - productId: El identificador único del producto que se desea recuperar.
 *
 * Proceso:
 * 1. Construye la URL para la solicitud basada en el storeHash y el productId proporcionados.
 * 2. Realiza una solicitud GET a la API de BigCommerce.
 * 3. Verifica la respuesta: si la API devuelve un estado de error (por ejemplo, si el producto no existe),
 *    lanza un error con detalles del estado HTTP.
 * 4. Si la respuesta es exitosa, extrae los datos del producto del cuerpo de la respuesta y los retorna.
 *
 * Manejo de errores:
 * - Captura y registra cualquier error durante la solicitud, como fallos en la conexión o respuestas inesperadas de la API.
 * - Re-lanza el error para permitir que manejadores externos procesen el fallo adecuadamente.
 *
 */


async function fetchProductById(productId) {
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}`;

  try {
    const response = await fetch(url, optionsGET);
    if (!response.ok) {
      // Si el producto no se encuentra, lanzar un error
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const productData = await response.json();
    return productData.data; // Retorna los datos del producto
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
}

/**
 * Función asíncrona para obtener productos disponibles de un rango especificado de páginas en BigCommerce.
 * Calcula el total de páginas a procesar, divide la carga en segmentos manejables y procesa cada segmento concurrentemente.
 *
 * Parámetros:
 * - startPage: Número de la página inicial desde la cual empezar la búsqueda.
 * - endPage: Número de la página final hasta donde se extiende la búsqueda.
 *
 * Proceso:
 * 1. Calcula el número total de páginas y las divide en 20 segmentos para mejorar la eficiencia de la solicitud.
 * 2. Crea y ejecuta tareas de procesamiento para cada segmento de páginas, utilizando concurrencia para acelerar el proceso.
 * 3. Recolecta y suma los resultados de cada segmento, incluyendo el conteo de productos válidos y sus IDs.
 * 4. Al final, registra el tiempo total tomado por el proceso y devuelve los IDs de los productos válidos y el total contado.
 *
 * Esta función es útil para manejar grandes volúmenes de datos y realizar operaciones en paralelo, aprovechando la capacidad de JavaScript para ejecutar promesas de manera concurrente.
 */

async function getAvailableProducts(startPage, endPage) {
  
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let totalValidCount = 0; // Contador para todos los productos válidos

  const totalPages = endPage - startPage + 1;
  console.log("Total de páginas: ", totalPages);
  console.log("Pag de inicio: ", startPage);
  console.log("Pag de Final: ", endPage);
  const segmentSize = Math.ceil(totalPages / 20); // Divide en 10 partes o segmentos
  const tasks = [];

  console.time("getAvailableProducts-Concurrent");

  for (let i = 0; i < 20; i++) {
    const segmentStartPage = startPage + i * segmentSize;
    const segmentEndPage =
      segmentStartPage + segmentSize - 1 <= endPage
        ? segmentStartPage + segmentSize - 1
        : endPage;
    if (segmentStartPage <= segmentEndPage) {
      tasks.push(processPages(segmentStartPage, segmentEndPage));
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


/**
 * Función asíncrona para procesar un rango específico de páginas de productos desde la API de BigCommerce,
 * filtrando y contando productos que cumplen con ciertos criterios de validez.
 *
 * Parámetros:
 * - taskStartPage: Página inicial del segmento a procesar.
 * - taskEndPage: Página final del segmento a procesar.
 *
 * Proceso:
 * 1. Itera a través de cada página desde taskStartPage hasta taskEndPage.
 * 2. Realiza una solicitud GET para cada página, filtrando productos por precio mínimo y disponibilidad.
 * 3. Para cada producto disponible, verifica campos adicionales personalizados para determinar su validez.
 * 4. Acumula los IDs de los productos válidos y lleva un conteo de estos.
 * 5. Devuelve un objeto con los IDs de los productos válidos y el total contado.
 *
 * Esta función es parte de un proceso mayor que utiliza concurrencia para agilizar el procesamiento de datos masivos,
 * ideal para entornos de comercio electrónico con grandes catálogos de productos.
 */


async function processPages(taskStartPage, taskEndPage) {
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let validProductIds = [];
  let count = 0;
  for (let page = taskStartPage; page <= taskEndPage; page++) {
    const url = `${baseUrl}?price:min=0.01&availability=available&page=${page}&limit=300`;
    const response = await fetch(url, optionsGET);
    const data = await response.json();
    for (let product of data.data) {
      if (product.price > 0 && product.availability === "available") {
        const isValid = await checkCustomField(product.id);
        if (isValid) {
          validProductIds.push(product);
          count++;
        }
      }
    }
  }
  return { validProductIds, count };
}


/**
 * Función asíncrona diseñada para recuperar una cantidad limitada de productos válidos desde la API de BigCommerce,
 * asegurándose de que cada producto cumpla con criterios específicos de precio y disponibilidad antes de ser considerado válido.
 *
 * Parámetros:
 * - maxCount: El número máximo de productos válidos que se desea obtener.
 *
 * Proceso:
 * 1. Itera sobre las páginas de productos de BigCommerce, comenzando en la página uno.
 * 2. Realiza solicitudes GET a la API para filtrar productos por un precio mínimo y su disponibilidad.
 * 3. Verifica cada producto individualmente para asegurarse de que cumpla con criterios adicionales mediante la función `checkCustomField`.
 * 4. Acumula los identificadores de los productos válidos y cuenta cuántos se han procesado hasta llegar al límite especificado por `maxCount`.
 * 5. Termina la iteración si se alcanza el número máximo deseado de productos válidos o si ya no hay más páginas para procesar.
 * 6. Mide el tiempo total de ejecución y registra tanto el conteo como la lista de productos válidos.
 *
 * Esta función es útil para situaciones donde solo se requiere un conjunto específico de productos y es crítico no sobrepasar un límite dado,
 * por ejemplo, para promociones o análisis específicos de mercado.
 */


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
      console.log(`HTTP error! status: ${response.status}`);
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

/**
 * Función asíncrona para gestionar el procesamiento de productos a través de múltiples páginas, transformarlos según 
 * criterios específicos y luego insertarlos en Google Merchant.
 *
 * Parámetros:
 * - totalPages: El número total de páginas de productos a procesar.
 *
 * Proceso:
 * 1. Divide el total de páginas en segmentos para procesar en partes manejables.
 * 2. Itera sobre cada segmento de páginas, recuperando productos válidos de cada rango de páginas.
 * 3. Transforma cada producto válido mediante la función `transformProduct`.
 * 4. Inserta los productos transformados en Google Merchant usando la función `insertBatchProducts`.
 * 5. Acumula el conteo total de productos válidos procesados y actualiza la página actual para el siguiente segmento.
 * 6. Registra el tiempo de procesamiento total y el número de productos válidos manejados.
 *
 * Este enfoque segmentado permite manejar grandes volúmenes de datos de manera eficiente, minimizando el riesgo de sobrecarga
 * y maximizando la capacidad de respuesta del sistema.
 */


async function manageProductProcessing(totalPages) {
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
    const result = await getAvailableProducts(currentPage, endPage);
    const validProductIds = result.allValidProductIds;
    totalValidCount += result.totalValidCount;

    const transformedProductos = await Promise.all(
      validProductIds.map((product) => transformProduct(product))
    );
    await insertBatchProducts(transformedProductos);

    currentPage = endPage + 1;
  }

  console.log(
    `Total valid products in manageProductProcessing: ${totalValidCount}`
  ); // Muestra el total de productos válidos procesados

  console.timeEnd("manageProductProcessing");
  return totalValidCount;
}

/**
 * Función asíncrona que maneja el procesamiento y eliminación de productos en Google Merchant que no están presentes en BigCommerce.
 * Esta función divide la carga de trabajo en segmentos, recupera productos válidos de BigCommerce y compara sus SKUs con los listados en Google Merchant para identificar cuáles deben eliminarse.
 *
 * Parámetros:
 * - totalPages: El total de páginas de productos en BigCommerce a procesar.
 * - googleMerchantSKUs: Array de SKUs de productos actualmente listados en Google Merchant.
 *
 * Proceso:
 * 1. Divide el total de páginas en segmentos para procesar de manera más eficiente.
 * 2. Itera sobre cada segmento, recuperando productos válidos de BigCommerce y extrayendo sus SKUs.
 * 3. Acumula todos los SKUs de BigCommerce en un array.
 * 4. Identifica los SKUs que están en Google Merchant pero no en BigCommerce.
 * 5. Elimina los SKUs identificados de Google Merchant mediante una llamada a `deleteBatchProducts`.
 * 6. Registra el número de productos eliminados y el total procesado en BigCommerce.
 * 7. Mide el tiempo total del proceso para evaluar la eficiencia de la operación.
 *
 * Esta función es crucial para mantener la sincronización entre los inventarios de BigCommerce y Google Merchant, asegurando que los productos descontinuados o inexistentes en BigCommerce sean eliminados de Google Merchant para evitar discrepancias.
 */


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


/**
 * Función asíncrona para contar el total de páginas de productos disponibles en BigCommerce utilizando una estrategia concurrente.
 * Esta función primero realiza una solicitud inicial para obtener el total de páginas y luego lanza solicitudes concurrentes para cada una.
 *
 * Proceso:
 * 1. Realiza una solicitud GET inicial para obtener la primera página de productos y extraer el total de páginas disponibles.
 * 2. Crea un array de promesas, cada una correspondiente a una página, y realiza solicitudes concurrentes para todas las páginas.
 * 3. Utiliza Promise.all para esperar que todas las solicitudes se completen, permitiendo un procesamiento más rápido y eficiente.
 * 4. Mide el tiempo que toma procesar todas las páginas de manera concurrente y registra este junto con el total de páginas procesadas.
 *
 * Este método es particularmente útil para obtener rápidamente una visión completa del inventario o para acciones que requieren 
 * procesar grandes cantidades de datos de producto en poco tiempo.
 */


async function countPages() {
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;

  const options = {
    method: "GET",
    headers: {
      "X-Auth-Token": accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

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

/**
 * Función asíncrona para verificar un campo personalizado específico de un producto en BigCommerce.
 * La función busca un campo denominado "__IMG" con el valor "NWM" entre los campos personalizados del producto.
 *
 * Parámetros:
 * - productId: El identificador único del producto cuyos campos personalizados se quieren verificar.
 *
 * Proceso:
 * 1. Construye una URL para acceder a los campos personalizados del producto especificado.
 * 2. Realiza una solicitud GET a la API de BigCommerce usando la función `fetchWithRetry`, asegurando reintentos en caso de fallos temporales.
 * 3. Verifica si la respuesta es exitosa y, de ser así, procesa los datos JSON para buscar el campo personalizado específico.
 * 4. Retorna `true` si el campo existe y coincide con el valor esperado, `false` de lo contrario.
 * 5. Captura y registra cualquier error durante la solicitud o procesamiento de datos, devolviendo `false` en caso de error.
 *
 * Esta función es crucial para la validación de datos de producto que dependen de metadatos personalizados, 
 * proporcionando una manera eficiente de filtrar productos basados en atributos específicos no estándar.
 */


async function checkCustomField(productId) {
  
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

/**
 * Función asíncrona destinada a recuperar productos de BigCommerce que coincidan con un campo personalizado específico.
 * La función itera sobre todas las páginas de productos disponibles, verificando cada producto para determinar si cumple con el criterio del campo personalizado.
 *
 * Proceso:
 * 1. Itera sobre las páginas de productos disponibles filtrando por disponibilidad.
 * 2. Para cada página, realiza una solicitud GET para obtener los productos y luego verifica en paralelo si cada producto
 *    contiene el campo personalizado específico usando la función `checkCustomField`.
 * 3. Acumula todos los productos que cumplen con el criterio en un arreglo `matchingProducts`.
 * 4. Continúa el proceso hasta que no haya más páginas para procesar según la paginación de la respuesta de la API.
 * 5. Registra el tiempo total tomado para el proceso y la cantidad de productos que coinciden con el campo personalizado.
 *
 * Este método es eficaz para identificar y recolectar productos específicos en un gran catálogo, utilizando llamadas API
 * concurrentes para optimizar el rendimiento y la velocidad de la operación.
 */


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
        throw new Error(`HTTP error! status: ${response.status}`);
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



/**
 * Función asíncrona para obtener los campos personalizados de un producto específico en BigCommerce.
 * Utiliza la ID del producto para hacer una solicitud a la API y recuperar dichos campos.
 *
 * Parámetros:
 * - productId: El identificador único del producto cuyos campos personalizados se desean obtener.
 *
 * Proceso:
 * 1. Construye la URL para acceder a los campos personalizados del producto especificado.
 * 2. Realiza una solicitud GET a la API de BigCommerce.
 * 3. Verifica si la respuesta es exitosa y procesa los datos para obtener los campos personalizados.
 * 4. Registra el tiempo tomado para la operación y los campos obtenidos.
 * 5. Devuelve los campos personalizados del producto si la solicitud es exitosa; retorna null si ocurre un error.
 *
 * Esta función es útil para desarrolladores y sistemas que necesitan acceder a detalles específicos de los productos que
 * no están incluidos en los campos estándar de la API de productos.
 */


async function getProductCustomFields(productId) {
  
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/custom-fields`;

  console.time("getProductCustomFields");

  try {
    const response = await fetch(url, optionsGET);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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


async function countProductsByAvailability(availability) {
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let totalCount = 0;
  let page = 1;
  let hasMorePages = true;

  console.time(`countProductsByAvailability-${availability}`);

  while (hasMorePages) {
    let url = `${baseUrl}?availability=${availability}&page=${page}&limit=250`; // Asumiendo que 250 es el límite máximo soportado

    try {
      const response = await fetch(url, optionsGET);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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


async function countTotalProducts() {
  const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
  let totalCount = 0;
  let page = 1;
  let hasMorePages = true;

  console.time(`countTotalProducts`);

  while (hasMorePages) {
    let url = `${baseUrl}?page=${page}&limit=250`; // Asumiendo que 250 es el límite máximo soportado

    try {
      const response = await fetch(url, optionsGET);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
