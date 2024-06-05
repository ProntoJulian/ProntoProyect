let accessToken; 
let storeHash;
let options;

async function getConfigCategories(accessToken1, storeHash1) {
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


async function fetchCategoryNameById(categoryId) {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/categories/${categoryId}`;

    

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status en Category: ${response}`);
        }
        const categoryData = await response.json();
        return categoryData.data.name; // Retorna el nombre de la categoría
    } catch (error) {
        console.error(`Error fetching category name for ID ${categoryId}:`, error);
        throw error; // O puedes optar por devolver un valor por defecto o manejar de otra manera
    }
}

async function getStoreDomain() {
  const url = `https://api.bigcommerce.com/stores/${storeHash}/v2/store`;

  try {
    console.time(`getStoreDomain`);

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const storeInfo = await response.json();
    const domain = storeInfo.domain;

    console.timeEnd(`getStoreDomain`);
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
    getStoreDomain
};