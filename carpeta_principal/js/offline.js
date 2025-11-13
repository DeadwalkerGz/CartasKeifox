// ==============================
// Estado global
// ==============================
let playerScore = 0;
let cpuScore = 0;
let round = 1;
const maxWins = 3;

// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementos del DOM
const playerScoreEl = document.getElementById("player-score");
const cpuScoreEl = document.getElementById("cpu-score");
const roundNumberEl = document.getElementById("round-number");
const statusMessageEl = document.getElementById("status-message");

const btnPlayRound = document.getElementById("btn-play-round");
const btnReset = document.getElementById("btn-reset");

// ==============================
// Ajuste de Canvas
// ==============================
function fitCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

// ==============================
// Fondo inicial
// ==============================
function drawBackground() {
    // Fondo acuarela
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#f7efe3");
    grad.addColorStop(1, "#fbe7ce");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cartas difusas
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 6; i++) {
        const w = 60 + Math.random() * 40;
        const h = 80 + Math.random() * 30;
        const x = Math.random() * (canvas.width - w);
        const y = Math.random() * (canvas.height - h);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = "#8b5a3c";
    ctx.font = "bold 22px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
        "Tus cartas aparecerán aquí",
        canvas.width / 2,
        canvas.height / 2
    );
}

// ==============================
// Dibujar cartas reales
// ==============================
function drawCards(player, cpu) {
    drawBackground();

    const cardW = 120;
    const cardH = 160;
    const centerX = canvas.width / 2;
    const y = canvas.height / 2 - cardH / 2;

    const pX = centerX - cardW - 40;
    const cX = centerX + 40;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;

    // Jugador
    ctx.fillStyle = "#fffaf3";
    ctx.beginPath();
    ctx.roundRect(pX, y, cardW, cardH, 16);
    ctx.fill();

    // CPU
    ctx.beginPath();
    ctx.roundRect(cX, y, cardW, cardH, 16);
    ctx.fill();
    ctx.restore();

    // Borde acuarela
    ctx.strokeStyle = "#d3b08a";
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(pX + 3, y + 3, cardW - 6, cardH - 6);
    ctx.strokeRect(cX + 3, y + 3, cardW - 6, cardH - 6);
    ctx.setLineDash([]);

    // Números
    ctx.fillStyle = "#8b5a3c";
    ctx.font = "bold 56px Poppins, sans-serif";
    ctx.textAlign = "center";

    ctx.fillText(player, pX + cardW / 2, y + cardH / 2);
    ctx.fillText(cpu, cX + cardW / 2, y + cardH / 2);

    // Etiquetas
    ctx.font = "bold 16px Poppins, sans-serif";
    ctx.fillText("Tú", pX + cardW / 2, y - 14);
    ctx.fillText("KeifoBox", cX + cardW / 2, y - 14);
}

// ==============================
// Lógica del juego
// ==============================
function resetGame() {
    playerScore = 0;
    cpuScore = 0;
    round = 1;

    playerScoreEl.textContent = 0;
    cpuScoreEl.textContent = 0;
    roundNumberEl.textContent = 1;

    statusMessageEl.textContent = "Presiona “Jugar ronda” para empezar.";

    drawBackground();
}

function playRound() {
    if (playerScore >= maxWins || cpuScore >= maxWins) {
        resetGame();
        return;
    }

    const p = Math.floor(Math.random() * 10) + 1;
    const c = Math.floor(Math.random() * 10) + 1;

    drawCards(p, c);

    let msg = `Tú sacaste ${p} y KeifoBox sacó ${c}. `;

    if (p > c) {
        playerScore++;
        msg += "¡Ganaste la ronda! 🦊";
    } else if (c > p) {
        cpuScore++;
        msg += "KeifoBox ganó la ronda. 🧠";
    } else {
        msg += "Empate.";
    }

    playerScoreEl.textContent = playerScore;
    cpuScoreEl.textContent = cpuScore;
    roundNumberEl.textContent = round;

    statusMessageEl.textContent = msg;

    if (playerScore >= maxWins || cpuScore >= maxWins) {
        statusMessageEl.textContent +=
            "\n\n" +
            (playerScore > cpuScore
                ? "🎉 ¡Ganaste la partida!"
                : "KeifoBox ganó la partida 😔");
    } else {
        round++;
    }
}

// ==============================
// Eventos
// ==============================
btnReset.addEventListener("click", resetGame);
btnPlayRound.addEventListener("click", playRound);

// ==============================
// Inicial
// ==============================
resetGame();
