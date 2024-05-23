const jwt = require('jsonwebtoken');
const {
    fetchOneFromTable
} = require("../databases/CRUD");

function authenticateToken(req, res, next) {
    const token = req.cookies.accessToken; // Extrae el token de la cookie
    //const authHeader = req.headers['authorization'];
    //const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.redirect("/login")
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err){
            res.redirect("/login")

        } 
        req.user = user;
        next();
    });
}


// Middleware para verificar si el usuario es superusuario
async function superUsuarioPages(req, res, next) {
    const user = res.locals.user;

    if (!user) {
        return res.status(401).redirect('/login');
    }

    const role = await fetchOneFromTable('roles', user.role_id, 'role_id');

    if (role.role_name === "Superusuario") {
        res.locals.permisos = ['companies', 'modules']; // Array con los permisos que quieras manejar
    } else {
        res.locals.permisos = [];
    }

    next();
}

module.exports = {
    authenticateToken,
    superUsuarioPages
}