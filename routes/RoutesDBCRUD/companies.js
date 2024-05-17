const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
} = require("../../databases/CRUD");
const routerCompanies = express.Router();


routerCompanies.get("/companies/getCompanies", authenticateToken ,async (req, res) => {
    try {
        const companies = await fetchDataFromTable('companies');
        res.status(200).json(companies);
    } catch (error) {
        console.error('Error al obtener compañías:', error);
        res.status(500).json({ message: "Error al obtener las compañías" });
    }
});

routerCompanies.post("/companies/createCompany", authenticateToken, async (req, res) => {
    const companyData = req.body;
    const columns = ['company_name']; // Asegúrate de que estos campos están presentes en companyData
    try {
        const result = await insertIntoTable('companies', companyData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Compañía creada con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar la compañía" });
        }
    } catch (error) {
        console.error('Error al insertar compañía:', error);
        res.status(500).json({ message: "Error al crear la compañía" });
    }
});


routerCompanies.put("/companies/updateCompany/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const result = await updateTable('companies', updateData, 'company_id', id);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Compañía actualizada con éxito" });
        } else {
            res.status(404).json({ message: "Compañía no encontrada" });
        }
    } catch (error) {
        console.error('Error al actualizar compañía:', error);
        res.status(500).json({ message: "Error al actualizar la compañía" });
    }
});


routerCompanies.delete("/companies/deleteCompany/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await deleteFromTable('companies', 'company_id', id);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Compañía eliminada con éxito" });
        } else {
            res.status(404).json({ message: "Compañía no encontrada" });
        }
    } catch (error) {
        console.error('Error al eliminar compañía:', error);
        res.status(500).json({ message: "Error al eliminar la compañía" });
    }
});


routerCompanies.get("/companies/getCompany/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const company = await fetchOneFromTable('companies', id, 'company_id');
        if (company) {
            res.status(200).json(company);
        } else {
            res.status(404).json({ message: "Compañía no encontrada" });
        }
    } catch (error) {
        console.error('Error al obtener la compañía:', error);
        res.status(500).json({ message: "Error interno del servidor al intentar obtener la compañía" });
    }
});



module.exports = routerCompanies;