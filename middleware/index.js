const jwt = require('jsonwebtoken');

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


function superUsuarioPages(req, res, next) {
    const user = res.locals.user;
    const role = await fetchOneFromTable('roles', user.role_id, 'role_id');

    if (!user) {
        // Si el usuario no está definido en res.locals, redirigir al login u otra página
        return res.status(401).redirect('/login'); // O la página que consideres adecuada
    }

    if (role.role_name === "Superusuario") {
        next(); // El usuario es un superusuario, continuar al siguiente middleware o ruta
    } else {
        console.warn(`Access denied for user: ${user.username} on ${req.originalUrl}`);
        res.status(403).redirect("/app"); // Redirigir a /app con código de estado 403 (Forbidden)
    }
}

module.exports = {
    authenticateToken,
    superUsuarioPages
}