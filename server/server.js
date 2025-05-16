require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const { logger } = require("./middleware/logEvents");
const auditLogger = require('./middleware/auditor');
const errorHandler = require("./middleware/errorHandler");
const verifyJWT = require("./middleware/verifyJWT");
const cookieParser = require("cookie-parser");
const credentials = require("./middleware/credentials");
const PORT = process.env.PORT || 5000;

app.use(logger);

// TO FIX SAME SITE ISSUES NAVIGATE TO controllers/authControllers.js and look at where the cookie is set

app.use(credentials); //THIS MUST BE BEFORE CORS
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

//styling
app.use(express.static(path.join(__dirname, "public")));

//routes

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/auth"));
app.use("/refresh", require("./routes/refresh"));
app.use("/logout", require("./routes/logout"));
app.use("/reset" , require("./routes/resetPassword"));

app.use(verifyJWT); //everything after this line requires a jwt

app.use(auditLogger);
app.use("/users", require("./routes/api/promarkEmployees"));
app.use("/github", require("./routes/api/github"));
app.use("/reports", require("./routes/api/reports"));
app.use("/users", require("./routes/api/users"));
app.use("/quotas", require("./routes/api/quotaManagement"));

app.all("*", (req, res) => {
    res.status(404);
    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
        res.json({ error: "404 Not Found" });
    } else {
        res.type("txt").send("404 Not Found");
    }
});

app.use(errorHandler);
app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);
