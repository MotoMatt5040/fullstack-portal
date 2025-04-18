require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const { logger } = require("./middleware/logEvents");
const errorHandler = require("./middleware/errorHandler");
const verifyJWT = require("./middleware/verifyJWT");
const cookieParser = require("cookie-parser");
const credentials = require("./middleware/credentials");
// const mongoose = require("mongoose");
// const connectDB = require("./config/dbConn");
// const useDB = require("./config/dbConnPromark");
const PORT = process.env.PORT || 5000;

// const hashPasswordsForAllRows = require("./controllers/hashPasswords");
// hashPasswordsForAllRows();

// connectDB();
// useDB("SELECT DISTINCT projectid , recdate FROM tblGPCPHDaily WHERE RecDate >= '2025-02-17'");
// connectDB();

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
// app.use("/register", require("./routes/register"));
app.use("/auth", require("./routes/auth"));
app.use("/refresh", require("./routes/refresh"));
app.use("/logout", require("./routes/logout"));
app.use("/reset" , require("./routes/resetPassword"));

app.use(verifyJWT); //everything after this line requires a jwt
// app.use("/employees", require("./routes/api/employees"));
app.use("/users", require("./routes/api/promarkEmployees"));
app.use("/github", require("./routes/api/github"));
app.use("/productionreport", require("./routes/api/productionReports"))
app.use("/live_data", require("./routes/api/liveProduction"));
app.use("/summaryreport", require("./routes/api/summaryReports"));
app.use("/reports", require("./routes/api/reports"));

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

// mongoose.connection.once("open", () => {
//     console.log("Connected to MongoDB");
//     app.listen(PORT, () =>
//         console.log(`Server running on port http://localhost:${PORT}`)
//     );
// });
