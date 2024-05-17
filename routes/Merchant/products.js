const express = require("express");
const routerProducts= express.Router();

const {
    fetchProductById,
    getAvailableProducts,
    checkCustomField,
    getProductCustomFields,
    getAvailableProducts2,
    countPages,
    manageProductProcessing} = require("../../api/productsBigCommerceApi");

const { transformProduct } = require("../../helpers/helpers")

routerProducts.get("/products/getProductByID", async (req, res) => {
    res.send("Se ha hecho una consulta a un producto");
    const idProducto = 87341;
    const product = await fetchProductById(idProducto);
    console.log("Id Producto Usado: ", product);

    console.log("Producto: ", product);
    const respuesta = await checkCustomField(idProducto);
    console.log("Respuesta: ", respuesta);
    
    const respuestaCustomFliends = await getProductCustomFields(idProducto);
    console.log("Respuesta CustomFliends: ", respuestaCustomFliends);

})

routerProducts.get("/products/countAvailableProducts", async (req, res) => {
    res.send("Se ha hecho una consulta a un producto");
    //const conteoPages= await countPages();
    const conteoByTipo = await getAvailableProducts();   // Productos mayores a 0: 17440
    console.log("Conteo total de productos con parametros: ", conteoByTipo);
    
})

routerProducts.get("/products/sendProductsToGoogleMechant", async (req, res) => {
    res.send("Se ha hecho una consulta a un producto");
    const conteoPages= await countPages();
    const conteoByTipo = await manageProductProcessing(conteoPages);  
})

routerProducts.get("/products/countPages", async (req, res) => {
    res.send("Se ha hecho una consulta a un producto");
    const conteoPages= await countPages();   // Productos mayores a 0: 17440
    console.log("Conteo total de productos con parametros: ", conteoPages);

})




module.exports = routerProducts;