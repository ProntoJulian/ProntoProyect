const express = require("express");
const routerMerchant = express.Router();

const {
  fetchProductById,
  countAvailableProducts,
  getAvailableProducts2,
  getLimitedValidProducts,
} = require("../../api/productsBigCommerceApi");

const { transformProduct } = require("../../helpers/helpers");

const {
  insertProductToGoogleMerchant,
  insertBatchProducts,
  getProductStatusByProductId,
  listAllProductStatuses,
  listAllProducts,
} = require("../../api/googleMerchantAPI");

const { manageDeleteProductsProcessing } = require("../../api/productsBigCommerceApi")

routerMerchant.get("/merchant/sendProductByID", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const idProducto = 124;
  const product = await fetchProductById(idProducto);
  console.log("Id Producto Usado: ", idProducto);
  console.log("Producto: ", product);
  const transformedProducto = await transformProduct(product);
  console.log("Producto transformado: ", transformedProducto);

  await insertProductToGoogleMerchant(transformedProducto);
});

routerMerchant.get("/merchant/sendBatchProducts", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const numeroProductos = 10;
  const products = await getAvailableProducts2(numeroProductos);
  console.log("Productos: ", products);
  const transformedProductos = products.map((product) =>
    transformProduct(product)
  );
  //const transformedProducto = transformProduct(product);
  //console.log("Productos transformados: ", transformedProductos);

  await insertBatchProducts(transformedProductos);
});

routerMerchant.get("/merchant/sendBatchNumberOfProducts", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const numeroProductos = 1;
  const products = await getLimitedValidProducts(numeroProductos);
  console.log("Productos: ", products.validProductIds);
  const transformedProductos = await Promise.all(
    products.validProductIds.map((product) => transformProduct(product))
  );
  //const transformedProducto = transformProduct(product);
  console.log("Productos transformados: ", transformedProductos);

  await insertBatchProducts(transformedProductos);
});

routerMerchant.get(
  "/merchant/getProductStatusByProductId",
  async (req, res) => {
    res.send("Se ha hecho una consulta a un producto");
    const idProducto = "online:en:US:3231-4";
    const products = await getProductStatusByProductId(idProducto);
    //console.log("Productos: ", products);
  }
);

routerMerchant.get("/merchant/listProductStatuses", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const products = await listAllProductStatuses();
  console.log("Productos: ", products);
});

routerMerchant.get("/merchant/listAllProducts", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const products = await listAllProducts();
  //console.log("Productos: ", products);
});

routerMerchant.get("/merchant/deleteProductWeekly", async (req, res) => {
  res.send("Se ha hecho una consulta a un producto");
  const products = await listAllProductIds();
  const conteoPages= await countPages();
  await manageDeleteProductsProcessing(conteoPages,products)
  console.log("Primeros 5 productos:", products.slice(0, 5));
  //console.log("Productos: ", products);
});

module.exports = routerMerchant;
