const { google } = require("googleapis");
var OAuth2 = google.auth.OAuth2;
const fetch = require("node-fetch"); // Asegúrate de tener esta dependencia instalada

const credentials = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN
};

const { transformProduct } = require("../helpers/helpers");

// Define los alcances de la API a los que tu cuenta de servicio necesita acceder

let auth;
let content;
let merchantId;

async function initializeGoogleAuth(client_email, private_key, merchant_Id) {
  merchantId = merchant_Id;

  const formattedPrivateKeyFromDb = private_key.replace(/\\n/g, '\n');

  auth = new google.auth.JWT(
    client_email,
    null,
    formattedPrivateKeyFromDb,
    ["https://www.googleapis.com/auth/content"]
  );

  content = google.content({
    version: "v2.1",
    auth: auth,
  });
}


/**
 * Función asíncrona para insertar un producto en Google Merchant mediante la API de Google Content.
 * La función toma un objeto de producto y lo envía a Google Merchant, registrando y devolviendo la respuesta.
 *
 * Parámetros:
 * - product: Objeto que representa el producto a insertar, debe estar formateado según los requisitos de la API de Google Merchant.
 *
 * Proceso:
 * 1. Utiliza el método 'insert' del objeto 'content.products' para enviar el producto a Google Merchant.
 * 2. Configura el 'merchantId' y el recurso del producto en el cuerpo de la solicitud.
 * 3. Si la inserción es exitosa, imprime y devuelve los detalles del producto insertado.
 * 4. Captura y maneja cualquier error durante la inserción, imprimiendo el mensaje de error y re-lanzando el error para manejarlo en niveles superiores.
 *
 * Esta función es crucial para la integración de inventarios entre sistemas internos y la plataforma de Google Merchant, 
 * facilitando la gestión y sincronización de productos en un entorno de comercio electrónico.
 */

async function insertProductToGoogleMerchant(product) {

  try {
    const response = await content.products.insert({
      merchantId: merchantId,
      resource: product,
    });
    console.log("Producto insertado");
    return response.data;
  } catch (error) {
    console.error("Error al insertar producto: ");
    throw error; // Re-lanza el error para manejarlo más arriba si es necesario
  }
}

/**
 * Función asíncrona para insertar un lote de productos en Google Merchant utilizando la API de Google Content.
 * Agrupa varios productos en un solo request de lote para optimizar la inserción y reduce el número de llamadas de API necesarias.
 *
 * Parámetros:
 * - products: Array de productos que se desea insertar en Google Merchant. Cada producto debe estar formateado adecuadamente según los requisitos de la API.
 *
 * Proceso:
 * 1. Prepara un objeto 'batchRequest' para contener todas las entradas de productos, asignando un 'batchId' único a cada una.
 * 2. Itera sobre el array de productos, añadiendo cada producto al objeto 'batchRequest' con la acción 'insert'.
 * 3. Inicia un temporizador para monitorear el tiempo de ejecución del proceso de inserción de lote.
 * 4. Utiliza el método 'custombatch' de 'content.products' para enviar el request de lote a Google Merchant.
 * 5. Finaliza el temporizador y registra el tiempo de ejecución.
 * 6. Imprime la respuesta de la API para verificar los resultados de la inserción.
 * 7. Captura y maneja errores durante la inserción, imprimiendo los errores y asegurando que el temporizador se detenga adecuadamente en caso de fallas.
 *
 * Esta función es útil para el manejo eficiente de grandes volúmenes de productos, permitiendo actualizaciones masivas y sincronizadas en la tienda de Google Merchant.
 */


async function insertBatchProducts(products) {
  const { google } = require("googleapis");

  /*

  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key,
    ["https://www.googleapis.com/auth/content"]
  );

  const content = google.content({
    version: "v2.1",
    auth: auth,
  });
  */

  const batchRequest = { entries: [] };

  products.forEach((product, index) => {
    batchRequest.entries.push({
      batchId: index + 1,
      merchantId: merchantId,
      method: "insert",
      product: product,
    });
  });

  console.time("InsertProductBatchTime"); // Inicia el temporizador

  try {
    const response = await content.products.custombatch({
      resource: batchRequest,
    });
    console.timeEnd("InsertProductBatchTime"); // Termina el temporizador y muestra el tiempo
    console.log("Se subieron los productos a Google Merchant"); // Ver la respuesta de la API
    console.log("----------------------------------");
  } catch (error) {
    console.log("Hubo un error");
    console.timeEnd("InsertProductBatchTime"); // Asegúrate de detener el temporizador si hay un error
    console.error(error);
  }
}

/**
 * Función asíncrona para eliminar un lote de productos en Google Merchant utilizando la API de Google Content.
 * Esta función facilita la eliminación eficiente de múltiples productos, enviando una sola solicitud de lote.
 *
 * Parámetros:
 * - productIds: Array de identificadores de los productos que se desea eliminar.
 *
 * Proceso:
 * 1. Prepara un objeto 'batchRequest' con entradas que especifican cada producto a eliminar, asignando un 'batchId' único a cada una.
 * 2. Cada entrada en el lote especifica la acción 'delete', el 'merchantId' y el 'productId' correspondiente.
 * 3. Inicia un temporizador para medir la duración del proceso de eliminación de productos.
 * 4. Envía la solicitud de lote a través del método 'custombatch' de 'content.products', que procesa todas las eliminaciones especificadas.
 * 5. Termina el temporizador una vez que se completa la operación y muestra el tiempo transcurrido.
 * 6. Imprime la respuesta de la API para verificar los resultados de la eliminación.
 * 7. Captura y maneja cualquier error durante la operación, registrando los errores y asegurando que el temporizador se detenga correctamente en caso de fallas.
 *
 * Esta función es ideal para administradores y sistemas automatizados que necesitan manejar la eliminación masiva de productos en Google Merchant, optimizando tanto el tiempo como los recursos.
 */


async function deleteBatchProducts(productIds) {

  const batchRequest = { entries: [] };

  productIds.forEach((productId, index) => {
    batchRequest.entries.push({
      batchId: index + 1,
      merchantId: merchantId,
      method: "delete",
      productId: productId,
    });
  });

  console.time("DeleteProductBatchTime"); // Inicia el temporizador

  try {
    const response = await content.products.custombatch({
      resource: batchRequest,
    });
    console.timeEnd("DeleteProductBatchTime"); // Termina el temporizador y muestra el tiempo
    console.log(response.data); // Ver la respuesta de la API
  } catch (error) {
    console.log("Hubo un error");
    console.timeEnd("DeleteProductBatchTime"); // Asegúrate de detener el temporizador si hay un error
    console.error(error);
  }
}

/**
 * Función asíncrona para obtener el estado actual de un producto específico en Google Merchant mediante la API de Google Content.
 * Esta función busca el estado de un producto dado su ID, útil para verificar su disponibilidad y visibilidad en el mercado.
 *
 * Parámetros:
 * - productId: El identificador único del producto cuyo estado se desea consultar.
 *
 * Proceso:
 * 1. Utiliza el método 'productstatuses.get' para enviar una solicitud a Google Content, especificando el 'merchantId', 'productId' y las 'destinations' deseadas.
 * 2. Si la solicitud es exitosa, imprime y devuelve los datos del estado del producto, proporcionando detalles como su aceptación en los canales de venta, problemas de calidad, etc.
 * 3. Captura y maneja cualquier error que pueda ocurrir durante la solicitud, registrando los detalles del error y re-lanzando el error para manejo externo.
 *
 * Esta función es crucial para los vendedores y administradores de sistemas que necesitan monitorear el estado y la salud de los productos listados en Google Shopping, asegurando que los productos cumplen con los requisitos y están disponibles para la venta.
 */

async function getProductStatusByProductId(productId) {
  try {
    const response = await content.productstatuses.get({
      merchantId: merchantId,
      productId: productId,
      destinations: ["Shopping"],
    });

    console.log("Estado del producto: ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error al obtener el estado del producto: ", error);
    throw error;
  }
}

/**
 * Función asíncrona para listar el estado de todos los productos en Google Merchant utilizando la API de Google Content.
 * Itera sobre las páginas de estados de productos, utilizando paginación controlada por tokens para manejar grandes volúmenes de datos.
 *
 * Proceso:
 * 1. Inicia un temporizador para monitorear el tiempo total del proceso de listado.
 * 2. Configura los parámetros iniciales para la solicitud de la API, incluyendo el 'merchantId', las 'destinations' y el máximo de resultados por página.
 * 3. Utiliza un bucle do-while que continúa mientras exista un 'nextPageToken', indicando más páginas de datos disponibles.
 * 4. En cada iteración, realiza una solicitud a la API para obtener la página actual de estados de productos.
 * 5. Si la respuesta contiene productos, suma el total de productos listados y actualiza el 'nextPageToken' para la próxima solicitud.
 * 6. Al final del bucle, imprime el total de productos listados y detiene el temporizador para mostrar la duración del proceso.
 * 7. Captura y maneja cualquier error durante las solicitudes, registrando el error y deteniendo el temporizador antes de re-lanzar el error para su manejo externo.
 *
 * Esta función es útil para obtener un recuento completo y estados de todos los productos listados en Google Shopping, proporcionando una herramienta esencial para la gestión y el análisis del inventario en plataformas de comercio electrónico.
 */


async function listAllProductStatuses() {
  let totalProducts = 0;
  let nextPageToken = null; // Inicializamos el nextPageToken como null
  const maxResults = 250; // Máximo de resultados por página

  console.time("Duración del listado de productos"); // Inicia el temporizador

  try {
    do {
      const params = {
        merchantId,
        destinations: ['Shopping'],
        maxResults
      };
      if (nextPageToken) {
        params.pageToken = nextPageToken; // Añade el pageToken solo si existe
      }

      const response = await content.productstatuses.list(params);

      if (response.data.resources) {
        totalProducts += response.data.resources.length; // Sumamos la cantidad de productos de esta página
        nextPageToken = response.data.nextPageToken; // Actualizamos el nextPageToken con el nuevo valor
      }
    } while (nextPageToken); // Continúa mientras haya un nextPageToken

    console.log("Total de productos listados: ", totalProducts);
    console.timeEnd("Duración del listado de productos"); // Detiene el temporizador y muestra la duración
    return totalProducts;
  } catch (error) {
    console.error("Error al listar todos los estados de los productos: ", error);
    console.timeEnd("Duración del listado de productos"); // Asegúrate de detener el temporizador si hay un error
    throw error;
  }
}

/**
 * Función asíncrona para listar todos los productos en Google Merchant utilizando la API de Google Content.
 * Utiliza la paginación para manejar grandes volúmenes de datos, iterando sobre todas las páginas de productos disponibles.
 *
 * Proceso:
 * 1. Inicia un temporizador para medir la duración del proceso de listado de productos.
 * 2. Configura los parámetros iniciales para la solicitud de la API, incluyendo el 'merchantId' y el número máximo de resultados por página.
 * 3. Utiliza un bucle do-while que continúa mientras exista un 'nextPageToken', lo que indica más páginas de datos disponibles.
 * 4. En cada iteración, realiza una solicitud a la API para obtener la página actual de productos.
 * 5. Si la respuesta contiene productos, suma el total de productos listados y actualiza el 'nextPageToken' para la próxima solicitud.
 * 6. Al finalizar todas las páginas, imprime el total de productos listados y detiene el temporizador para mostrar la duración del proceso.
 * 7. Captura y maneja cualquier error durante las solicitudes, registrando el error y deteniendo el temporizador antes de re-lanzar el error para su manejo externo.
 *
 * Esta función es esencial para obtener un recuento completo de todos los productos listados en Google Shopping, proporcionando una visión global del inventario disponible y ayudando en la gestión y análisis del mismo.
 */

async function listAllProducts(merchantId) {
  const { google } = require("googleapis");

  /*
  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key,
    ["https://www.googleapis.com/auth/content"]
  );

  const content = google.content({
    version: "v2.1",
    auth: auth,
  });
*/
  let totalProducts = 0;
  let nextPageToken = null;
  const maxResults = 250;

  console.time("Duración del listado de productos");

  try {
    do {
      const params = {
        merchantId,
        maxResults
      };
      if (nextPageToken) {
        params.pageToken = nextPageToken;
      }

      const response = await content.products.list(params);

      if (response.data.resources) {
        totalProducts += response.data.resources.length;
        nextPageToken = response.data.nextPageToken;
      }
    } while (nextPageToken);

    console.log("Total de productos listados: ", totalProducts);
    console.timeEnd("Duración del listado de productos");
    return totalProducts;
  } catch (error) {
    console.error("Error al listar todos los productos: ", error);
    console.timeEnd("Duración del listado de productos");
    throw error;
  }
}



/**
 * Función asíncrona para buscar un producto específico en Google Merchant mediante su ID de BigCommerce.
 * Utiliza la API de Google Content para iterar sobre las páginas de productos y encontrar el producto con el ID especificado.
 *
 * Parámetros:
 * - bigCommerceId: El ID del producto en BigCommerce que se desea encontrar en Google Merchant.
 *
 * Proceso:
 * 1. Inicia un temporizador para medir la duración del proceso de búsqueda del producto.
 * 2. Configura los parámetros iniciales para la solicitud de la API, incluyendo el 'merchantId' y el número máximo de resultados por página.
 * 3. Utiliza un bucle do-while que continúa mientras exista un 'nextPageToken', lo que indica más páginas de productos disponibles.
 * 4. En cada iteración, realiza una solicitud a la API para obtener la página actual de productos.
 * 5. Filtra los productos de la página actual para encontrar aquel cuyo 'customLabel1' coincide con el 'bigCommerceId' especificado.
 * 6. Si el producto es encontrado, imprime los detalles del producto, detiene el temporizador y retorna el producto encontrado.
 * 7. Si no se encuentra el producto, actualiza el 'nextPageToken' para la próxima iteración.
 * 8. Al finalizar todas las páginas sin encontrar el producto, imprime un mensaje de no encontrado y detiene el temporizador.
 * 9. Captura y maneja cualquier error durante las solicitudes, registrando el error y deteniendo el temporizador antes de re-lanzar el error para su manejo externo.
 *
 * Esta función es útil para verificar la presencia y detalles de un producto específico en Google Merchant basándose en su ID de BigCommerce,
 * facilitando la sincronización y administración de inventarios entre plataformas.
 */

async function findProductByBigCommerceId(bigCommerceId) { // Asegúrate de reemplazar este con tu Merchant ID real
  let nextPageToken = null; // Inicializamos el nextPageToken como null
  const maxResults = 250; // Máximo de resultados por página

  console.time("Duración de la búsqueda de producto"); // Inicia el temporizador

  try {
    do {
      const params = {
        merchantId,
        maxResults,
      };
      if (nextPageToken) {
        params.pageToken = nextPageToken; // Añade el pageToken solo si existe
      }

      const response = await content.products.list(params);

      if (response.data.resources) {
        // Filtra los productos para encontrar aquel que tiene el ID de BigCommerce especificado
        const foundProduct = response.data.resources.find(product => product.customLabel1 === bigCommerceId);
        if (foundProduct) {
          console.log("Producto encontrado: ", foundProduct);
          console.timeEnd("Duración de la búsqueda de producto"); // Detiene el temporizador y muestra la duración
          return foundProduct;
        }
        nextPageToken = response.data.nextPageToken; // Actualizamos el nextPageToken para la próxima iteración
      }
    } while (nextPageToken); // Continúa mientras haya un nextPageToken

    console.log("Producto no encontrado.");
    console.timeEnd("Duración de la búsqueda de producto"); // Detiene el temporizador
    return null;
  } catch (error) {
    console.error("Error al buscar el producto: ", error);
    console.timeEnd("Duración de la búsqueda de producto"); // Asegúrate de detener el temporizador si hay un error
    throw error;
  }
}

/**
 * Función asíncrona para actualizar un producto en Google Merchant utilizando la API de Google Content.
 * La función transforma los datos de un producto de BigCommerce y actualiza el correspondiente en Google Merchant.
 *
 * Parámetros:
 * - googleProductId: El ID del producto en Google Merchant Center que se desea actualizar.
 * - bcProduct: Objeto que contiene la información del producto de BigCommerce a transformar y actualizar.
 *
 * Proceso:
 * 1. Imprime el ID del producto de Google para fines de seguimiento.
 * 2. Transforma el producto de BigCommerce en un formato adecuado para Google Merchant, eliminando campos innecesarios como 'offerId', 'targetCountry', etc.
 * 3. Intenta actualizar el producto en Google Merchant utilizando el ID del producto y los datos transformados.
 * 4. Si se especifica, puede usar 'updateMask' para limitar los campos que se actualizarán durante la operación.
 * 5. Registra en consola el éxito de la operación junto con los datos del producto actualizado.
 * 6. Captura y maneja cualquier error durante el proceso, registrando el error y lanzando una excepción para manejo externo.
 *
 * Esta función es crucial para mantener sincronizados los datos del producto entre BigCommerce y Google Merchant, asegurando que las modificaciones
 * en una plataforma se reflejen adecuadamente en la otra. Esto facilita la gestión de inventarios y la presentación correcta de los productos en diferentes canales de venta.
 */

async function updateGoogleMerchantProduct(googleProductId, bcProduct) {


  console.log("Google Product Id: ", googleProductId);

  const transformedProduct = await transformProduct(bcProduct);
  delete transformedProduct.offerId;
  delete transformedProduct.targetCountry;
  delete transformedProduct.contentLanguage;
  delete transformedProduct.channel;

  try {
    const response = await content.products.update({
      merchantId: merchantId,
      productId: googleProductId, // ID del producto en Google Merchant Center
      resource: transformedProduct, // Datos del producto transformado
      // Si deseas especificar qué campos actualizar, puedes usar 'updateMask'
      // Por ejemplo: updateMask: 'title,link'
    });

    console.log("Producto actualizado con éxito:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar el producto:", error);
    throw error;
  }
}

/**
 * Función asíncrona para recuperar la información detallada de un producto específico desde Google Merchant utilizando la API de Google Content.
 * La función utiliza el ID del producto para realizar una solicitud GET y obtener toda la información relevante del producto en Google Merchant.
 *
 * Parámetros:
 * - productId: El ID del producto que se desea consultar. Este ID debe estar en el formato adecuado que Google Merchant requiere.
 *
 * Proceso:
 * 1. Imprime el SKU o ID del producto recibido para fines de seguimiento.
 * 2. Configura los parámetros de la solicitud, incluyendo el 'merchantId' y el 'productId', asegurándose de que el formato del ID del producto sea el correcto.
 * 3. Realiza una solicitud GET a la API de Google Content para obtener los detalles del producto.
 * 4. Si la solicitud es exitosa, devuelve los datos del producto obtenido.
 * 5. Captura y maneja cualquier error durante el proceso, deteniendo cualquier temporizador activo y lanzando una excepción para manejo externo.
 *
 * Esta función es útil para obtener información actualizada y detallada de los productos listados en Google Merchant, permitiendo a los administradores y desarrolladores verificar la exactitud y la integridad de la información del producto en el inventario de Google Merchant.
 */

async function getProductInfoGoogleMerchant(productId) { // Usa tu Merchant ID real aquí

  const scopes = ["https://www.googleapis.com/auth/content"];
/*
  // Crea un cliente de autenticación JWT utilizando las credenciales de la cuenta de servicio
  const auth = new google.auth.JWT(
    client_email,
    null,
    formattedPrivateKeyFromDb,
    scopes
  );

  const content = google.content({
    version: "v2.1",
    auth: auth, // Pasa el cliente de autenticación JWT aquí
  });

  const merchantId = 5314272709;
*/

  console.log("SKU recibido desde Info Google Merchant: ", productId)

  console.time("Duración de la obtención del producto"); // Inicia el temporizador

  try {
    const response = await content.products.get({
      merchantId: merchantId,
      productId: `online:en:US:${productId}`, // Asegúrate de que el ID del producto esté formateado correctamente
    });

    console.log("Información del producto: ", response.data.id);
    console.timeEnd("Duración de la obtención del producto"); // Detiene el temporizador y muestra la duración
    return response.data;
  } catch (error) {
    console.error("Error al obtener la información del producto: ", productId);
    console.timeEnd("Duración de la obtención del producto"); // Detiene el temporizador si hay un error
    throw error;
  }
}

/**
 * Función asíncrona para eliminar un producto específico de Google Merchant utilizando la API de Google Content.
 * Esta función recibe el ID de un producto y envía una solicitud DELETE para eliminarlo permanentemente del inventario en Google Merchant.
 *
 * Parámetros:
 * - googleProductId: El ID del producto en Google Merchant Center que se desea eliminar.
 *
 * Proceso:
 * 1. Imprime el SKU o ID del producto recibido para fines de seguimiento.
 * 2. Configura los parámetros de la solicitud DELETE, incluyendo el 'merchantId' y el 'productId'.
 * 3. Realiza una solicitud DELETE a la API de Google Content para eliminar el producto especificado.
 * 4. Registra en consola el éxito de la operación si el producto se elimina con éxito.
 * 5. Devuelve la respuesta de la API, generalmente un indicativo de que el producto ha sido eliminado.
 * 6. Captura y maneja cualquier error durante el proceso, registrando el error y lanzando una excepción para manejo externo.
 *
 * Esta función es crucial para la gestión de inventarios en Google Merchant, permitiendo a los administradores y desarrolladores eliminar productos que ya no deben estar disponibles para la venta.
 */

async function deleteGoogleMerchantProduct(googleProductId) { // Reemplaza con tu Merchant ID real
  console.log("SKU recibido desde Info Google Merchant: ", googleProductId)
  try {
    const response = await content.products.delete({
      merchantId: merchantId,
      productId: googleProductId, // ID del producto en Google Merchant Center
    });

    console.log("Producto eliminado con éxito:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    throw error;
  }
}


module.exports = {
  insertProductToGoogleMerchant,
  insertBatchProducts,
  getProductStatusByProductId,
  listAllProductStatuses,
  listAllProducts,
  findProductByBigCommerceId,
  updateGoogleMerchantProduct,
  getProductInfoGoogleMerchant,
  deleteGoogleMerchantProduct,
  deleteBatchProducts,
  initializeGoogleAuth
};
