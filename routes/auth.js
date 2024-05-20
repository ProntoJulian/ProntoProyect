const express = require("express");
const routerAuth = express.Router();
const { authenticateUser } = require("../databases/auth");
const jwt = require('jsonwebtoken');
const passport = require('passport');

routerAuth.get("/login", (req, res) => {
    res.render("login/login");
});
/*
routerAuth.post('/login', async (req, res) => {
    console.log(req.body);
    const { username, password } = req.body;

    console.log("Username: ", username)
    console.log("Password: ", password)

    const authResult = await authenticateUser(username, password);

    if (!authResult.success) {
        return res.status(401).json({ message: authResult.message });
    }

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

    res.redirect("/app")
    //res.json({ message: "Autenticación exitosa" });
});
*/

routerAuth.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login', {
                errors: [{ text: info.message }],
                email: req.body.email,
                password: req.body.password
            });
        }

        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }

            const accessToken = jwt.sign(
                { id: user.id }, // asegúrate de que el 'id' exista en tu objeto de usuario
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            );

            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Usa secure solo en producción
                maxAge: 3600000 // 1 hora
            });

            res.redirect('/app');
        });
    })(req, res, next);
});


module.exports = routerAuth;