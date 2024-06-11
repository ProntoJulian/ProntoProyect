const { listAllProductIds } = require("./api/googleMerchantAPI")
const { manageDeleteProductsProcessing,countPages } = require("./api/productsBigCommerceApi")
const { fetchOneFromTable } = require("./databases/CRUD");
require('dotenv').config();
const axios = require('axios');

const telegramToken = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

// Función principal del cron
const args = process.argv.slice(2);
const feedId = args[0];

async function deleteFeedCron(feedId){

    console.log("El cron de eliminar productos funciona correctamente: ", feedId)

}


async function sendTelegramNotification(feedId, message) {
  const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: `Feed ID: ${feedId} - ${message}`
  };

  try {
    await axios.post(telegramUrl, payload);
    console.log('Notificación enviada a Telegram');
  } catch (error) {
    console.error('Error al enviar notificación a Telegram:', error);
  }
}

async function deleteFeedCron(feedId) {
  const message = `El cron de eliminar productos funciona correctamente: ${feedId} at ${new Date().toISOString()}`;
  console.log(message);

  // Enviar notificación a Telegram
  await sendTelegramNotification(feedId, message);
}

// Simulación de la ejecución del cron
deleteFeedCron(feedId);