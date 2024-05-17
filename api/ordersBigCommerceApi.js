const fetch = require('node-fetch');
require('dotenv').config()


const storeHash = process.env.STOREHASH;
const accessToken = process.env.ACCESS_TOKEN;
const options = {
    method: 'GET',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Auth-Token': accessToken
    }
};

/**
 * Función asíncrona que verifica si una orden específica existe en la tienda de BigCommerce utilizando su API.
 * Utiliza el identificador de la orden para realizar una solicitud GET y determina la existencia de la orden basada en la respuesta de la API.
 *
 * Parámetros:
 * - idOrder: El identificador de la orden que se desea verificar.
 *
 * Proceso:
 * 1. Construye la URL utilizando el identificador de la tienda obtenido de las variables de entorno y el ID de la orden.
 * 2. Realiza una solicitud GET a la API de BigCommerce para obtener detalles de la orden especificada.
 * 3. Analiza la respuesta: si es exitosa y la orden existe, retorna true.
 * 4. Si la API devuelve un estado 404, indica que la orden no existe y retorna false.
 * 5. Si la API devuelve cualquier otro estado de error, lanza una excepción indicando el problema.
 * 6. Captura cualquier error en el proceso de solicitud, registra el error y retorna false.
 *
 * Esta función es esencial para operaciones que requieren validación de la existencia de una orden antes de proceder con acciones subsecuentes.
 */


const checkOrderExists = async (idOrder) => {
    const url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders/${idOrder}`;

    try {
        const response = await fetch(url, options);
        const order = await response.json();

        //console.log("Order encontrada en BigCommers: ", order)

 

        if (response.ok) {
            return true;
        } else if (response.status === 404) {
            return false;
        } else {
            throw new Error(`API returned status ${response.status}`);
        }
    } catch (err) {
        console.error('Error fetching order:', err);
        return false;
    }
};

/**
 * Función asíncrona para obtener y simplificar los detalles de una orden específica de BigCommerce.
 * La función busca la orden por su ID y transforma la información obtenida en un formato simplificado.
 *
 * Parámetros:
 * - idOrder: El identificador único de la orden que se desea obtener.
 *
 * Proceso:
 * 1. Construye la URL utilizando el identificador de la tienda almacenado en las variables de entorno y el ID de la orden.
 * 2. Realiza una solicitud GET a la API de BigCommerce para recuperar los detalles completos de la orden.
 * 3. Extrae y simplifica la información relevante de la orden, incluyendo el ID, la fecha de envío, el estado de la orden, y el email de la dirección de facturación.
 * 4. Retorna un objeto con los datos simplificados de la orden.
 * 5. Captura y registra cualquier error durante la solicitud o el procesamiento de la respuesta y re-lanza el error para manejo externo.
 *
 * Este enfoque asegura que solo se manejen los datos esenciales de la orden, facilitando la integración y manipulación de estos datos en otras partes del sistema.
 */

const getOrder = async (idOrder) => {
    let url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders/${idOrder}`;

    try {
        const response = await fetch(url, options);
        const order = await response.json();

        //console.log("Respuesta de Order: ", order)

        // Mapea los resultados para obtener "id", "date_shipped", "status" y "billing_address.email"
        const simplifiedOrders = {
            id: order.id,
            date_shipped: order.date_shipped,
            status: order.status,
            billing_address_email: order.billing_address.email // Accede al email dentro de billing_address
        };

        return simplifiedOrders;
    } catch (err) {
        console.error('Error fetching orders:', err);
        throw err;
    }
};

/**
 * Función asíncrona para contar las órdenes en BigCommerce y desglosar las cuentas por el estado de cada orden.
 * La función realiza una solicitud a la API para obtener el número total de órdenes y el detalle por cada estado posible de las órdenes.
 *
 * Proceso:
 * 1. Construye la URL para acceder al endpoint que proporciona el conteo de órdenes en la tienda especificada.
 * 2. Realiza una solicitud GET a la API de BigCommerce para obtener los datos del conteo de órdenes.
 * 3. Imprime en la consola el número total de órdenes y, posteriormente, los detalles de cada estado de las órdenes incluyendo ID, nombre, conteo, y orden de clasificación.
 * 4. Captura y registra cualquier error durante la solicitud o el procesamiento de datos y re-lanza el error para manejo externo.
 *
 * Esta función es útil para administradores y desarrolladores que necesitan un resumen rápido del volumen de órdenes y su distribución por estado, facilitando tareas de análisis y reporte.
 */

const countOrders = async () => {
    let url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders/count`;

    

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        // Mostrar el conteo total primero
        console.log('-------------------------------');
        console.log(`CONTEO TOTAL: ${data.count}`);
        console.log('------------------------------');

        // Mostrar detalles de cada status de orden
        data.statuses.forEach(status => {
            console.log('-------------------------------');
            console.log(`id: ${status.id},`);
            console.log(`name: ${status.name}`);
            console.log(`count: ${status.count},`);
            console.log(`sort_order: ${status.sort_order}`);
        });

        //console.log("Respuesta de Order: ", order)


        //return order;
    } catch (err) {
        console.error('Error fetching orders:', err);
        throw err;
    }
};


/**
 * Función asíncrona para obtener el número total de órdenes de un estado específico en BigCommerce.
 * Itera sobre las páginas de órdenes hasta que no hay más páginas disponibles o hasta que las órdenes devueltas en una página sean menos del límite establecido.
 *
 * Parámetros:
 * - statusID: El identificador del estado de las órdenes que se desea consultar.
 * - limit: El número máximo de órdenes a retornar por página.
 *
 * Proceso:
 * 1. Define una URL base y agrega parámetros para filtrar las órdenes por estado y limitar el número de resultados por página.
 * 2. Utiliza un bucle para hacer solicitudes iterativas incrementando la página hasta que no haya más órdenes para el estado dado.
 * 3. En cada iteración, realiza una solicitud GET para obtener las órdenes de la página actual.
 * 4. Suma al contador total la cantidad de órdenes recibidas.
 * 5. Si la cantidad de órdenes es menor que el límite, o igual a cero, establece que no hay más páginas.
 * 6. Captura y maneja errores en las solicitudes, registrando los errores y lanzando excepciones para manejo externo.
 * 7. Al final del proceso, imprime y retorna el total de órdenes para el estado especificado.
 *
 * Esta función es útil para reportes y análisis administrativos, permitiendo un seguimiento eficaz del volumen de órdenes por estado específico.
 */

async function fetchAllOrdersByStatus(statusID, limit) {
    let totalCount = 0;
    let page = 1;
    let hasMorePages = true;
    let orderUrlBase = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders`;

    while (hasMorePages) {
        let orderUrl = `${orderUrlBase}?status_id=${statusID}&limit=${limit}&page=${page}`;

        try {
            const response = await fetch(orderUrl, options);
            const orders = await response.json();

            totalCount += orders.length;

            if (orders.length === 0 || orders.length < limit) {
                hasMorePages = false;
            } else {
                page++;
            }

        } catch (err) {
            console.error('Error fetching orders:', err);
            throw err;
        }
    }

    console.log(`Total de órdenes con el estado ${statusID}:`, totalCount);
    return totalCount;
}

/**
 * Función asíncrona para obtener y simplificar la lista de órdenes desde la API de BigCommerce.
 * Esta función extrae y reformatea los detalles clave de cada orden para proporcionar una visión simplificada.
 *
 * Proceso:
 * 1. Construye la URL para acceder a las órdenes en la tienda especificada utilizando las variables de entorno para el identificador de la tienda.
 * 2. Realiza una solicitud GET a la API de BigCommerce para obtener todas las órdenes disponibles.
 * 3. Mapea los resultados para extraer y simplificar los atributos más importantes de cada orden, como el ID, la fecha de envío y el estado de la orden.
 * 4. Devuelve una lista de órdenes simplificadas con los atributos especificados.
 * 5. Captura y maneja cualquier error durante la solicitud o el procesamiento de datos, registrando el error y lanzando una excepción para manejo externo.
 *
 * Esta función es útil para aplicaciones que requieren una rápida visualización o procesamiento de órdenes sin necesidad de manejar toda la información detallada que la API proporciona.
 */

const getOrders = async () => {
    let url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders`;

    try {
        const response = await fetch(url, options);
        const orders = await response.json();

        //console.log("Respuesta de Order: ", order)

        // Mapea los resultados para obtener "id", "date_shipped", "status" y "billing_address.email"
        const simplifiedOrders = orders.map(order => ({
            id: order.id,
            date_shipped: order.date_shipped,
            status: order.status
          }));

        return simplifiedOrders;
    } catch (err) {
        console.error('Error fetching orders:', err);
        throw err;
    }
};


/**
 * Función asíncrona para obtener y filtrar los envíos de una orden específica en BigCommerce.
 * Utiliza el identificador de la orden para realizar una solicitud GET y obtener los detalles de los envíos asociados.
 *
 * Parámetros:
 * - order: Un objeto que representa la orden, debe contener al menos el 'id' de la orden.
 *
 * Proceso:
 * 1. Construye la URL para acceder a los envíos de la orden especificada utilizando el 'id' de la orden y las variables de entorno para el identificador de la tienda.
 * 2. Realiza una solicitud GET a la API de BigCommerce para obtener los envíos de la orden.
 * 3. Verifica si la API retorna un estado 204, indicando que no hay envíos disponibles, y retorna un arreglo con un elemento indicativo de 'No disponible'.
 * 4. Si la respuesta de la API no es exitosa, captura el texto del error, lanza una excepción y detiene el proceso.
 * 5. Filtra los envíos obtenidos basándose en el estado de la orden y mapea los resultados para extraer y simplificar los atributos más relevantes como el ID del envío y el número de seguimiento.
 * 6. Devuelve una lista de envíos filtrada y simplificada.
 * 7. Captura y maneja cualquier error durante la solicitud o el procesamiento de datos, registrando el error y lanzando una excepción para manejo externo.
 *
 * Esta función es útil para sistemas que requieren información específica sobre los envíos de las órdenes, permitiendo un manejo eficaz y condicional basado en el estado de la orden.
 */

const getShipments = async (order) => {
    const id = order.id;
    let url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders/${id}/shipments`;


    try {
        const response = await fetch(url, options);

        if (response.status === 204) {
            console.log(`No shipments found for order ID: ${id}`);
            return [{ id: null, tracking_number: "Not Available" }];; 
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${errorText}`);
        }

        const shipments = await response.json();

        // Filtra por estados específicos y retorna los resultados
        const filteredShipments = shipments.filter(shipment => 
            ["Shipped", "Completed", "Partially Shipped"].includes(order.status)
        ).map(shipment => ({
            id: shipment.id,
            tracking_number: shipment.tracking_number || "Not Available",
        }));

        return filteredShipments;
    } catch (err) {
        console.error('Error fetching shipments:', err);
        throw err;
    }
};

/**
 * Función asíncrona para buscar una orden específica por el email asociado a la dirección de facturación en BigCommerce.
 * Itera sobre todas las páginas de órdenes hasta encontrar una que coincida con el email proporcionado o hasta que no haya más páginas.
 *
 * Parámetros:
 * - email: El correo electrónico a buscar en las direcciones de facturación de las órdenes.
 *
 * Proceso:
 * 1. Inicializa la búsqueda con la primera página de órdenes y prepara para iterar sobre las páginas siguientes si es necesario.
 * 2. Construye la URL para obtener órdenes y realiza una solicitud GET a la API de BigCommerce.
 * 3. Si la respuesta no es exitosa, lanza un error y termina la búsqueda.
 * 4. Procesa la respuesta y busca entre las órdenes de la página una que tenga una dirección de facturación con un email que coincida con el proporcionado.
 * 5. Si encuentra una orden, termina la búsqueda y la devuelve; si no, verifica si hay más páginas y continúa.
 * 6. En caso de error durante la solicitud o procesamiento, registra el error y termina la búsqueda.
 * 7. Retorna la orden encontrada o `undefined` si no se encuentra ninguna que coincida.
 *
 * Esta función es útil para identificar rápidamente una orden basada en el email del cliente, lo que puede ser necesario para el servicio al cliente o la administración de órdenes.
 */

async function findOrderByEmail(email) {
    let foundOrder;
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        let url = `https://api.bigcommerce.com/stores/${process.env.STOREHASH}/v2/orders?page=${page}`;

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const orders = await response.json();
            if (orders.length === 0) {
                hasMorePages = false;
            } else {
                // Buscar el email en la lista de órdenes recibida
                foundOrder = orders.find(order => order.billing_address && order.billing_address.email.toLowerCase() === email.toLowerCase());
                if (foundOrder) break; // Si se encuentra, termina la búsqueda
                page++; // Si no, continúa a la siguiente página
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            break; // En caso de error, termina la búsqueda
        }
    }

    return foundOrder; // Devuelve la orden encontrada o undefined si no se encontró
}

module.exports = { 
    getOrder, 
    getShipments, 
    checkOrderExists, 
    findOrderByEmail, 
    getOrders, 
    countOrders,
    fetchAllOrdersByStatus
};