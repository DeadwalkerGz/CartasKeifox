// ===============================
// Motor Base CartasKeifox
// ===============================

// Palos y valores oficiales
const PALOS = ["corazon", "pica", "diamante", "trebol"];
const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// Clase Carta
class Carta {
    constructor(palo, valor) {
        this.palo = palo;
        this.valor = valor;
        this.imagen = `img/${palo}_${valor}.jpeg`;


    }
}

class Jugador {
    constructor(id, nombre) {
        this.id = id;
        this.nombre = nombre;
        this.mano = [];
        this.cartasRecogidas = [];
        this.puntos = 0;
        this.cantosDisponibles = null;   // NUEVO
        this.cantosOriginales = null;    // NUEVO (copia inmutable para reglas)
    }
}


// Clase Mesa (estado del juego)
class MesaDeJuego {
    constructor() {
        this.baraja = [];
        this.mesa = [];
        this.jugadores = [];
        this.turnoActual = 0;
        this.tiempoPorTurno = 10;
        this.estado = "lobby";
        this.repartidor = 0;  // NUEVO
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

    repartir() {
        for (let j of this.jugadores) {
            j.mano = this.baraja.splice(0, 3);
            j.cantosDisponibles = null;
            j.cantosOriginales = null;
            this.actualizarCantosJugador(j);
        }
    }

    iniciarPartida(numJugadores = 2) {
        // Limpiar mesa y baraja
        this.baraja = [];
        this.mesa = [];
        this.estado = "repartiendo";

        // Generar y mezclar baraja
        this.generarBaraja();
        this.mezclar();

        // 🔥 IMPORTANTE: limpiar la lista de jugadores SIEMPRE
        this.jugadores = [];
        for (let i = 0; i < numJugadores; i++) {
            this.agregarJugador(`Jugador ${i + 1}`);
        }

        // Repartir 3 cartas y detectar cantos
        this.repartir();

        // Primer turno = jugador a la derecha del repartidor
        this.turnoActual = (this.repartidor + 1) % this.jugadores.length;

        this.estado = "turno";
    }


    // 6. Saber quién juega
    getJugadorActual() {
        return this.jugadores[this.turnoActual];
    }

    jugarCarta(idJugador, indiceCarta) {

        if (idJugador !== this.turnoActual) {
            return { ok: false, motivo: "No es tu turno" };
        }

        const jugador = this.jugadores[idJugador];

        if (indiceCarta < 0 || indiceCarta >= jugador.mano.length) {
            return { ok: false, motivo: "Carta inválida" };
        }

        // 1. Sacar carta de la mano
        const carta = jugador.mano.splice(indiceCarta, 1)[0];

        // 2. Detectar caída
        const caida = this.detectarCaida(carta);
        if (caida) {

            const puntosGanados = this.aplicarCaida(idJugador, carta, caida.indices);

            // Robar carta tras caída
            if (this.baraja.length > 0) {
                jugador.mano.push(this.baraja.shift());
                this.actualizarCantosJugador(jugador);
            }

            this.avanzarTurno();

            return {
                ok: true,
                tipo: "caida",
                carta,
                puntos: puntosGanados,
                mesa: [...this.mesa]
            };
        }

        // 3. No hubo caída → poner la carta en la mesa
        this.mesa.push(carta);

        // 4. Revisar si se formó una escalera con la mesa actual
        const escalera = this.detectarEscaleraMesa(); // debe devolver { indices:[...] }

        if (escalera) {

            const indices = escalera.indices;

            // 🔥 ELIMINAR SOLO LAS CARTAS DE LA ESCALERA
            this.mesa = this.mesa.filter((_, idx) => !indices.includes(idx));

            // Sumar puntos por escalera
            jugador.puntos += 3;

            // Robar carta por jugar
            if (this.baraja.length > 0) {
                jugador.mano.push(this.baraja.shift());
                this.actualizarCantosJugador(jugador);
            }

            this.avanzarTurno();

            return {
                ok: true,
                tipo: "escalera",
                puntos: 3,
                mesa: [...this.mesa]
            };
        }

        // 5. Robar carta normal
        if (this.baraja.length > 0) {
            jugador.mano.push(this.baraja.shift());
            this.actualizarCantosJugador(jugador);
        }

        // 6. Pasar turno
        this.avanzarTurno();

        return {
            ok: true,
            tipo: "normal",
            carta,
            mesa: [...this.mesa]
        };
    }




    // Detectar todos los cantos posibles en una mano de 3 cartas
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

        // VIGÍA (2 iguales + 1 consecutiva hacia arriba o abajo)
        // VIGÍA: par + carta consecutiva arriba o abajo
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

        // CASA CHICA (1, 11, 11) → esto solo existe si la baraja incluye dobles
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

        // Detectar cantos con la mano actual
        const nuevos = this.detectarCantos(jugador.mano);

        // Si nunca tuvo cantosDisponibles, simplemente los asignamos
        if (!jugador.cantosDisponibles) {
            jugador.cantosDisponibles = { ...nuevos };
        } else {
            // Si ya existían, respetamos los que ya fueron cantados (false)
            for (let tipo in nuevos) {
                if (jugador.cantosDisponibles[tipo] === false) {
                    // Ya lo cantó antes: NO se reactiva, aunque la mano lo permita
                    continue;
                }
                jugador.cantosDisponibles[tipo] = nuevos[tipo];
            }
        }

        // Actualizar cantosOriginales:
        // representa los cantos que HA TENIDO en algún momento con esta mano
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

        // PUNTOS por canto
        const tabla = {
            ronda: (mano) => {
                // Ordenar
                const valores = mano.map(c => c.valor).sort((a, b) => a - b);

                // Detectar valor del par
                let valorPar = null;
                if (valores[0] === valores[1]) valorPar = valores[0];
                else if (valores[1] === valores[2]) valorPar = valores[1];

                if (valorPar === null) return 0;

                // Puntos según el valor
                if (valorPar >= 1 && valorPar <= 7) return 1;
                if (valorPar === 10) return 2;
                if (valorPar === 11) return 3;
                if (valorPar === 12) return 4;

                return 0;
            }
            ,
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

    // Detectar si hay caída en cualquier parte de la mesa
    detectarCaida(cartaJug) {
        // Buscar todas las cartas con el mismo valor
        const indices = [];

        for (let i = 0; i < this.mesa.length; i++) {
            if (this.mesa[i].valor === cartaJug.valor) {
                indices.push(i);
            }
        }

        if (indices.length === 0) return null;

        return { indices };
    }

    // Aplicar caída: recoger cartas y calcular puntos
    aplicarCaida(idJugador, cartaJug, indices) {
        const jugador = this.jugadores[idJugador];

        // Tomar las cartas exactas que coincidieron
        const recogidas = indices.map(i => this.mesa[i]);

        // Eliminar de la mesa las cartas recogidas SIN romper el orden
        this.mesa = this.mesa.filter((_, idx) => !indices.includes(idx));

        // Añadir tu carta a las recogidas
        recogidas.push(cartaJug);

        // Guardar todo en el jugador
        jugador.cartasRecogidas.push(...recogidas);

        // ============================
        // PUNTOS (misma regla anterior)
        // ============================
        let puntos = 0;

        if (cartaJug.valor >= 1 && cartaJug.valor <= 7) puntos += 1;
        else if (cartaJug.valor === 10) puntos += 2;
        else if (cartaJug.valor === 11) puntos += 3;
        else if (cartaJug.valor === 12) puntos += 4;

        // BONUS de mesa limpia
        if (this.mesa.length === 0) {
            puntos += 4;
        }

        jugador.puntos += puntos;

        return puntos;
    }

    detectarEscaleraMesa() {

        if (this.mesa.length < 3) return null;

        // Construir lista auxiliar: valor + índice original
        const lista = this.mesa.map((carta, idx) => ({
            valor: carta.valor,
            idx
        }));

        // Ordenar por valor (para detectar escaleras aunque en la mesa estén desordenadas)
        lista.sort((a, b) => a.valor - b.valor);

        let secuencia = [lista[0]];

        let mejores = null;

        for (let i = 1; i < lista.length; i++) {

            const prev = lista[i - 1];
            const curr = lista[i];

            // ¿Continúa la escalera?
            if (curr.valor === prev.valor + 1) {
                secuencia.push(curr);
            } else {
                // Si rompió la escalera, evaluamos la secuencia que teníamos
                if (secuencia.length >= 3) {
                    mejores = [...secuencia];
                }
                secuencia = [curr];
            }
        }

        // Revisión final al acabar el ciclo
        if (secuencia.length >= 3) {
            mejores = [...secuencia];
        }

        // Nada encontrado
        if (!mejores) return null;

        // 🔥 DEVOLVER LOS ÍNDICES ORIGINALES EN LA MESA
        return {
            indices: mejores.map(x => x.idx),
            valores: mejores.map(x => x.valor)
        };
    }



    // Verifica si ya se acabaron las manos y la ronda puede finalizarse manualmente
    verificarFinDeRonda() {
        // Condición principal: todos los jugadores se quedaron sin cartas
        const todosSinCartas = this.jugadores.every(j => j.mano.length === 0);

        // Y la baraja ya no tiene más cartas
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

        // NUEVO: rotar repartidor
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

        // Limpiar mesa y baraja
        this.mesa = [];
        this.baraja = [];

        // Regenerar y mezclar baraja
        this.generarBaraja();
        this.mezclar();

        // Reset de manos, cantos y cartas recogidas (NO de puntos)
        this.jugadores.forEach(j => {
            j.mano = [];
            j.cartasRecogidas = [];
            j.cantosDisponibles = null;
            j.cantosOriginales = null;
        });

        // Repartir nueva mano y detectar cantos
        this.repartir();

        // El primer jugador de la nueva ronda es el que sigue al repartidor actual
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

        // Trivilín de 12 mata partida (usa cantosOriginales para que no se pierda al cantar)
        for (let j of this.jugadores) {
            if (j.cantosOriginales && j.cantosOriginales.trivilin) {
                const valores = j.mano.map(c => c.valor).sort((a, b) => a - b);
                if (valores[0] === 12 && valores[1] === 12 && valores[2] === 12) {
                    this.estado = "fin_partida";
                    return { ok: true, ganador: j.nombre, tipo: "trivilin12" };
                }
            }
        }


        // Empate por cantos iguales → desempate con carta mayor
        // (regla real: gana el que esté más cerca del repartidor en sentido derecho)
        // Lo dejamos pendiente hasta que tengamos el “repartidor” definido en motor.

        return { ok: false };
    }
    // Devuelve el índice de jugador ganador entre candidatos
    // siguiendo la regla: gana el más cercano al repartidor en sentido derecho
    resolverEmpatePorRepartidor(candidatosIndices) {
        const n = this.jugadores.length;
        // Empezamos a contar desde el jugador a la derecha del repartidor
        for (let offset = 1; offset <= n; offset++) {
            const idx = (this.repartidor + offset) % n;
            if (candidatosIndices.includes(idx)) {
                return idx;
            }
        }
        return null;
    }

    // 8. Pasar al siguiente jugador
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
