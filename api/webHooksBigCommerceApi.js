const fetch = require("node-fetch");
require("dotenv").config();

const {generateHash} = require("../helpers/helpers.js")

const storeHash = process.env.STOREHASH;
const accessToken = process.env.ACCESS_TOKEN;
const urlGCloud = process.env.URL_GCLOUD;

const optionsGet = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": accessToken,
    },
  };

  const optionsDelete = {
    method: 'DELETE',
    headers: {
      'X-Auth-Token': accessToken,
      'Content-Type': 'application/json'
    }
  };


/**
 * Función asíncrona para recuperar los webhooks registrados de una tienda en BigCommerce.
 * Utiliza las variables `storeHash` y `accessToken` para autenticarse y realizar una solicitud GET a la API de BigCommerce.
 * Si la respuesta es exitosa, devuelve los datos de los webhooks en formato JSON. Cualquier error en la respuesta o en el proceso
 * es capturado y registrado en la consola.
 */

async function fetchWebHooks() {
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`;

  try {
    const response = await fetch(url, optionsGet);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    console.log(json);
    return json; // Retorna el JSON con la lista de webhooks
  } catch (error) {
    console.error("Error fetching webhooks:", error);
  }
}

async function activateAllWebHooks() {
  try {
    const webHooksData = await fetchWebHooks(); // Llama a la función que recupera todos los webhooks
    if (!webHooksData || webHooksData.data.length === 0) {
      console.log("No se encontraron webhooks");
      return;
    }

    const updates = webHooksData.data.map(async (webhook) => {
      if (!webhook.is_active) { // Solo actualiza los que no están activos
        const updateData = {
          ...webhook,
          is_active: true // Cambia is_active a true
        };
        return updateWebhook(webhook.id, updateData);
      }
    });

    // Ejecuta todas las actualizaciones en paralelo
    const results = await Promise.all(updates);
    console.log("Todos los webhooks han sido actualizados para estar activos", results);
  } catch (error) {
    console.error("Error en activateAllWebHooks:", error);
  }
}

async function updateWebhook(webhookId, updateData) {
  const storeHash = process.env.STOREHASH; // Debería estar definido en tu archivo .env
  const accessToken = process.env.ACCESS_TOKEN;
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks/${webhookId}`;

  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': accessToken
    },
    body: JSON.stringify(updateData) // Convierte los datos de actualización a un string JSON
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    console.log("Webhook actualizado:", json);
    return json; // Retorna el JSON con la respuesta de la actualización del webhook
  } catch (error) {
    console.error("Error updating webhook:", error);
    throw error; // Relanza el error para manejo adicional si es necesario
  }
}


/**
 * Función asíncrona para crear un webhook en una tienda de BigCommerce.
 * Requiere 'scope' y 'destination' como parámetros para configurar el nuevo webhook.
 * El webhook se crea activo y puede incluir cabeceras personalizadas si se requieren.
 * Utiliza la autenticación mediante 'storeHash' y 'accessToken' para realizar una solicitud POST a la API de BigCommerce.
 * Si la creación es exitosa, devuelve los datos del webhook creado. Los errores durante la solicitud son capturados,
 * registrados en la consola y luego re-lanzados para su manejo externo.
 */

async function createWebhook(scope, destination) {
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`;

  const body = {
    scope: scope,
    destination: destination,
    is_active: true,
    headers: {}, // Aquí puedes añadir cabeceras personalizadas si las necesitas
  };

  try {
    const response = await fetch(url, optionsPost);
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error creating webhook: ", error);
    throw error;
  }
}


/**
 * Función asíncrona diseñada para crear un webhook en BigCommerce que se activa cuando se actualiza un producto específico.
 * Esta función genera una marca de tiempo UNIX actual y un hash de seguridad para garantizar que la información
 * enviada es auténtica. El webhook notifica a una URL específica en Google Cloud cuando se actualiza el producto.
 *
 * Parámetros:
 * - productID: Identificador del producto a monitorizar para actualizaciones.
 *
 * Proceso:
 * 1. Prepara los datos del webhook, incluyendo el 'scope', 'destination', y otros detalles relevantes.
 * 2. Envía una solicitud POST a la API de BigCommerce para crear el webhook.
 * 3. Captura y maneja errores durante la creación del webhook, proporcionando detalles de error en la consola.
 * 4. Registra la respuesta de la creación del webhook para confirmar el éxito de la operación.
 *
 * La función asegura que cualquier error en la creación del webhook es registrado y muestra información detallada sobre el problema.
 */

async function createWebhookToUpdateProduct(productID) {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`;
    const producer = `stores/${storeHash}`;
  
    // Obtener la marca de tiempo UNIX actual
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log("La marca de tiempo UNIX actual es:", currentTimestamp);
  
    const dataToHash = {
      store_id: storeHash,
      data: {
        type: "product",
        id: productID,
      },
      created_at: currentTimestamp,
      producer: producer,
    };
  
    const hashValue = generateHash(dataToHash); 
  
    const webhookPayload = {
      scope: "store/product/updated",
      destination: `${urlGCloud}/updatedProduct`,
      is_active: true,
      headers: {},
      store_id: storeHash,
      data: dataToHash.data,
      hash: hashValue,
      created_at: currentTimestamp,
      producer: producer,
    };

    const optionsPost = {
      method: "POST",
      headers: {
        "X-Auth-Token": accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(webhookPayload),
    };
  
    try {
        const response = await fetch(url, optionsPost);
        const responseBody = await response.json(); // Asegúrate de leer el cuerpo de la respuesta siempre
        if (!response.ok) {
          console.error('Respuesta de la API:', responseBody); // Esto te mostrará el mensaje de error detallado de la API
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Webhook creado exitosamente:", responseBody);
      } catch (error) {
        console.error("Error al crear el webhook:", error);
      }
      
  }


  /**
 * Función asíncrona para eliminar un webhook específico en BigCommerce.
 * Utiliza el ID del webhook para formar la URL necesaria para una solicitud DELETE.
 *
 * Parámetros:
 * - webhookId: Identificador único del webhook que se desea eliminar.
 *
 * Proceso:
 * 1. Configura las opciones de la solicitud HTTP, incluyendo el método DELETE y los encabezados necesarios para autenticación.
 * 2. Realiza la solicitud HTTP a la API de BigCommerce para eliminar el webhook especificado.
 * 3. Verifica la respuesta: si es exitosa, registra un mensaje de éxito; si no, obtiene y registra los detalles del error.
 * 4. Maneja cualquier error de conexión o solicitud con un registro detallado del error.
 *
 * Esta función asegura que se manejen adecuadamente los errores durante la eliminación, proporcionando claridad sobre el estado de la operación.
 */


  async function deleteWebhook(webhookId) {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks/${webhookId}`;

  
    try {
      const response = await fetch(url, optionsDelete);
      if (response.ok) {
        console.log("Webhook eliminado con éxito.");
      } else {
        const errorData = await response.json();
        console.error("Error al eliminar el webhook: ", errorData);
      }
    } catch (error) {
      console.error("Error en la solicitud para eliminar el webhook: ", error);
    }
  }


  /**
 * Función asíncrona para crear un webhook en BigCommerce que se activará cuando un producto sea eliminado.
 * La función configura y envía una solicitud POST para registrar un nuevo webhook que notifique a una URL especificada
 * en Google Cloud cada vez que se elimine un producto en la tienda.
 *
 * Proceso:
 * 1. Genera una marca de tiempo UNIX actual y utiliza esta junto con el ID de la tienda para crear un hash de seguridad.
 * 2. Configura el payload del webhook especificando el ámbito para productos eliminados, la URL de destino, 
 *    y otros metadatos relevantes como el ID de la tienda y la marca de tiempo.
 * 3. Envía una solicitud POST a la API de BigCommerce con los detalles del webhook.
 * 4. Verifica la respuesta de la API y maneja los estados de éxito o error adecuadamente.
 *    En caso de éxito, logra la creación del webhook; en caso de error, muestra detalles del error y lanza una excepción.
 *
 */


  async function createWebhookToDeleteProduct() {

    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`;
    const producer = `stores/${storeHash}`;
  
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log("La marca de tiempo UNIX actual es:", currentTimestamp);
  
    const dataToHash = {
      store_id: storeHash,
      created_at: currentTimestamp,
      producer: producer,
    };
  
    const hashValue = generateHash(dataToHash); // Asegúrate de tener esta función definida o reemplázala por tu método de generación de hash
  
    const webhookPayload = {
      scope: "store/product/deleted",
      destination: `${urlGCloud}/deletedProduct`,
      is_active: true,
      headers: {},
      store_id: storeHash,
      data: dataToHash.data,
      hash: hashValue,
      created_at: currentTimestamp,
      producer: producer,
    };

    const optionsPost = {
      method: "POST",
      headers: {
        "X-Auth-Token": accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(webhookPayload),
    };
  
    try {
      const response = await fetch(url, optionsPost);
      const responseBody = await response.json(); // Asegúrate de leer el cuerpo de la respuesta siempre
      if (!response.ok) {
        console.error('Respuesta de la API:', responseBody); // Esto te mostrará el mensaje de error detallado de la API
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Webhook para producto eliminado creado exitosamente:", responseBody);
    } catch (error) {
      console.error("Error al crear el webhook para producto eliminado:", error);
    }
  }
  

module.exports = {
  fetchWebHooks,
  createWebhookToUpdateProduct,
  deleteWebhook,
  createWebhookToDeleteProduct,
  activateAllWebHooks
};
