// HTTPS server for CartasKeifox
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();

// =============================
// 🔥 SERVIR ARCHIVOS ESTÁTICOS
// =============================
app.use(express.static(__dirname)); // sirve index.html, uno_vs_uno.html, etc.
app.use(express.static(path.join(__dirname, "carpeta_principal"))); // css, js, img

// =============================
// 🔒 CERTIFICADOS HTTPS
// =============================
const options = {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem"))
};

// =============================
// RUTA PRINCIPAL
// =============================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// PUERTO
const PORT = 5500;

// =============================
// INICIAR SERVER
// =============================
https.createServer(options, app).listen(PORT, () => {
    console.log(`🔥 Servidor HTTPS activo en https://localhost:${PORT}`);
});
