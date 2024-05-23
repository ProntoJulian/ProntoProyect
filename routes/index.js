const appRouter = require("express").Router();
const { authenticateToken } = require("../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
} = require("../databases/CRUD");

const {getFeedByIdCompany} = require("../databases/consultas")

appRouter.get("/", (req, res) => {
    res.render("login/login");
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

appRouter.get("/app", authenticateToken, (req, res, next) => {
    res.render("app");
});

appRouter.get("/app/companies", authenticateToken,async function (req, res) {
    const companies = await fetchDataFromTable('companies');
    res.render("pages/companies",{ companies: companies });
});

appRouter.get("/app/feeds", authenticateToken, async function (req, res) {
    const user = res.locals.user;
    const feeds = await getFeedByIdCompany(user.company_id);
    const company =  await fetchOneFromTable('companies', user.company_id, 'company_id');
    
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
    const roles = await fetchDataFromTable('roles');
    res.render("pages/roles",{ roles: roles });
});

appRouter.get("/app/users", authenticateToken, async function (req, res) {
    const users = await fetchDataFromTable('users');
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


