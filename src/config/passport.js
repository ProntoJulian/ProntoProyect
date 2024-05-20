const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { authenticateUser } = require("../../databases/auth");

// Leer los datos desde el archivo JSON
const rawData = fs.readFileSync(path.join(__dirname, '..', 'databases', 'db.json'));
const db = JSON.parse(rawData);

passport.use(new LocalStrategy({
    usernameField: 'username'
  }, async (username, password, done) => {
    // Buscar usuario por email en el JSON en lugar de MongoDB
    const authResult = await authenticateUser(username, password);
    if (!authResult.user) {
      return done(null, false, { message: 'Not User found.' });
    } else {
      // Compara la contraseña usando bcrypt
      const match = await bcrypt.compare(password, user.password_hash);
      if (match) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect Password' });
      }
    }
}));

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser((id, done) => {
  const user = db.users.find(user => user.user_id === id);
  if (user) {
    done(null, user);
  } else {
    done(new Error('User not found'), null);
  }
});