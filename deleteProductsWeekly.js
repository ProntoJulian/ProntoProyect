const { listAllProductIds } = require("./api/googleMerchantAPI")
const { manageDeleteProductsProcessing,countPages } = require("./api/productsBigCommerceApi")
const { fetchOneFromTable } = require("./databases/CRUD");
require('dotenv').config();
const axios = require('axios');

const telegramToken = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

async function sendTelegramNotification(feedId, message) {
  const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: `Feed ID: ${feedId} - ${message}`
  };

  try {
    const response = await axios.post(telegramUrl, payload);
    console.log('Notificación enviada a Telegram:', response.data);
  } catch (error) {
    console.error('Error al enviar notificación a Telegram:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function deleteFeedCron(feedId) {
  const message = `El cron de eliminar productos funciona correctamente: ${feedId} at ${new Date().toISOString()}`;
  console.log(message);

  try {
    // Enviar notificación a Telegram
    await sendTelegramNotification(feedId, message);
  } catch (error) {
    console.error('Error durante la ejecución del cron:', error.message);
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

// Manejo de señales
process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT, limpiando y cerrando el proceso...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM, limpiando y cerrando el proceso...');
  process.exit(0);
});