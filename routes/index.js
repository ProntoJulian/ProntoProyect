const appRouter = require("express").Router();
const { authenticateToken } = require("../middleware/index");
const {
    insertIntoTable,
    updateTable,
    fetchDataFromTable,
    deleteFromTable,
    fetchOneFromTable
} = require("../databases/CRUD");

appRouter.get("/", (req, res) => {
    res.render("login/login");
})

appRouter.get("/app/logout", authenticateToken, function (req, res) {
  req.logout(function (err) {
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
    const feeds = await fetchDataFromTable('feeds');
    res.render("pages/feeds",{ feeds: feeds });
});

appRouter.get("/app/roles", authenticateToken,async function (req, res) {
    const roles = await fetchDataFromTable('roles');
    res.render("pages/roles",{ roles: roles });
});

appRouter.get("/app/users", authenticateToken,async function (req, res) {
    const users = await fetchDataFromTable('users');
    res.render("pages/users",{ users: users });
});

module.exports = appRouter;


