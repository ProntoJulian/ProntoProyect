const express = require("express");
const routerAuth = express.Router();
const { authenticateUser } = require("../databases/auth");
const jwt = require('jsonwebtoken');


routerAuth.get("/login", (req, res) => {
    res.render("login/login");
});

routerAuth.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const authResult = await authenticateUser(username, password);

    if (!authResult.success) {
        return res.status(401).json({ message: authResult.message });
    }

    // Autenticación exitosa, establecer el usuario en req.user
    req.user = authResult.user;

    const accessToken = jwt.sign(
        { username: authResult.user.username }, // Es mejor no incluir información sensible
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
    );

    res.cookie('accessToken', accessToken, {
        httpOnly: true,  // La cookie no es accesible mediante JavaScript en el cliente
        secure: true,   // Enviar la cookie solo sobre HTTPS
        maxAge: 3600000 // Tiempo de expiración de la cookie en milisegundos
    });

    req.flash('success_msg', 'Autenticación exitosa');
    res.redirect('login/login');
});

module.exports = routerAuth;