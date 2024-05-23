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