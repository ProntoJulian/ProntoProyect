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

async function insertIntoTableMultiple(tableName, data, columns) {
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

async function updateTableMultiple(tableName, data, keyColumns, ids) {
    if (!Array.isArray(keyColumns) || !Array.isArray(ids) || keyColumns.length !== ids.length) {
        throw new Error("keyColumns and ids must be arrays of the same length");
    }

    const setClauses = Object.keys(data).map(key => `${key} = ?`);
    const whereClauses = keyColumns.map((col, index) => `${col} = ?`).join(" AND ");
    const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE ${whereClauses}`;

    try {
        const [result] = await pool.promise().query(sql, [...Object.values(data), ...ids]);
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

async function deleteFromTableMultiple(tableName, keyColumns, ids) {
    if (!Array.isArray(keyColumns) || !Array.isArray(ids) || keyColumns.length !== ids.length) {
        throw new Error("keyColumns and ids must be arrays of the same length");
    }

    const conditions = keyColumns.map((col, index) => `${col} = ?`).join(" AND ");
    const sql = `DELETE FROM \`${tableName}\` WHERE ${conditions}`;
    try {
        const [result] = await pool.promise().query(sql, ids);
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
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error(`Error al obtener el registro desde ${tableName}:`, error);
        throw error;
    }
}

async function fetchOneFromTableMultiple(tableName, idColumns, ids) {
    if (!Array.isArray(idColumns) || !Array.isArray(ids) || idColumns.length !== ids.length) {
        throw new Error("idColumns and ids must be arrays of the same length");
    }

    const conditions = idColumns.map((col) => `\`${col}\` = ?`).join(" AND ");
    const sql = `SELECT * FROM \`${tableName}\` WHERE ${conditions}`;
    try {
        const [results, fields] = await pool.promise().query(sql, ids);
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error(`Error al obtener el registro desde ${tableName}:`, error);
        throw error;
    }
}

async function fetchAllFromTableByRoleId(roleId) {
    const sql = `SELECT * FROM \`role_modules\` WHERE \`role_id\` = ?`;
    try {
        const [results] = await pool.promise().query(sql, [roleId]);
        return results;
    } catch (error) {
        console.error(`Error al obtener registros de role_modules con role_id = ${roleId}:`, error);
        throw error;
    }
}


async function updateFeed(feedId, updateData) {
    try {
        const result = await updateTable('feeds', updateData, 'feed_id', feedId);
        console.log('Resultado de la consulta:', result); // Registro del resultado de la consulta
        return result.affectedRows > 0 ? { success: true, message: "Feed actualizado con éxito" } : { success: false, message: "Feed no encontrado" };
    } catch (error) {
        console.error('Error al actualizar feed:', error);
        throw new Error("Error al actualizar el feed");
    }
}



async function insertEncryptedFeed(feedName, storeHash, authToken) {
    const sql = `CALL insert_encrypted_feed(?, ?, ?);`;

    try {
        const [result] = await pool.promise().query(sql, [feedName, storeHash, authToken]);
        console.log(`Número de registros insertados en feeds_test:`, result.affectedRows);
        return result;
    } catch (error) {
        console.error(`Error al insertar en la tabla feeds_test:`, error);
        throw error;
    }
}

async function fetchDecryptedFeeds() {
    const sql = `CALL select_decrypted_feeds();`;
    try {
        const [results] = await pool.promise().query(sql);
        return results[0]; // Asegúrate de retornar el primer conjunto de resultados
    } catch (error) {
        console.error(`Error al obtener los datos desencriptados:`, error);
        throw error;
    }
}

// Función temporal para insertar datos y consultar el registro insertado
async function testInsertAndFetchFeedTest() {
    try {
        // Insertar datos encriptados
        await insertEncryptedFeed('Test Feed', 'storehashvalue', 'auth_token_value');
        
        // Consultar los datos desencriptados
        const fetchedData = await fetchDecryptedFeeds();
        console.log('Datos consultados:', fetchedData);

        return fetchedData;
    } catch (error) {
        console.error('Error en testInsertAndFetchFeedTest:', error);
        throw error;
    }
}


module.exports = {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable,
    deleteFromTableMultiple,
    updateTableMultiple,
    insertIntoTableMultiple,
    fetchOneFromTableMultiple,
    fetchAllFromTableByRoleId,
    updateFeed,
    testInsertAndFetchFeedTest
};
