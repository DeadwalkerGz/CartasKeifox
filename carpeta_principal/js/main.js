// ===============================
// Motor Base CartasKeifox
// ===============================

// Palos y valores oficiales
const PALOS = ["corazon", "pica", "diamante", "trebol"];
const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// ===============================
// Clase Carta
// ===============================
class Carta {
    constructor(palo, valor) {
        this.palo = palo;
        this.valor = valor;
        this.imagen = `img/${palo}_${valor}.jpeg`;
    }
}

// ===============================
// Clase Jugador
// ===============================
class Jugador {
    constructor(id, nombre) {
        this.id = id;
        this.nombre = nombre;
        this.mano = [];
        this.cartasRecogidas = [];
        this.puntos = 0;
        this.cantosDisponibles = null;   // Cantos que puede cantar aún
        this.cantosOriginales = null;    // Cantos que ha tenido alguna vez con esta mano
    }
}

// ===============================
// Clase MesaDeJuego (estado del juego)
// ===============================
class MesaDeJuego {
    constructor() {
        this.baraja = [];
        this.mesa = [];
        this.jugadores = [];
        this.turnoActual = 0;
        this.tiempoPorTurno = 10;
        this.estado = "lobby";
        this.repartidor = 0;  // Índice del repartidor
    }

    // ---------------------------------
    // 🔹 Utilidad: puntos por valor
    // ---------------------------------
    calcularPuntosPorCarta(valor) {
        if (valor >= 1 && valor <= 7) return 1;
        if (valor === 10) return 2;
        if (valor === 11) return 3;
        if (valor === 12) return 4;
        return 0;
    }

    // ============================================
    // 🔥 Mesa inicial sin valores repetidos
    // ============================================
    inicializarMesaSinRepetidos() {
        this.mesa = [];

        while (this.mesa.length < 4 && this.baraja.length > 0) {
            const carta = this.baraja.shift();
            const yaExiste = this.mesa.some(c => c.valor === carta.valor);

            if (!yaExiste) {
                this.mesa.push(carta);
            } else {
                // carta no sirve → mandarla al fondo del mazo
                this.baraja.push(carta);
            }
        }
    }

    // 1. Crear baraja con las 40 cartas
    generarBaraja() {
        this.baraja = [];
        for (let palo of PALOS) {
            for (let valor of VALORES) {
                this.baraja.push(new Carta(palo, valor));
            }
        }
    }

    // 2. Barajar (mezclar)
    mezclar() {
        for (let i = this.baraja.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.baraja[i], this.baraja[j]] = [this.baraja[j], this.baraja[i]];
        }
    }

    // 3. Agregar jugadores
    agregarJugador(nombre) {
        const id = this.jugadores.length;
        this.jugadores.push(new Jugador(id, nombre));
    }

    // Repartir 3 cartas a cada jugador
    repartir() {
        for (let j of this.jugadores) {
            j.mano = this.baraja.splice(0, 3);
            j.cantosDisponibles = null;
            j.cantosOriginales = null;
            this.actualizarCantosJugador(j);
        }
    }

    // Iniciar partida
    iniciarPartida(numJugadores = 2) {
        // Limpiar mesa y baraja
        this.baraja = [];
        this.mesa = [];
        this.estado = "repartiendo";

        // Generar y mezclar baraja
        this.generarBaraja();
        this.mezclar();

        // Limpiar y crear jugadores
        this.jugadores = [];
        for (let i = 0; i < numJugadores; i++) {
            this.agregarJugador(`Jugador ${i + 1}`);
        }

        // Repartir 3 cartas y detectar cantos
        this.repartir();

        // Mesa inicial sin valores repetidos
        this.inicializarMesaSinRepetidos();

        // Primer turno = jugador a la derecha del repartidor
        this.turnoActual = (this.repartidor + 1) % this.jugadores.length;

        this.estado = "turno";
    }

    // Saber quién juega
    getJugadorActual() {
        return this.jugadores[this.turnoActual];
    }

    // ============================================
    // 🔥 Jugar una carta
    // ============================================
    jugarCarta(idJugador, indiceCarta) {

        // ===========================
        // 🔹 Validar turno
        // ===========================
        if (idJugador !== this.turnoActual) {
            return { ok: false, motivo: "No es tu turno" };
        }

        const jugador = this.jugadores[idJugador];

        // ===========================
        // 🔹 Validar carta existente
        // ===========================
        if (indiceCarta < 0 || indiceCarta >= jugador.mano.length) {
            return { ok: false, motivo: "Carta inválida" };
        }

        const carta = jugador.mano[indiceCarta]; // AÚN NO la sacamos

        // ===========================
        // 🔥 Detectar combo
        // ===========================
        const resultado = this.detectarCaidaCadena(carta);

        // ❌ Combo inválido → NO se juega la carta
        if (resultado && resultado.invalida) {
            return {
                ok: false,
                motivo: resultado.motivo || "Combo no válido."
            };
        }

        // ===========================
        // ✔ COMBO VÁLIDO
        // ===========================
        if (resultado && resultado.indices) {

            // Quitar la carta de la mano
            jugador.mano.splice(indiceCarta, 1);

            // Capturar solo las cartas obligatorias
            const capturadas = resultado.indices
                .sort((a, b) => b - a)
                .map(i => this.mesa.splice(i, 1)[0]);

            // Agregar carta jugada
            capturadas.push(carta);
            jugador.cartasRecogidas.push(...capturadas);

            // Puntaje
            let puntos = this.calcularPuntosPorCarta(carta.valor);
            if (this.mesa.length === 0) puntos += 4; // Bonus

            jugador.puntos += puntos;

            // Avanzar turno
            this.avanzarTurno();

            // ===========================
            // 🔥 NUEVA LÓGICA
            // Repartir nueva mano si ambos están en 0
            // Solo si hay 6 cartas exactas o más
            // ===========================
            if (this.jugadores.every(j => j.mano.length === 0) && this.baraja.length >= 6) {

                for (let j of this.jugadores) {
                    j.mano = this.baraja.splice(0, 3);
                    this.actualizarCantosJugador(j);
                }
            }

            window._ultimaJugada = {
                tipo: "combo",
                jugador: idJugador,
                carta,
                cadena: resultado.cadena
            };

            return {
                ok: true,
                tipo: "combo",
                cadena: resultado.cadena,
                puntos,
                mesa: [...this.mesa]
            };
        }

        // ===========================
        // 🔹 JUGADA NORMAL
        // ===========================
        jugador.mano.splice(indiceCarta, 1); // quitar carta
        this.mesa.push(carta); // colocar en mesa

        // Avanzar turno
        this.avanzarTurno();

        // ===========================
        // 🔥 Nueva lógica para repartir
        // ===========================
        if (this.jugadores.every(j => j.mano.length === 0) && this.baraja.length >= 6) {

            for (let j of this.jugadores) {
                j.mano = this.baraja.splice(0, 3);
                this.actualizarCantosJugador(j);
            }
        }

        window._ultimaJugada = {
            tipo: "normal",
            jugador: idJugador,
            carta
        };

        return {
            ok: true,
            tipo: "normal",
            carta,
            mesa: [...this.mesa]
        };
    }





    // ============================================
    // Cantos
    // ============================================
    detectarCantos(mano) {
        // Ordenar por valor para facilitar detección
        const orden = mano.map(c => c.valor).sort((a, b) => a - b);
        const [a, b, c] = orden;
        const valores = orden;

        let cantos = {
            ronda: false,
            trivilin: false,
            patrulla: false,
            vigia: false,
            registro: false,
            registrico: false,
            casaChica: false,
            casaGrande: false
        };

        // TRIVILÍN (3 iguales)
        if (a === b && b === c) {
            cantos.trivilin = true;
        }

        // RONDA (2 iguales + 1 diferente)
        if ((a === b && b !== c) || (a !== b && b === c)) {
            cantos.ronda = true;
        }

        // PATRULLA (escalera sin incluir 8 ni 9)
        if (a + 1 === b && b + 1 === c) {
            cantos.patrulla = true;
        }

        // VIGÍA (par + carta consecutiva arriba o abajo)
        if (a === b && (c === b + 1 || c === b - 1)) {
            cantos.vigia = true;
        }
        if (b === c && (a === b + 1 || a === b - 1)) {
            cantos.vigia = true;
        }

        // REGISTRO (1, 11, 12)
        if (valores.includes(1) && valores.includes(11) && valores.includes(12)) {
            cantos.registro = true;
        }

        // REGISTRICO (1, 10, 11)
        if (valores.includes(1) && valores.includes(10) && valores.includes(11)) {
            cantos.registrico = true;
        }

        // CASA CHICA (1, 11, 11) → solo si baraja tuviera dobles
        if (valores[0] === 1 && valores[1] === 11 && valores[2] === 11) {
            cantos.casaChica = true;
        }

        // CASA GRANDE (1, 12, 12)
        if (valores[0] === 1 && valores[1] === 12 && valores[2] === 12) {
            cantos.casaGrande = true;
        }

        return cantos;
    }

    // Recalcula los cantos de un jugador SIN permitir recantar lo ya usado
    actualizarCantosJugador(jugador) {
        if (!jugador) return;

        const nuevos = this.detectarCantos(jugador.mano);

        if (!jugador.cantosDisponibles) {
            jugador.cantosDisponibles = { ...nuevos };
        } else {
            for (let tipo in nuevos) {
                if (jugador.cantosDisponibles[tipo] === false) {
                    // ya lo cantó antes: NO se reactiva
                    continue;
                }
                jugador.cantosDisponibles[tipo] = nuevos[tipo];
            }
        }

        // Cantos que ha tenido alguna vez con esta mano
        if (!jugador.cantosOriginales) {
            jugador.cantosOriginales = { ...nuevos };
        } else {
            for (let tipo in nuevos) {
                if (nuevos[tipo]) {
                    jugador.cantosOriginales[tipo] = true;
                }
            }
        }
    }

    // El jugador intenta cantar un canto
    cantar(idJugador, tipoCanto) {
        const jugador = this.jugadores[idJugador];

        if (!jugador.cantosDisponibles) {
            return { ok: false, motivo: "No tiene ningún canto disponible." };
        }

        if (!jugador.cantosDisponibles[tipoCanto]) {
            return { ok: false, motivo: "Ese canto no es válido con su mano." };
        }

        // Tabla de puntos por canto
        const tabla = {
            ronda: (mano) => {
                const valores = mano.map(c => c.valor).sort((a, b) => a - b);
                let valorPar = null;
                if (valores[0] === valores[1]) valorPar = valores[0];
                else if (valores[1] === valores[2]) valorPar = valores[1];

                if (valorPar === null) return 0;
                return this.calcularPuntosPorCarta(valorPar);
            },
            trivilin: () => 5,
            patrulla: () => 6,
            vigia: () => 7,
            registro: () => 8,
            registrico: () => 10,
            casaChica: () => 11,
            casaGrande: () => 12
        };

        const puntos = tabla[tipoCanto](jugador.mano);
        jugador.puntos += puntos;

        // Para que no lo cante dos veces
        jugador.cantosDisponibles[tipoCanto] = false;

        return {
            ok: true,
            tipo: tipoCanto,
            puntos,
            total: jugador.puntos
        };
    }

    detectarCaidaCadena(cartaJug) {
        const V = cartaJug.valor;
        const valoresMesa = this.mesa.map(c => c.valor);

        // Si no está el mismo número en mesa → no es combo
        if (!valoresMesa.includes(V)) return null;

        // --- Construir escalera hacia abajo ---
        let down = [];
        let d = V - 1;
        while (valoresMesa.includes(d)) {
            down.unshift(d);
            d--;
        }

        // --- Construir escalera hacia arriba ---
        let up = [];
        let u = V + 1;
        while (valoresMesa.includes(u)) {
            up.push(u);
            u++;
        }

        const cadenaCompleta = [...down, V, ...up];

        // Menor real de la escalera
        const menorEscalera = down.length > 0 ? down[0] : V;

        // =======================================
        // 1) Si juega el menor → toma TODA la cadena
        // =======================================
        if (V === menorEscalera) {

            // Capturar SOLO UNA carta por cada valor de la escalera
            let valoresNecesarios = [...cadenaCompleta];
            const indices = [];

            this.mesa.forEach((c, idx) => {
                const pos = valoresNecesarios.indexOf(c.valor);
                if (pos !== -1) {
                    indices.push(idx);
                    valoresNecesarios.splice(pos, 1);
                }
            });

            const hayEscalera = (down.length > 0 || up.length > 0);

            // Si es escalera → mínimo 3
            if (hayEscalera && indices.length + 1 < 3) {
                return { invalida: true };
            }

            // Si NO es escalera → permitir PAR
            if (!hayEscalera && indices.length + 1 < 2) {
                return { invalida: true };
            }


            return {
                indices,
                cadena: cadenaCompleta
            };
        }

        // =======================================
        // 2) No es el menor → toma solo hacia arriba
        // =======================================
        const cadenaArriba = [V, ...up];

        // Capturar SOLO UNA carta por valor
        let valoresNecesarios = [...cadenaArriba];
        const indices2 = [];

        this.mesa.forEach((c, idx) => {
            const pos = valoresNecesarios.indexOf(c.valor);
            if (pos !== -1) {
                indices2.push(idx);
                valoresNecesarios.splice(pos, 1); // elimina una coincidencia
            }
        });

        const total = indices2.length + 1;

        // 🔥 Permitir PAR (2 cartas) si NO hay escalera
        const hayEscalera = (down.length > 0 || up.length > 0);

        // Si hay escalera → mínimo 3 cartas
        if (hayEscalera && total < 3) {
            return { invalida: true, motivo: "No puedes romper la escalera si no formas combo válido." };
        }

        // Si NO hay escalera → permitir PAR (total = 2)
        if (!hayEscalera && total < 2) {
            return { invalida: true };
        }


        return {
            indices: indices2,
            cadena: cadenaArriba
        };
    }

    // Aplicar caída (si quisieras reutilizar la lógica fuera de jugarCarta)
    aplicarCaida(idJugador, cartaJug, indices) {
        const jugador = this.jugadores[idJugador];

        const recogidas = indices.map(i => this.mesa[i]);
        this.mesa = this.mesa.filter((_, idx) => !indices.includes(idx));

        recogidas.push(cartaJug);
        jugador.cartasRecogidas.push(...recogidas);

        let puntos = this.calcularPuntosPorCarta(cartaJug.valor);
        if (this.mesa.length === 0) puntos += 4;

        jugador.puntos += puntos;
        return puntos;
    }

    // ============================================
    // Ronda y partida
    // ============================================
    verificarFinDeRonda() {
        const todosSinCartas = this.jugadores.every(j => j.mano.length === 0);
        const noHayMazo = this.baraja.length === 0;
        return todosSinCartas && noHayMazo;
    }

    finalizarRonda() {
        if (!this.verificarFinDeRonda()) {
            return { ok: false, motivo: "La ronda aún no ha terminado." };
        }

        const numJug = this.jugadores.length;
        let limites = { 2: 20, 3: 13, 4: 10 };

        this.jugadores.forEach((j, index) => {
            let limite = limites[numJug];
            if (numJug === 3 && index === this.repartidor) {
                limite = 14;
            }

            const sobrantes = j.cartasRecogidas.length - limite;
            if (sobrantes > 0) {
                j.puntos += sobrantes;
            }
        });

        this.estado = "fin_ronda";

        // Rotar repartidor
        this.repartidor = (this.repartidor + 1) % numJug;

        return {
            ok: true,
            jugadores: this.jugadores.map(j => ({
                nombre: j.nombre,
                puntos: j.puntos,
                cartasRecogidas: j.cartasRecogidas.length
            }))
        };
    }

    // Prepara una nueva ronda manteniendo los puntos acumulados
    nuevaRonda() {
        const numJug = this.jugadores.length;

        if (numJug === 0) {
            return { ok: false, motivo: "No hay jugadores en la mesa." };
        }

        this.mesa = [];
        this.baraja = [];

        this.generarBaraja();
        this.mezclar();

        this.jugadores.forEach(j => {
            j.mano = [];
            j.cartasRecogidas = [];
            j.cantosDisponibles = null;
            j.cantosOriginales = null;
        });

        this.repartir();

        this.turnoActual = (this.repartidor + 1) % numJug;
        this.estado = "turno";

        return {
            ok: true,
            repartidor: this.repartidor,
            turnoInicial: this.turnoActual
        };
    }

    verificarFinDePartida() {
        // Victoria por 24 puntos exactos
        for (let j of this.jugadores) {
            if (j.puntos === 24) {
                this.estado = "fin_partida";
                return { ok: true, ganador: j.nombre, tipo: "24" };
            }
        }

        // Trivilín de 12 mata partida
        for (let j of this.jugadores) {
            if (j.cantosOriginales && j.cantosOriginales.trivilin) {
                const valores = j.mano.map(c => c.valor).sort((a, b) => a - b);
                if (valores[0] === 12 && valores[1] === 12 && valores[2] === 12) {
                    this.estado = "fin_partida";
                    return { ok: true, ganador: j.nombre, tipo: "trivilin12" };
                }
            }
        }

        return { ok: false };
    }

    // Desempate por repartidor
    resolverEmpatePorRepartidor(candidatosIndices) {
        const n = this.jugadores.length;
        for (let offset = 1; offset <= n; offset++) {
            const idx = (this.repartidor + offset) % n;
            if (candidatosIndices.includes(idx)) {
                return idx;
            }
        }
        return null;
    }

    // Pasar al siguiente jugador
    avanzarTurno() {
        this.turnoActual = (this.turnoActual + 1) % this.jugadores.length;
    }
}

// Exportar motor
window.CartasKeifoxEngine = {
    PALOS,
    VALORES,
    Carta,
    Jugador,
    MesaDeJuego
};

window.KeifoxDebug = {
    crearMesa2J: function () {
        const mesa = new MesaDeJuego();
        mesa.iniciarPartida(2);
        console.log("Mesa creada:", mesa);
        return mesa;
    }
};
