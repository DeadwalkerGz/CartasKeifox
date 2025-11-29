// =========================================
// CartasKeifox – UI Modo 1 vs 1 (CORREGIDO)
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    const { MesaDeJuego } = window.CartasKeifoxEngine;

    // ===== INSTANCIA DEL MOTOR =====
    const mesa = new MesaDeJuego();
    window.mesa = mesa;   // 🔥 AGREGA ESTO AQUÍ
    // ===== ELEMENTOS DEL DOM =====

    const mesaEl = document.getElementById("mesa");
    const jugadoresEl = document.getElementById("jugadores");
    const cantosPanel = document.getElementById("panel-cantos");
    const cantosLista = document.getElementById("cantos-lista");
    const contadorBarajaEl = document.getElementById("contador-baraja");


    // ====== RENDER MESA ======
    function renderMesa() {
        mesaEl.innerHTML = "";

        mesa.mesa.forEach(carta => {
            const img = document.createElement("img");
            img.src = carta.imagen;
            img.classList.add("carta", "disabled");
            mesaEl.appendChild(img);
        });
    }

    // ====== RENDER JUGADORES ======
    function renderJugadores() {
        jugadoresEl.innerHTML = "";

        mesa.jugadores.forEach((jugador, idJ) => {
            const box = document.createElement("div");
            box.classList.add("jugador");

            if (idJ === mesa.turnoActual) {
                box.classList.add("turno-actual"); // 🔥 RESALTAR JUGADOR EN TURNO
            }


            box.innerHTML = `
                <h3>${jugador.nombre} — Puntos: ${jugador.puntos}</h3>
                <p>Cartas recogidas: ${jugador.cartasRecogidas.length}</p>
                <div class="mano" id="mano_${idJ}"></div>
            `;

            jugadoresEl.appendChild(box);

            const manoDiv = document.getElementById(`mano_${idJ}`);

            jugador.mano.forEach((carta) => {
                const cartaEl = document.createElement("div");
                cartaEl.classList.add("carta");

                const img = document.createElement("img");
                img.src = carta.imagen;

                cartaEl.appendChild(img);

                if (idJ === mesa.turnoActual) {
                    cartaEl.addEventListener("click", () => {
                        const realIndex = jugador.mano.indexOf(carta);
                        jugarCarta(idJ, realIndex);
                    });
                } else {
                    cartaEl.classList.add("disabled");
                }

                manoDiv.appendChild(cartaEl);
            });

        });
    }

    // ====== RENDER CANTOS ======
    function renderCantos() {
        cantosLista.innerHTML = "";

        const jugador = mesa.getJugadorActual();
        const cantos = jugador.cantosDisponibles;

        if (!cantos) return;

        Object.keys(cantos).forEach(tipo => {
            if (!cantos[tipo]) return;

            const b = document.createElement("div");
            b.classList.add("canto-btn");
            b.textContent = tipo.toUpperCase();

            b.addEventListener("click", () => cantar(jugador.id, tipo));

            cantosLista.appendChild(b);
        });
    }
    function renderBaraja() {
        contadorBarajaEl.textContent = `Cartas en el mazo: ${mesa.baraja.length}`;
    }

    // ====== ACCIÓN: CANTAR ======
    function cantar(idJugador, tipo) {
        const res = mesa.cantar(idJugador, tipo);

        if (!res.ok) {
            alert(res.motivo);
            return;
        }

        console.log(`Canto: ${tipo}`, res);

        renderTodo();
    }

    // ====== ACCIÓN: JUGAR CARTA ======
    function jugarCarta(idJugador, indiceCarta) {
        const res = mesa.jugarCarta(idJugador, indiceCarta);
        console.log("Jugada:", res);

        // fin de ronda
        if (mesa.verificarFinDeRonda()) {
            console.log("FIN DE RONDA:", mesa.finalizarRonda());

            // ❌ YA NO INICIAR NUEVA RONDA AUTOMÁTICAMENTE
            // 🔥 Ahora la lógica permanece estable y no se rompe el flujo
        }

        // fin de partida
        const fin = mesa.verificarFinDePartida();
        if (fin.ok) {
            alert(`🎉 Ganador: ${fin.ganador} (por ${fin.tipo})`);
        }

        renderTodo();
    }



    // ====== RENDER GLOBAL ======
    function renderTodo() {
        renderMesa();
        renderJugadores();
        renderCantos();
        renderBaraja();
        renderDebug();
    }
    function renderDebug() {
        const out = document.getElementById("debug-output");

        const data = {
            turnoActual: mesa.turnoActual,
            estado: mesa.estado,
            repartidor: mesa.repartidor,
            barajaRestante: mesa.baraja.length,

            mesaValores: mesa.mesa.map(c => ({
                palo: c.palo,
                valor: c.valor,
                img: c.imagen
            })),

            jugadores: mesa.jugadores.map(j => ({
                id: j.id,
                nombre: j.nombre,
                puntos: j.puntos,
                mano: j.mano.map(c => ({
                    palo: c.palo,
                    valor: c.valor,
                    img: c.imagen
                })),
                cantosDisponibles: j.cantosDisponibles,
                cantosOriginales: j.cantosOriginales,
                recogidas: j.cartasRecogidas.length
            })),

            ultimaJugada: window._ultimaJugada || null
        };

        out.textContent = JSON.stringify(data, null, 2);
    }


    // ====== INICIAR PARTIDA ======
    mesa.iniciarPartida(2);
    renderTodo();

});
