const express = require("express");
const routerImages= express.Router();

const {
    getProductImages } = require("../../api/imagesBigCommerceApi");

routerImages.get("/images/getImageByID", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const idProducto = 113;
    const totalBrands = await getProductImages(idProducto);
    console.log("Imagenes: ", totalBrands);
})


module.exports = routerImages;