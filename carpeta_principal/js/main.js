// ===============================
// Motor Base CartasKeifox (Optimizado)
// ===============================

// Configuración
const PALOS = ["corazon", "pica", "diamante", "trebol"];
const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// ===============================
// Carta
// ===============================
class Carta {
    constructor(palo, valor) {
        this.palo = palo;
        this.valor = valor;
        this.imagen = `img/${palo}_${valor}.jpeg`;
    }
}

// ===============================
// Jugador
// ===============================
class Jugador {
    constructor(id, nombre) {
        this.id = id;
        this.nombre = nombre;
        this.mano = [];
        this.cartasRecogidas = [];
        this.puntos = 0;
        this.cantosDisponibles = null;
        this.cantosOriginales = null;
    }
}

// ===============================
// Mesa de Juego
// ===============================
class MesaDeJuego {
    constructor() {
        this.baraja = [];
        this.mesa = [];
        this.jugadores = [];
        this.turnoActual = 0;
        this.tiempoPorTurno = 10;
        this.estado = "lobby";
        this.repartidor = 0;
    }

    // ============================================
    // Utilidades
    // ============================================
    calcularPuntosPorCarta(v) {
        if (v >= 1 && v <= 7) return 1;
        if (v === 10) return 2;
        if (v === 11) return 3;
        if (v === 12) return 4;
        return 0;
    }

    generarBaraja() {
        this.baraja = [];
        for (const palo of PALOS)
            for (const valor of VALORES)
                this.baraja.push(new Carta(palo, valor));
    }

    mezclar() {
        for (let i = this.baraja.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.baraja[i], this.baraja[j]] = [this.baraja[j], this.baraja[i]];
        }
    }

    agregarJugador(nombre) {
        this.jugadores.push(new Jugador(this.jugadores.length, nombre));
    }

    // ============================================
    // Inicialización de partida
    // ============================================
    inicializarMesaSinRepetidos() {
        this.mesa = [];

        while (this.mesa.length < 4) {
            const carta = this.baraja.shift();
            if (!this.mesa.some(c => c.valor === carta.valor)) {
                this.mesa.push(carta);
            } else {
                this.baraja.push(carta); // al fondo
            }
        }
    }

    repartir() {
        for (const j of this.jugadores) {
            j.mano = this.baraja.splice(0, 3);
            j.cantosDisponibles = null;
            j.cantosOriginales = null;
            this.actualizarCantosJugador(j);
        }
    }

    iniciarPartida(numJugadores = 2) {
        this.mesa = [];
        this.baraja = [];
        this.estado = "repartiendo";

        this.generarBaraja();
        this.mezclar();

        this.jugadores = [];
        for (let i = 0; i < numJugadores; i++)
            this.agregarJugador(`Jugador ${i + 1}`);

        this.repartir();
        this.inicializarMesaSinRepetidos();

        this.turnoActual = (this.repartidor + 1) % numJugadores;
        this.estado = "turno";
    }

    getJugadorActual() {
        return this.jugadores[this.turnoActual];
    }

    // ============================================
    // Juego de cartas
    // ============================================
    jugarCarta(idJugador, idx) {
        if (idJugador !== this.turnoActual)
            return { ok: false, motivo: "No es tu turno" };

        const jugador = this.jugadores[idJugador];
        if (idx < 0 || idx >= jugador.mano.length)
            return { ok: false, motivo: "Carta inválida" };

        const carta = jugador.mano[idx];

        // --- Detectar combo ---
        const r = this.detectarCaidaCadena(carta);
        if (r?.invalida)
            return { ok: false, motivo: r.motivo || "Combo no válido." };

        // ============================================
        // COMBO
        // ============================================
        if (r?.indices) {
            jugador.mano.splice(idx, 1);

            const capturadas = r.indices
                .sort((a, b) => b - a)
                .map(i => this.mesa.splice(i, 1)[0]);

            capturadas.push(carta);
            jugador.cartasRecogidas.push(...capturadas);

            let pts = this.calcularPuntosPorCarta(carta.valor);
            if (this.mesa.length === 0) pts += 4;

            jugador.puntos += pts;

            this._avanzarYRepartirSiCorresponde();

            return { ok: true, tipo: "combo", cadena: r.cadena, puntos: pts, mesa: [...this.mesa] };
        }

        // ============================================
        // JUGADA NORMAL
        // ============================================
        jugador.mano.splice(idx, 1);
        this.mesa.push(carta);

        this._avanzarYRepartirSiCorresponde();

        return { ok: true, tipo: "normal", carta, mesa: [...this.mesa] };
    }

    // ============================================
    // Nueva lógica interna optimizada
    // ============================================
    _avanzarYRepartirSiCorresponde() {

        // Avanza turno SIEMPRE primero
        this.avanzarTurno();

        // Necesitamos verificar ambos en 0 DESPUÉS del turno
        const ambosVacios = this.jugadores.every(j => j.mano.length === 0);

        // 🔥 FIX: si la mesa quedó vacía y el jugador anterior hizo combo,
        // hay que verificar reparto ANTES de permitir jugada del siguiente jugador.

        if (ambosVacios && this.baraja.length >= 6) {

            for (const j of this.jugadores) {
                j.mano = this.baraja.splice(0, 3);
                this.actualizarCantosJugador(j);
            }

            // 🔥 FIX ADICIONAL:
            // Si se reparte, el turno SIEMPRE debe quedar en el jugador que sigue,
            // pero NO debe saltar a otro turno doble.
            this.turnoActual = (this.repartidor + 1) % this.jugadores.length;
        }
    }


    // ============================================
    // Cantos (sin cambios internos)
    // ============================================
    detectarCantos(mano) {
        const valores = mano.map(c => c.valor).sort((a, b) => a - b);
        const [a, b, c] = valores;

        const cantos = {
            ronda: (a === b && b !== c) || (b === c && a !== b),
            trivilin: a === b && b === c,
            patrulla: a + 1 === b && b + 1 === c,
            vigia:
                (a === b && (c === b + 1 || c === b - 1)) ||
                (b === c && (a === b + 1 || a === b - 1)),
            registro: valores.includes(1) && valores.includes(11) && valores.includes(12),
            registrico: valores.includes(1) && valores.includes(10) && valores.includes(11),
            casaChica: a === 1 && b === 11 && c === 11,
            casaGrande: a === 1 && b === 12 && c === 12
        };

        return cantos;
    }

    actualizarCantosJugador(j) {
        const nuevos = this.detectarCantos(j.mano);

        if (!j.cantosDisponibles) {
            j.cantosDisponibles = { ...nuevos };
        } else {
            for (const t in nuevos)
                if (j.cantosDisponibles[t] !== false)
                    j.cantosDisponibles[t] = nuevos[t];
        }

        if (!j.cantosOriginales) {
            j.cantosOriginales = { ...nuevos };
        } else {
            for (const t in nuevos)
                if (nuevos[t]) j.cantosOriginales[t] = true;
        }
    }

    cantar(idJugador, tipo) {
        const j = this.jugadores[idJugador];
        if (!j.cantosDisponibles?.[tipo])
            return { ok: false, motivo: "Canto inválido" };

        const tabla = {
            ronda: mano => {
                const v = mano.map(c => c.valor).sort((a, b) => a - b);
                return this.calcularPuntosPorCarta(v[1]); // valor del par
            },
            trivilin: () => 5,
            patrulla: () => 6,
            vigia: () => 7,
            registro: () => 8,
            registrico: () => 10,
            casaChica: () => 11,
            casaGrande: () => 12
        };

        const pts = tabla[tipo](j.mano);
        j.puntos += pts;
        j.cantosDisponibles[tipo] = false;

        return { ok: true, tipo, puntos: pts, total: j.puntos };
    }

    // ============================================
    // DETECTAR CAÍDA DE CADENA (optimizado)
    // ============================================
    detectarCaidaCadena(carta) {
        const V = carta.valor;
        const valores = this.mesa.map(c => c.valor);

        if (!valores.includes(V)) return null;

        let down = [], up = [];

        for (let d = V - 1; valores.includes(d); d--) down.unshift(d);
        for (let u = V + 1; valores.includes(u); u++) up.push(u);

        const cadena = [...down, V, ...up];
        const menor = down.length ? down[0] : V;
        const hayEsc = down.length || up.length;

        // --- Si juega el menor ---
        if (V === menor) {
            let necesarios = [...cadena];
            const idxs = [];

            this.mesa.forEach((c, i) => {
                const pos = necesarios.indexOf(c.valor);
                if (pos !== -1) {
                    idxs.push(i);
                    necesarios.splice(pos, 1);
                }
            });

            const total = idxs.length + 1;
            if (hayEsc && total < 3) return { invalida: true };
            if (!hayEsc && total < 2) return { invalida: true };

            return { indices: idxs, cadena };
        }

        // --- No es el menor ---
        const arriba = [V, ...up];
        let necesarios = [...arriba];
        const idxs = [];

        this.mesa.forEach((c, i) => {
            const pos = necesarios.indexOf(c.valor);
            if (pos !== -1) {
                idxs.push(i);
                necesarios.splice(pos, 1);
            }
        });

        const total = idxs.length + 1;

        if (hayEsc && total < 3)
            return { invalida: true, motivo: "No puedes romper la escalera si no formas combo válido." };

        if (!hayEsc && total < 2)
            return { invalida: true };

        return { indices: idxs, cadena: arriba };
    }

    // ============================================
    // Ronda y Partida
    // ============================================
    verificarFinDeRonda() {
        return this.jugadores.every(j => j.mano.length === 0) &&
            this.baraja.length === 0;
    }

    finalizarRonda() {
        if (!this.verificarFinDeRonda())
            return { ok: false, motivo: "La ronda no terminó" };

        const n = this.jugadores.length;
        const limites = { 2: 20, 3: 13, 4: 10 };

        this.jugadores.forEach((j, i) => {
            let limite = limites[n];
            if (n === 3 && i === this.repartidor) limite = 14;

            const sobra = j.cartasRecogidas.length - limite;
            if (sobra > 0) j.puntos += sobra;
        });

        this.estado = "fin_ronda";
        this.repartidor = (this.repartidor + 1) % n;

        return {
            ok: true,
            jugadores: this.jugadores.map(j => ({
                nombre: j.nombre,
                puntos: j.puntos,
                cartasRecogidas: j.cartasRecogidas.length
            }))
        };
    }

    nuevaRonda() {
        const n = this.jugadores.length;
        if (!n) return { ok: false };

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
        this.turnoActual = (this.repartidor + 1) % n;
        this.estado = "turno";

        return { ok: true };
    }

    verificarFinDePartida() {
        for (const j of this.jugadores)
            if (j.puntos === 24)
                return { ok: true, ganador: j.nombre, tipo: "24" };

        for (const j of this.jugadores)
            if (j.cantosOriginales?.trivilin &&
                j.mano.every(c => c.valor === 12))
                return { ok: true, ganador: j.nombre, tipo: "trivilin12" };

        return { ok: false };
    }

    resolverEmpatePorRepartidor(cands) {
        const n = this.jugadores.length;
        for (let o = 1; o <= n; o++) {
            const idx = (this.repartidor + o) % n;
            if (cands.includes(idx)) return idx;
        }
        return null;
    }

    avanzarTurno() {
        this.turnoActual = (this.turnoActual + 1) % this.jugadores.length;
    }
}

// Exportar motor
window.CartasKeifoxEngine = { PALOS, VALORES, Carta, Jugador, MesaDeJuego };
window.KeifoxDebug = {
    crearMesa2J: () => {
        const mesa = new MesaDeJuego();
        mesa.iniciarPartida(2);
        return mesa;
    }
};
