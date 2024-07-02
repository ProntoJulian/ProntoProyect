async function getConfigCategories(config) {
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

const fetch = require('node-fetch');


async function fetchCategoryNameById(config, categoryId) {
  const { storeHash } = config;
  const options = await getConfigCategories(config);
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/categories/${categoryId}`;

  try {
    const response = await fetch(url, options);
    const categoryData = await response.json();
    return categoryData.data.name; // Retorna el nombre de la categoría
  } catch (error) {
    console.error(`Error fetching category name for ID ${categoryId}:`/*, error*/);
    return 1// O puedes optar por devolver un valor por defecto o manejar de otra manera
  }
}

async function getStoreDomain(config) {
  const { storeHash } = config;
  const options = await getConfigCategories(config);
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v2/store`;

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const storeInfo = await response.json();
    const domain = storeInfo.domain;

    console.log(`El dominio de la tienda es: ${domain}`);
    return domain;
  } catch (error) {
    console.error(`Error fetching store domain:`, error);
    throw error; // Re-lanza el error para que la llamada a la función pueda manejarlo
  }
}

module.exports = {
  fetchCategoryNameById,
  getConfigCategories,
  getStoreDomain,
};
