// HTTPS server for CartasKeifox
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();

// Cargar certificados
const options = {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem"))
};

// Servir contenido estático dentro de "carpeta_principal"
app.use(express.static(path.join(__dirname, "carpeta_principal")));

// Ruta principal /
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "carpeta_principal", "index.html"));
});

// Puerto
const PORT = 5500;

// Iniciar servidor HTTPS
https.createServer(options, app).listen(PORT, () => {
    console.log(`Servidor HTTPS activo en https://localhost:${PORT}`);
});
