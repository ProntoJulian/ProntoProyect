const appRouter = require("express").Router();
const { authenticateToken, superUsuarioPages } = require("../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable,
    fetchOneFromTableMultiple,
    fetchAllFromTableByUserId
} = require("../databases/CRUD");

const { getByIdCompany } = require("../databases/consultas")
const { doesCronJobExist } = require("../helpers/helpers")


appRouter.get("/", (req, res) => {
    const user = res.locals.user;

    if (user) {
        res.render("app");
    } else {
        res.render("login/login");
    }

})

appRouter.get("/calculator", (req, res) => {
    res.render("partials/calculator");
})

appRouter.get("/app/logout", authenticateToken, superUsuarioPages, function (req, res) {
    res.clearCookie('accessToken');
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/login");
    });
});

appRouter.get("/app", authenticateToken, superUsuarioPages, async (req, res, next) => {
    try {
        const user = res.locals.user;
        const role = await fetchOneFromTable('roles', user.role_id, 'role_id');

        let permisos = [];
        if (role.role_name == "Superusuario") {
            permisos = ['companies', 'modules']; // Array con los permisos que quieras manejar
        }

        res.render("app", { permisos: permisos });
    } catch (error) {
        console.error("Error en la ruta /app:", error);
        res.status(500).send("Error en el servidor");
    }
});


appRouter.get("/app/companies", authenticateToken, superUsuarioPages, async function (req, res) {
    const companies = await fetchDataFromTable('companies');
    res.render("pages/companies", { companies: companies });
});

appRouter.get("/app/feeds", authenticateToken, superUsuarioPages, async function (req, res) {
    try {
        const user = res.locals.user;
        const moduleId = 8;

        // Ejecutar consultas en paralelo
        const [roleModule, feeds, role] = await Promise.all([
            fetchOneFromTableMultiple('role_modules', ['role_id', 'module_id'], [user.role_id, moduleId]),
            getByIdCompany("feeds", user.company_id),
            fetchOneFromTable('roles', user.role_id, 'role_id')
        ]);

        let usersPromise, companiesPromise;

        if (role.role_name === "Superusuario") {
            usersPromise = fetchDataFromTable('users');
            companiesPromise = fetchDataFromTable('companies');
        } else {
            usersPromise = getByIdCompany("users", user.company_id);
            companiesPromise = fetchOneFromTable('companies', user.company_id, 'company_id').then(company => [company]);
        }

        // Ejecutar las consultas de users y companies en paralelo
        const [users, companies] = await Promise.all([usersPromise, companiesPromise]);

        // Verificar el estado del cron y actualizar el feed
        for (const feed of feeds) {
            const cronExists = await doesCronJobExist(feed.feed_id);
            if (!cronExists) {
                feed.isActive = false;
                await updateTable('feeds', { isActive: false }, 'feed_id', feed.feed_id);
            } else {
                feed.isActive = true;
            }

            if (feed.last_update) {
                const date = new Date(feed.last_update);
                feed.last_update = date.toLocaleDateString();
            }

            if (feed.company_id) {
                const company = companies.find(c => c.company_id === feed.company_id);
                feed.company_name = company ? company.company_name : "Compañía no encontrada";
            }
        }

        res.render("pages/feeds", { feeds: feeds, companies: companies, roleModule: [roleModule] });
    } catch (error) {
        console.error("Error en la ruta /app/feeds:", error);
        res.status(500).send("Error en el servidor");
    }
});


appRouter.get("/app/selectCompany", authenticateToken, superUsuarioPages, async function (req, res) {
    try {
        const user = res.locals.user;
        const userID = user.user_id;
        const userCompanies = await fetchAllFromTableByUserId(userID);
        const companies = await fetchDataFromTable('companies');

        // Mapear el nombre de la compañía
        const userCompaniesWithName = userCompanies.map(uc => {
            const company = companies.find(c => c.company_id === uc.company_id);
            return {
                user_id: uc.user_id,
                company_id: uc.company_id,
                company_name: company ? company.company_name : "Company not found"
            };
        });

        res.render("pages/selectCompany", { userCompanies: userCompaniesWithName });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


appRouter.get("/app/roles", authenticateToken, superUsuarioPages, async function (req, res) {
    try {
        const user = res.locals.user;
        const moduleId = 8;

        // Ejecutar consultas en paralelo
        const [roleModule, role, company, modules, roleModules] = await Promise.all([
            fetchOneFromTableMultiple('role_modules', ['role_id', 'module_id'], [user.role_id, moduleId]),
            fetchOneFromTable('roles', user.role_id, 'role_id'),
            fetchOneFromTable('companies', user.company_id, 'company_id'),
            fetchDataFromTable('modules'),
            fetchDataFromTable('role_modules')
        ]);

        let roles;
        if (role.role_name === "Superusuario") {
            roles = await fetchDataFromTable('roles');
        } else {
            roles = await getByIdCompany("roles", user.company_id);
        }

        // Mapear roles con el nombre de la compañía
        roles = roles.map(rol => {
            if (rol.company_id) {
                rol.company_name = company.company_name;
            }
            // Agregar permisos a cada rol
            rol.modules = modules.map(module => {
                const roleModule = roleModules.find(rm => rm.role_id === rol.role_id && rm.module_id === module.module_id);
                return {
                    ...module,
                    access_type: roleModule ? roleModule.access_type : null
                };
            });
            return rol;
        });



        res.render("pages/roles", { roles: roles, company: [company], modules: modules, roleModule: [roleModule] });
    } catch (error) {
        console.error("Error en la ruta /app/roles:", error);
        res.status(500).send("Error en el servidor");
    }
});




appRouter.get("/app/modules", authenticateToken, superUsuarioPages, async function (req, res) {
    const modules = await fetchDataFromTable('modules');
    res.render("pages/modules", { modules: modules });
});

appRouter.get("/app/users", authenticateToken, superUsuarioPages, async function (req, res) {
    try {
        const user = res.locals.user;
        const moduleId = 10; // Ajusta el módulo ID si es necesario
        const roleModule = await fetchOneFromTableMultiple('role_modules', ['role_id', 'module_id'], [user.role_id, moduleId]);

        const role = await fetchOneFromTable('roles', user.role_id, 'role_id');

        let users;
        let companies;

        if (role.role_name === "Superusuario") {
            users = await fetchDataFromTable('users');
            companies = await fetchDataFromTable('companies');
        } else {
            users = await getByIdCompany("users", user.company_id);
            const userCompanies = await fetchAllFromTableByUserId(user.user_id);
            const companyIds = userCompanies.map(uc => uc.company_id);
            companies = await fetchDataFromTable('companies');
            companies = companies.filter(c => companyIds.includes(c.company_id));
        }

        const roles = await fetchDataFromTable('roles');

        // Filtrar roles por las compañías del usuario
        const rolesCompany = roles.filter(r => companies.some(c => c.company_id === r.company_id));

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

        res.render("pages/users", { users: users, companies: companies, roles: rolesCompany, roleModule: [roleModule] });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});





module.exports = appRouter;


