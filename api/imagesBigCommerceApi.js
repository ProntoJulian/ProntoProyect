const fetch = require('node-fetch');
require('dotenv').config()

let accessToken; 
let storeHash;
let options;

async function getConfigImages(accessToken1, storeHash1) {
  accessToken = accessToken1;
  storeHash = storeHash1;

  options = {
    method: "GET",
    headers: {
      "X-Auth-Token": accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

}

/**
 * Función asíncrona para recuperar las imágenes asociadas a un producto específico en BigCommerce.
 * Utiliza la API de BigCommerce para obtener todas las imágenes del producto dado su ID.
 *
 * Parámetros:
 * - productId: El ID del producto del que se desean obtener las imágenes.
 *
 * Proceso:
 * 1. Construye la URL para acceder a las imágenes del producto utilizando el 'storeHash' y el 'accessToken' definidos en las variables de entorno.
 * 2. Configura las opciones para una solicitud GET, incluyendo los encabezados necesarios para la autenticación y la aceptación de JSON.
 * 3. Realiza la solicitud GET a la API de BigCommerce para obtener las imágenes del producto.
 * 4. Verifica si la respuesta es exitosa; en caso contrario, registra un error y retorna un array vacío.
 * 5. Procesa la respuesta para extraer los datos de las imágenes, suponiendo que se desea retornar solamente las URLs de estas.
 * 6. Retorna un array con los datos de las imágenes, o un array vacío si se produce un error.
 *
 * Esta función es crucial para los sistemas que necesitan visualizar o verificar las imágenes de los productos, permitiendo la fácil integración y visualización de recursos gráficos asociados a los productos en tiendas online y otras plataformas.
 */

async function getProductImages(productId) {
    const imagesUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/images`;

    try {
        const response = await fetch(imagesUrl, options);
        if (!response.ok) {
            const errorText = await response.text(); // Convert the response to text
            console.error(`HTTP error! [${productId}/${storeHash}] status desde Images 47: ${response.status}, response text: ${errorText}`);
            return []; // Retorna un array vacío en caso de error
        }
        const data = await response.json();
        // Suponiendo que queremos devolver solo las URLs de las imágenes
        //const imageUrls = data.data.map(image => image.url);
        //console.log(`Imagenes del producto ID ${productId}: ${imageUrls.join(', ')}`);
        
        if (data.data && data.data.length > 1) {
            const [primerImagen, ...ImagenesRestantes] = data.data;
            return { primerImagen, ImagenesRestantes }; // Retorna el primer elemento y el resto de imágenes
        } else {
            return { primerImagen:data.data[0], ImagenesRestantes: [] }; // Retorna objeto con valores predeterminados si no hay imágenes
        }
       
    } catch (error) {
        console.error('Error fetching product images:', error);
        return []; // Retorna un array vacío en caso de error
    }
}

/**
 * Función asíncrona para obtener la primera imagen de un producto específico en BigCommerce utilizando la API de BigCommerce.
 * Esta función busca y devuelve la URL de la primera imagen asociada con el producto identificado por su ID.
 *
 * Parámetros:
 * - productId: El ID del producto del que se desea obtener la imagen.
 *
 * Proceso:
 * 1. Configura la URL para acceder a las imágenes del producto usando 'storeHash' y 'accessToken', que deben estar definidos en las variables de entorno.
 * 2. Configura las opciones para una solicitud GET, incluyendo los encabezados necesarios para la autenticación y la aceptación de datos en formato JSON.
 * 3. Realiza la solicitud GET a la API de BigCommerce para recuperar las imágenes del producto especificado.
 * 4. Verifica si la respuesta es exitosa; si no, registra un error y retorna un array vacío.
 * 5. Extrae y retorna el primer elemento del array de imágenes si está disponible, asegurando que sólo se devuelva la URL de la primera imagen.
 * 6. Captura y maneja cualquier error durante el proceso, registrando el error y retornando un array vacío como resultado.
 *
 * Esta función es útil para aplicaciones que necesitan acceder rápidamente a la imagen principal de un producto para visualización en interfaces de usuario o en sistemas de marketing y publicidad.
 */

async function getURLImage(productId) {
    const imagesUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/images`;

    try {
        const response = await fetch(imagesUrl, options);
        if (!response.ok) {
            console.error(`HTTP error! status Images URL: ${response}`);
            return []; // Retorna un array vacío en caso de error
        }
        const data = await response.json();
        return data.data[0]; // Retorna un array de URLs de imágenes
    } catch (error) {
        console.error('Error fetching product images 98:', error);
        return []; // Retorna un array vacío en caso de error
    }
}


module.exports = {
    getProductImages,
    getURLImage,
    getConfigImages
};