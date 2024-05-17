const express = require("express");
const routerOrders = express.Router();

const {
    getOrders, 
    countOrders, 
    fetchAllOrdersByStatus} = require("../../api/ordersBigCommerceApi");


routerOrders.get("/orders/orders", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const ordenes = await getOrders();
    console.log("Ordenes: ", ordenes);
    console.log("Cantidad de órdenes: ", ordenes.length);
})

routerOrders.get("/orders/countorders", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    const ordenes = await countOrders();
    //console.log("Conteo: ", ordenes);
    //console.log("Cantidad de órdenes: ", ordenes.length);
})

routerOrders.get("/orders/countordersbystatus", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    console.time('fetchAllOrdersByStatus');
    const ordenes = await fetchAllOrdersByStatus(2,1000);
    console.timeEnd('fetchAllOrdersByStatus');
    //console.log("Conteo: ", ordenes);
    //console.log("Cantidad de órdenes: ", ordenes.length);
})

routerOrders.get("/orders/countordersbystatus", async (req, res) => {
    res.send("Se ha hecho una consulta de las ordenes");
    console.time('fetchAllOrdersByStatus');
    const ordenes = await fetchAllOrdersByStatus(2,1000);
    console.timeEnd('fetchAllOrdersByStatus');
    //console.log("Conteo: ", ordenes);
    //console.log("Cantidad de órdenes: ", ordenes.length);
})

module.exports = routerOrders;