const express = require('express');
const app = express(); 
const path = require('path');
const cookieParser = require('cookie-parser');
const { engine } = require('express-handlebars');
const methodOveride = require("method-override")
const session = require("express-session")
let exphbs = require('express-handlebars');
const flash = require('express-flash');
const passport = require('passport');




const routerCompanies = require("./routes/RoutesDBCRUD/companies");
const routerFeeds = require("./routes/RoutesDBCRUD/feeds");
const routerRoles = require("./routes/RoutesDBCRUD/roles");
const routerUsers = require("./routes/RoutesDBCRUD/users");
const routerUserFeeds = require("./routes/RoutesDBCRUD/userFeed");
const routerAuth = require("./routes/auth.js");

// Import routers from the routes directory
const routerMerchant = require("./routes/Merchant/googleMerchant");
const routerImages = require("./routes/Merchant/images");
const routerOrders = require("./routes/Merchant/orders");
const routerProducts = require("./routes/Merchant/products");
const routerWebHooks = require("./routes/Merchant/webHooks");

const database = require(path.join(__dirname, 'databases', 'prontoWebDB'));
const GoogleAPI = require(path.join(__dirname, 'api', 'googleMerchantAPI'));

// Setup express to automatically parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Register routers to handle different route prefixes
app.use(routerOrders);
app.use(routerProducts);
app.use(routerMerchant);
app.use(routerImages);
app.use(routerWebHooks);
app.use(routerAuth);


app.use(routerCompanies);
app.use(routerFeeds);
app.use(routerRoles);
app.use(routerUsers);
app.use(routerUserFeeds);
app.use(routerAuth);


// Settings

app.set('views', path.join(__dirname,"src","views"));
app.engine('.hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main', 
  layoutsDir: path.join(app.get('views'), 'layouts'),
  partialsDir: path.join(app.get('views'), 'partials')
}));
app.set('view engine', '.hbs');


// Middlewares

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(methodOveride('_method'));

app.use(session({
    secret: 'mysecretapp',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Global Variables

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  next();
});

// Routes

// Static Files

app.use(express.static(path.join(__dirname,"src","public")))

// Server is listening


// Define the port number as environment variable or default to 443
const PORT = process.env.PORT || 8443;

// Start the server and log the server address
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


