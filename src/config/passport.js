const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { authenticateUser } = require("../../databases/auth");
const { fetchOneFromTable } = require("../../databases/CRUD");

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (usernameField, passwordField, done) => {
    // Buscar usuario por email en el JSON en lugar de MongoDB
    const authResult = await authenticateUser(usernameField, passwordField);
    if (!authResult.user) {
      return done(null, false, { message: 'Not User found.' });
    } else {
      // Compara la contraseña usando bcrypt
      const match = await bcrypt.compare(passwordField, authResult.user.password_hash);
      if (match) {
        return done(null, authResult.user);
      } else {
        return done(null, false, { message: 'Incorrect Password' });
      }
    }
}));

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

 passport.deserializeUser(async (id, done) => {
    const user = await fetchOneFromTable('users', id,idColumnName = 'user_id');
  if (user) {
    done(null, user);
  } else {
    done(new Error('User not found'), null);
  }
});