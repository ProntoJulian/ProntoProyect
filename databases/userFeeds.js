const mysql = require('mysql2');

require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

async function insertUserFeed(userId, feedId) {
    const sql = `INSERT INTO \`google-merchant-feed\`.\`user_feeds\` (user_id, feed_id) VALUES (?, ?)`;
    try {
        const [result] = await pool.promise().query(sql, [userId, feedId]);
        console.log('Relación User-Feed insertada con éxito:', result.affectedRows);
        return result;
    } catch (error) {
        console.error('Error al insertar relación User-Feed:', error);
        throw error;
    }
}

async function deleteUserFeed(userId, feedId) {
    const sql = `DELETE FROM \`google-merchant-feed\`.\`user_feeds\` WHERE user_id = ? AND feed_id = ?`;
    try {
        const [result] = await pool.promise().query(sql, [userId, feedId]);
        console.log('Relación User-Feed eliminada con éxito:', result.affectedRows);
        if (result.affectedRows === 0) {
            return { success: false, message: "No se encontró la relación User-Feed para eliminar." };
        } else {
            return { success: true, message: "Relación User-Feed eliminada con éxito." };
        }
    } catch (error) {
        console.error('Error al eliminar la relación User-Feed:', error);
        throw error;
    }
}

async function fetchAllUserFeeds() {
    const sql = `SELECT * FROM \`google-merchant-feed\`.\`user_feeds\``;
    try {
        const [results, fields] = await pool.promise().query(sql);
        return results;
    } catch (error) {
        console.error('Error al obtener todas las relaciones User-Feed:', error);
        throw error;
    }
}


async function fetchUserFeedsByUserId(userId) {
    const sql = `SELECT * FROM \`google-merchant-feed\`.\`user_feeds\` WHERE user_id = ?`;
    try {
        const [results, fields] = await pool.promise().query(sql, [userId]);
        return results;
    } catch (error) {
        console.error('Error al obtener relaciones User-Feed por ID de usuario:', error);
        throw error;
    }
}

module.exports = {
    insertUserFeed,
    deleteUserFeed,
    fetchAllUserFeeds,
    fetchUserFeedsByUserId
};


module.exports = {
    insertUserFeed,
    fetchUserFeeds,
    fetchUserFeedById,
    deleteUserFeed
  }
