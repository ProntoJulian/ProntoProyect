const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    //const token = req.cookies.accessToken; // Extrae el token de la cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err){
            res.redirect("/login")

        } 
        req.user = user;
        next();
    });
}

module.exports = {
    authenticateToken
}