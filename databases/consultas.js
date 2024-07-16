const mysql = require('mysql2');
const bcrypt = require('bcrypt');

require('dotenv').config()

const pool = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    charset: process.env.DB_CHARSET,
    connectTimeout: 20000,
    waitForConnections: true,
    queueLimit: 0
  });


async function getByIdCompany(table, feedId) {
    const sql = `SELECT * FROM \`${table}\` WHERE \`company_id\` = ?`;
    try {
        const [rows] = await pool.promise().query(sql, [feedId]);
        return rows;
    } catch (error) {
        console.error(`Error al obtener datos de la tabla ${table} con company_id ${feedId}:`, error);
        throw error;
    }
}


module.exports = {
    getByIdCompany
}