const appRouter = require("express").Router();
const { authenticateToken, superUsuarioPages } = require("../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
} = require("../databases/CRUD");

const {getByIdCompany} = require("../databases/consultas")

appRouter.get("/", (req, res) => {
    const user = res.locals.user;

    if(user){
        res.render("app");
    }else{
        res.render("login/login");
    }

})

appRouter.get("/app/logout", authenticateToken, function (req, res) {
  res.clearCookie('accessToken');
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

appRouter.get("/app", authenticateToken, async (req, res, next) => {


    const user = res.locals.user;
    const role = await fetchOneFromTable('roles', user.role_id, 'role_id');
    
    let users;
    if(role.role_name == "Superusuario"){
        permiso = true;
    }else{
        permiso = false;
    }

    res.render("app", permiso);
});

appRouter.get("/app/companies", authenticateToken, superUsuarioPages,async function (req, res) {
    const companies = await fetchDataFromTable('companies');
    res.render("pages/companies",{ companies: companies });
});

appRouter.get("/app/feeds", authenticateToken, async function (req, res) {
    const user = res.locals.user;
    const feeds = await getByIdCompany("feeds",user.company_id);
    const companies = await fetchDataFromTable('companies');

    console.log("Feeds: ", feeds)
    
    // Formatear la fecha y obtener el nombre de la compañía
    for (let feed of feeds) {
        // Formatear la fecha
        if (feed.last_update) {
            const date = new Date(feed.last_update);
            feed.last_update = date.toLocaleDateString();
        }

        if (feed.company_id) {
            const company = companies.find(c => c.company_id === feed.company_id);
            feed.company_name = company ? company.company_name : "Compañía no encontrada";
        }
        
    }

    res.render("pages/feeds", { feeds: feeds, companies:companies  });
});


appRouter.get("/app/roles", authenticateToken,async function (req, res) {
    
    const user = res.locals.user;
    const role = await fetchOneFromTable('roles', user.role_id, 'role_id');
    
    let roles;
    if(role.role_name == "Superusuario"){
        roles = await fetchDataFromTable('roles');
    }else{
        roles = await getByIdCompany("roles", user.company_id);
    }

    res.render("pages/roles",{ roles: roles });
});

appRouter.get("/app/modules", authenticateToken, superUsuarioPages,async function (req, res) {
    modules = await fetchDataFromTable('modules');
    res.render("pages/modules",{ modules: modules });
});

appRouter.get("/app/users", authenticateToken, async function (req, res) {

    const user = res.locals.user;
    const role = await fetchOneFromTable('roles', user.role_id, 'role_id');
    
    let users;
    if(role.role_name == "Superusuario"){
        users = await fetchDataFromTable('users');
    }else{
        users = await getByIdCompany("users", user.company_id);
    }

    const companies = await fetchDataFromTable('companies');
    const roles = await fetchDataFromTable('roles');

    for (let user of users) {
        // Obtener el nombre de la compañía
        if (user.company_id) {
            const company = companies.find(c => c.company_id === user.company_id);
            user.company_name = company ? company.company_name : "Compañía no encontrada";
        }

        // Obtener el nombre del rol
        if (user.role_id) {
            const role = roles.find(r => r.role_id === user.role_id);
            user.role_name = role ? role.role_name : "Rol no encontrado";
        }
    }

    res.render("pages/users", { users: users, companies: companies, roles: roles });
});



module.exports = appRouter;


