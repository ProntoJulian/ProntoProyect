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


async function insertIntoTable(tableName, data, columns) {

    if (tableName === 'users' && data.password_hash && columns.includes('password_hash')) {
        try {
            // Encripta la contraseña antes de insertarla
            const salt = await bcrypt.genSalt(10);
            data.password_hash = await bcrypt.hash(data.password_hash, salt);
        } catch (error) {
            console.error('Error al encriptar la contraseña:', error);
            throw error;
        }
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${columns.join(', ')}) VALUES (${placeholders})`;
    try {
        const [result] = await pool.promise().query(sql, Object.values(data));
        console.log(`Número de registros insertados en ${tableName}:`, result.affectedRows);
        return result;
    } catch (error) {
        console.error(`Error al insertar en la tabla ${tableName}:`, error);
        throw error;
    }
}

async function updateTable(tableName, data, keyColumn, id) {
    const setClauses = Object.keys(data).map(key => `${key} = ?`);
    const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE ${keyColumn} = ?`;
    try {
        const [result] = await pool.promise().query(sql, [...Object.values(data), id]);
        console.log(`${tableName} actualizado con éxito:`, result.affectedRows);
        return result;
    } catch (error) {
        console.error(`Error al actualizar ${tableName}:`, error);
        throw error;
    }
}

async function fetchDataFromTable(tableName, conditions = '') {
    const sql = `SELECT * FROM \`${tableName}\`${conditions}`;
    try {
        const [results] = await pool.promise().query(sql);
        return results;
    } catch (error) {
        console.error(`Error al obtener datos de ${tableName}:`, error);
        throw error;
    }
}

async function deleteFromTable(tableName, keyColumn, id) {
    const sql = `DELETE FROM \`${tableName}\` WHERE ${keyColumn} = ?`;
    try {
        const [result] = await pool.promise().query(sql, [id]);
        console.log(`${tableName} eliminado con éxito:`, result.affectedRows);
        return result;
    } catch (error) {
        console.error(`Error al eliminar de ${tableName}:`, error);
        throw error;
    }
}

async function fetchOneFromTable(tableName, id, idColumnName = 'id') {
    const sql = `SELECT * FROM \`${tableName}\` WHERE \`${idColumnName}\` = ?`;
    try {
        const [results, fields] = await pool.promise().query(sql, [id]);
        console.log('Query executed, results:', results);
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error(`Error al obtener el registro desde ${tableName}:`, error);
        throw error;
    }
}


module.exports = {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
};
