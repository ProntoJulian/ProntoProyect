const express = require("express");
const {authenticateToken} = require("../../middleware/index");
const {insertIntoTableMultiple,
    updateTableMultiple,
    fetchDataFromTable,
    deleteFromTableMultiple,
    fetchOneFromTableMultiple,
    fetchAllFromTableByUserId} = require("../../databases/CRUD");

const routerUserCompany = express.Router();

routerUserCompany.get("/userCompanies/getUserCompanies", /*authenticateToken,*/ async (req, res) => {
    try {
        const userCompany = await fetchDataFromTable('user_companies');
        res.status(200).json(userCompany);
    } catch (error) {
        console.error('Error al obtener los users companies:', error);
        res.status(500).json({ message: "Error al obtener los users-Companies" });
    }
});

routerUserCompany.post("/userCompanies/createUserCompany", /*authenticateToken,*/ async (req, res) => {
    const userCompaniesData = req.body;
    const columns = [
        'user_id',
        'company_id'
    ]; // Ajusta según sea necesario

    console.log("Datos enviados: ", userCompaniesData);

    try {
        const result = await insertIntoTableMultiple('user_companies', userCompaniesData, columns);
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "User Company creado con éxito" });
        } else {
            res.status(400).json({ message: "No se pudo insertar el User Company" });
        }
    } catch (error) {
        console.error('Error al insertar User-Company:', error);
        res.status(500).json({ message: "Error al crear el User-Company" });
    }
});

routerUserCompany.put("/userCompanies/updateUserCompany/:userId/:companyId", /*authenticateToken,*/ async (req, res) => {
    const { userId, companyId } = req.params;
    console.log('Received userId:', userId, 'companyId:', companyId); // Registro del roleId y moduleId recibidos
    const updateData = req.body;

    try {
        const result = await updateTableMultiple('user_companies', updateData, ['user_id', 'company_id'], [userId, companyId]);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "User-Company actualizado con éxito" });
        } else {
            res.status(404).json({ message: "User-Company no encontrado" });
        }
    } catch (error) {
        console.error('Error al actualizar User-Company:', error);
        res.status(500).json({ message: "Error al actualizar el User-Company" });
    }
});

routerUserCompany.delete("/userCompanies/deleteUserCompany/:userId/:companyId", /*authenticateToken,*/ async (req, res) => {
    const { userId, companyId } = req.params;
    try {
        const result = await deleteFromTableMultiple('user_companies', ['user_id', 'company_id'], [userId, companyId]);
        if (result.affectedRows > 0) {
            res.send({ message: "User-Company eliminado con éxito" });
        } else {
            res.status(404).json({ message: "User-Company no encontrado" });
        }
    } catch (error) {
        console.error('Error al eliminar User-Company:', error);
        res.status(500).json({ message: "Error al eliminar el User-Company" });
    }
});

routerUserCompany.get("/userCompanies/getUserCompany/:userId/:companyId", /*authenticateToken,*/ async (req, res) => {
    const { userId, companyId } = req.params;
    try {
        const userCompany = await fetchOneFromTableMultiple('user_companies', ['user_id', 'company_id'], [userId, companyId]);
        if (userCompany) {
            res.status(200).json(userCompany);
        } else {
            res.status(404).json({ message: "User-Company no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el User-Company:', error);
        res.status(500).json({ message: "Error al obtener el User-Company" });
    }
});

routerUserCompany.get("/userCompanies/getUserCompanyByID/:userId", /*authenticateToken,*/ async (req, res) => {
    const { userId } = req.params;
    try {
        const roleModule = await fetchAllFromTableByUserId(userId);
        if (roleModule) {
            res.status(200).json(roleModule);
        } else {
            res.status(404).json({ message: "User-Company no encontrado" });
        }
    } catch (error) {
        console.error('Error al obtener el User-Company:', error);
        res.status(500).json({ message: "Error al obtener el User-Company" });
    }
});

module.exports = routerUserCompany;
