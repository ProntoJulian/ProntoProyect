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

async function authenticateUser(username, password) {
    const sql = `SELECT * FROM users WHERE username = ?`;

   

    try {
        const [users] = await pool.promise().query(sql, [username]);


        console.log("sql: ", [users])
        
        if (users.length === 0) {
            return { success: false, message: "Usuario no encontrado" };
        }

        const user = users[0];

        const passwordIsValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordIsValid) {
            return { success: false, message: "Contraseña incorrecta" };
        }
        
        return { success: true, user };
    } catch (error) {
        console.error(`Error al autenticar usuario: ${error}`);
        return { success: false, message: "Error al autenticar usuario" };
    }
}

module.exports = {
    authenticateUser
}