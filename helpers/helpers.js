const fetch = require('node-fetch');
const crypto = require('crypto');
const cron = require('node-cron');


async function transformProduct(bcProduct) {
  const { getProductImages } = require("../api/imagesBigCommerceApi");
  const {fetchCategoryNameById} = require("../api/categoriesBigCommerceApi");

  const {primerImagen, ImagenesRestantes} = await getProductImages(bcProduct.id);


  let Category;
  if (bcProduct.categories.length > 0) {
    //console.log("ID de la categoria: ", bcProduct.categories[0])
    Category = await fetchCategoryNameById(bcProduct.categories[0]);
  }
  // Configura aquí las propiedades que son comunes entre BigCommerce y Google Merchant Center
  const googleProductFormat = {
    offerId: bcProduct.sku,
    title: bcProduct.name,
    description: bcProduct.description, //.replace(/<[^>]*>?/gm, ""), // Eliminar etiquetas HTML
    imageLink: `<g:image_link>${primerImagen.url_standard}</g:image_link>`,
    contentLanguage: "en",
    targetCountry: "us",
    channel: "online",
    googleProductCategory: 'Home & Garden', // Ejemplo, debería ser específico para tu producto
    condition: bcProduct.condition,
    availability: "in_stock",
    customLabel0: bcProduct.inventory_level.toString(),
    price: {
      value: bcProduct.price || bcProduct.calculated_price,
      currency: "USD",
    },
    // Agrega más campos según corresponda...
    // A continuación, se muestran algunos campos adicionales que podrías querer mapear:
    brand: "Home & Garden",
    gtin: bcProduct.upc,
    mpn: bcProduct.mpn,
    productTypes: Category,
  };

  if(bcProduct.sale_price>0){
     const salePrice = bcProduct.sale_price;
     googleProductFormat.sale_price= [{
      value: salePrice,
      currency: "USD",
    }]
  }

  if (bcProduct.fixed_cost_shipping_price > 0) {
    googleProductFormat.shipping = [{
      country: "US",
      service: "Standard shipping",
      price: {
        currency: "USD",
        value: bcProduct.fixed_cost_shipping_price.toString(),
      },
    }];
  }

  // Manejo de imágenes adicionales
  if (ImagenesRestantes && ImagenesRestantes.length > 0) {
    googleProductFormat.additional_image_links = ImagenesRestantes.map(img => `<g:image_link>${img.url_standard}</g:image_link>`);
  }

  // Calcula la fecha de hoy y agrega 21 días
  
  const today = new Date();
  today.setDate(today.getDate() + 21);
  const availabilityDate = today.toISOString().slice(0, 19) + '+00:00'; // Formato ISO 8601 con desplazamiento de zona horaria

  if (bcProduct.availability === "preorder") {
    googleProductFormat.availability = "preorder";

    googleProductFormat.availability_date = availabilityDate;
  }else if(bcProduct.availability === "disabled"){
    googleProductFormat.availability = "out_of_stock"
  }

  return googleProductFormat;
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const formatPriceForGoogleMerchant = (price) => {
    return {
        value: price.toFixed(2), // Asegura que el precio tenga dos decimales
        currency: 'USD' // Ajusta la moneda según sea necesario
    };
};

async function fetchWithRetry(url, options, retries = 3, backoff = 2000) { //800 bien hasta 6 1200 con 8 //1500 Para El 2
    try {
        const response = await fetch(url, options);
        if (!response.ok && retries > 0) {
            await delay(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2); // Incrementa el tiempo de espera
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            await delay(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}



function generateHash(data) {
    const hash = crypto.createHash('sha1');
    hash.update(JSON.stringify(data));  // Convierte los datos a una cadena JSON y actualiza el hash con ella
    return hash.digest('hex');  // Devuelve el hash en formato hexadecimal
}

const algorithm = 'aes-256-cbc';  // Puedes elegir otro algoritmo
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function cleanPrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, '\n').trim();
}


function encrypt(text) {
  text = text.replace(/\\n/g, '\n');
  console.log('Texto a encriptar:', text);
  let cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  console.log('Texto encriptado:', encrypted);
  return { iv: iv.toString('hex'), encryptedData: encrypted };
}

function decrypt(text) {
  if (!text || !text.iv || !text.encryptedData) {
    throw new Error("Invalid encrypted data format");
  }
  let iv = Buffer.from(text.iv, 'hex');
  let encryptedText = Buffer.from(text.encryptedData, 'hex');
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  console.log('Texto desencriptado:', decrypted);
  return decrypted;
}

function logMemoryUsage(label) {
  const memoryUsage = process.memoryUsage();
  console.log(`${label} - Memory Usage: RSS: ${memoryUsage.rss / 1024 / 1024} MB, Heap Total: ${memoryUsage.heapTotal / 1024 / 1024} MB, Heap Used: ${memoryUsage.heapUsed / 1024 / 1024} MB, External: ${memoryUsage.external / 1024 / 1024} MB`);
}


function createCronJobs(selectedDays, intervalHour, isActive) {
    if (!isActive) {
        console.log("Cron is not active. Skipping cron creation.");
        return;
    }

    // Mapping days of the week to cron format
    const dayMap = {
        'monday': '1',
        'tuesday': '2',
        'wednesday': '3',
        'thursday': '4',
        'friday': '5',
        'saturday': '6',
        'sunday': '0'
    };

    // Split the selectedDays string into an array
    const daysArray = selectedDays.split(';').map(day => day.trim());

    // Convert the array of days to a string format that cron can use
    const cronDays = daysArray.map(day => dayMap[day.toLowerCase()]).join(',');

    // Convert intervalHour to cron format
    const cronExpression = `0 */${intervalHour} * * ${cronDays}`;

    // Ensure no duplicate cron jobs are created
    if (cron.validate(cronExpression)) {
        cron.schedule(cronExpression, () => {
            console.log(`Running cron job on days: ${selectedDays} every ${intervalHour} hour(s)`);
            // Your cron job code here
        });

        console.log(`Cron job created with expression: ${cronExpression}`);
    } else {
        console.log(`Invalid cron expression: ${cronExpression}`);
    }
}


const createSimpleCron = async () => {
  const cronExpression = '*/10 * * * * *'; // cada 10 segundos
  let executionCount = 0; // Variable para contar las ejecuciones

  if (cron.validate(cronExpression)) {
      cron.schedule(cronExpression, () => {
          executionCount++; // Incrementar el contador en cada ejecución
          console.log(`Cron job running every 10 seconds. Execution count: ${executionCount}`);
          // Aquí puedes poner el código que deseas que se ejecute cada 10 segundos
      });

      console.log(`Cron job created with expression: ${cronExpression}`);
  } else {
      console.log(`Invalid cron expression: ${cronExpression}`);
  }
};



// Usar fetchWithRetry en lugar de fetch directamente


module.exports = {
  transformProduct,
  delay,
  fetchWithRetry,
  generateHash,
  encrypt,
  decrypt,
  logMemoryUsage,
  createCronJobs,
  createSimpleCron
};
