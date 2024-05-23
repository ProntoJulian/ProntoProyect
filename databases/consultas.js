const mysql = require('mysql2');
const bcrypt = require('bcrypt');

require('dotenv').config()

const pool = mysql.createPool({
  socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});


async function getFeedByIdCompany(feedId) {
    const sql = 'SELECT * FROM `feeds` WHERE `company_id` = ?';
    try {
        const [rows] = await pool.promise().query(sql, [feedId]);
        return rows;
    } catch (error) {
        console.error(`Error al obtener feed con feed_id ${feedId}:`, error);
        throw error;
    }
}

async function getRolesByIdCompany(RoleId) {
    const sql = 'SELECT * FROM `roles` WHERE `company_id` = ?';
    try {
        const [rows] = await pool.promise().query(sql, [RoleId]);
        console.log(`Feeds con feed_id ${RoleId}:`, rows);
        return rows;
    } catch (error) {
        console.error(`Error al obtener feed con feed_id ${RoleId}:`, error);
        throw error;
    }
}

module.exports = {
    getFeedByIdCompany,
    getRolesByIdCompany
}