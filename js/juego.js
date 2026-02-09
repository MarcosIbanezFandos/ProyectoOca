let intervaloJuego;
let intervaloVisualDado; 
let globalRotX = 0; 
let globalRotY = 0;
let posicionesLocales = {}; 
let ultimoIdMensaje = 0;
let animando = false; 
let ultimoEstado = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarEstado(); 
    intervaloJuego = setInterval(cargarEstado, 1000); 
});

function cargarEstado() {
    if (animando) return;

    fetch('jugar?modo=datos&t=' + Date.now())
        .then(response => response.json())
        .then(data => {
            if (data && !animando) {
                ultimoEstado = data; 

                if (Object.keys(posicionesLocales).length === 0) {
                    data.jugadores.forEach(j => posicionesLocales[j.idUsuario] = j.casilla);
                }
                
                // --- DETECTAR SI LA PARTIDA YA ACABÓ (Para el perdedor) ---
                if (data.ganador && data.ganador !== "") {
                     mostrarVictoria(data.ganador);
                     actualizarInterfaz(data); // Para bloquear botones
                     return;
                }

                let hayMovimiento = false;
                data.jugadores.forEach(j => {
                    let posAnt = posicionesLocales[j.idUsuario];
                    if (posAnt !== undefined && posAnt !== j.casilla) hayMovimiento = true;
                });

                // Si detectamos movimiento, usamos la gestión completa
                if (hayMovimiento) gestionarRespuestaTirada(data);
                else {
                    actualizarTablero(data);
                    actualizarInterfaz(data);
                }
            }
        })
        .catch(err => console.log("Esperando...", err));
}

// --- LÓGICA DE DADO ---

function tirarDado(targetId) {
    if (animando) return;
    animando = true; 
    
    // 1. Decidimos el número AQUÍ (instantáneo)
    let resultadoLocal = Math.floor(Math.random() * 6) + 1;

    // 2. Feedback visual y giro
    if(ultimoEstado) actualizarInterfaz(ultimoEstado);
    iniciarGiroFrenetico();
    
    setTimeout(() => {
        animarDado(resultadoLocal);
    }, 500);

    // 3. Enviamos el resultado al servidor
    fetch('jugar?modo=datos&action=tirar&t=' + Date.now() + '&targetId=' + targetId + '&dadoManual=' + resultadoLocal)
        .then(r => r.json())
        .then(data => gestionarRespuestaTirada(data));
}

function tirarDadoManual(targetId, valor) {
    if (animando) return;
    animando = true;
    if(ultimoEstado) actualizarInterfaz(ultimoEstado);

    iniciarGiroFrenetico();
    
    setTimeout(() => {
        animarDado(valor);
    }, 500);

    fetch('jugar?modo=datos&action=tirar&t=' + Date.now() + '&targetId=' + targetId + '&dadoManual=' + valor)
        .then(r => r.json())
        .then(data => gestionarRespuestaTirada(data));
}

function iniciarGiroFrenetico() {
    let dado = document.getElementById('dado');
    if (!dado) return;

    dado.style.transition = 'none';
    if (intervaloVisualDado) clearInterval(intervaloVisualDado);
    intervaloVisualDado = setInterval(() => {
        globalRotX += 40 + Math.random() * 20; 
        globalRotY += 40 + Math.random() * 20;
        dado.style.transform = `rotateX(${globalRotX}deg) rotateY(${globalRotY}deg)`;
    }, 50);
}

function animarDado(resultado) {
    clearInterval(intervaloVisualDado);
    let dado = document.getElementById('dado');
    if (dado) {
        dado.style.transition = 'transform 0.5s cubic-bezier(0.15, 0.9, 0.34, 1)'; 
        const coords = { 1:[0,0], 2:[0,180], 3:[0,-90], 4:[0,90], 5:[-90,0], 6:[90,0] };
        
        let baseRotX = Math.ceil(globalRotX / 360) * 360 + 720;
        let baseRotY = Math.ceil(globalRotY / 360) * 360 + 720;

        let rotXFinal = baseRotX + coords[resultado][0];
        let rotYFinal = baseRotY + coords[resultado][1];
        
        globalRotX = rotXFinal;
        globalRotY = rotYFinal;

        requestAnimationFrame(() => {
            dado.style.transform = `rotateX(${rotXFinal}deg) rotateY(${rotYFinal}deg)`;
        });
    }
}

// ------------------------------------

function gestionarRespuestaTirada(data) {
    animando = true; 

    let jugadorMoviendose = null;
    let origen = -1;
    let destinoFinal = -1;

    data.jugadores.forEach(j => {
        let posLocal = posicionesLocales[j.idUsuario];
        if (posLocal === undefined) posLocal = j.casilla;
        if (posLocal !== j.casilla) {
            jugadorMoviendose = j;
            origen = posLocal;
            destinoFinal = j.casilla;
        }
    });

    if (jugadorMoviendose) {
        if (data.ultimoDado > 0) {
            if (jugadorMoviendose.idUsuario !== data.idUsuarioLogueado) {
                animarDado(data.ultimoDado);
            }
        }

        let destinoIntermedio = (data.casillaIntermedia !== undefined && data.casillaIntermedia > -1) 
                                ? data.casillaIntermedia 
                                : destinoFinal;

        prepararEscenaAnimacion(origen, jugadorMoviendose, data);

        setTimeout(() => {
            moverFichaActorPasoAPaso(jugadorMoviendose, origen, destinoIntermedio, data.ultimoDado, () => {
                
                if (data.mensaje && data.mensaje !== "" && data.idMensaje !== ultimoIdMensaje) {
                    mostrarNotificacion(data.mensaje);
                    ultimoIdMensaje = data.idMensaje;
                    setTimeout(() => finalizarAnimacion(data, jugadorMoviendose, destinoFinal), 2000);
                } else {
                    finalizarAnimacion(data, jugadorMoviendose, destinoFinal);
                }
            });
        }, 600); 
    } else {
        if(intervaloVisualDado) {
            clearInterval(intervaloVisualDado);
            let dado = document.getElementById('dado');
            if(dado) {
               dado.style.transition = 'transform 0.5s ease';
               let r = Math.ceil(globalRotX/90)*90;
               dado.style.transform = `rotateX(${r}deg) rotateY(${Math.ceil(globalRotY/90)*90}deg)`;
            }
        }
        
        animando = false;
        actualizarTablero(data);
        actualizarInterfaz(data);
        // Si al refrescar vemos que ya hay ganador (ej: reload tardío), mostramos
        if (data.ganador && data.ganador !== "") mostrarVictoria(data.ganador);
    }
}

function prepararEscenaAnimacion(casillaOrigen, jugador, data) {
    let celdaOrigen = document.getElementById('celda-' + casillaOrigen);
    if (!celdaOrigen) return;

    let rect = celdaOrigen.getBoundingClientRect();
    let actor = document.createElement('img');
    actor.src = jugador.imagen;
    actor.className = 'ficha-animada'; 
    actor.id = 'actor-movimiento';
    actor.style.left = (rect.left + rect.width/2 - 37.5) + 'px';
    actor.style.top = (rect.top + rect.height/2 - 37.5) + 'px';
    document.body.appendChild(actor);

    let rolesSeQuedan = [];
    data.jugadores.forEach(j => {
        let pos = posicionesLocales[j.idUsuario];
        if (pos === undefined) pos = j.casilla;
        if (pos === casillaOrigen && j.idUsuario !== jugador.idUsuario) rolesSeQuedan.push(j.rol);
    });

    celdaOrigen.querySelectorAll('.ficha-mini').forEach(el => el.remove());
    if (rolesSeQuedan.length > 0) {
        let img = document.createElement('img');
        img.src = 'combinaciones_png/' + obtenerNombreCombinado(rolesSeQuedan);
        img.className = 'ficha-mini'; 
        celdaOrigen.appendChild(img);
    }
}

function moverFichaActorPasoAPaso(jugador, inicio, objetivoVisual, dado, callback) {
    let pasosDados = 0;
    let actual = inicio;
    let actor = document.getElementById('actor-movimiento');
    let direccion = 1; // 1 = Adelante, -1 = Atrás
    
    if (!actor) { if(callback) callback(); return; }
    if (inicio === objetivoVisual) { if(callback) callback(); return; }

    let intervalo = setInterval(() => {
        pasosDados++;
        
        // --- LOGICA REBOTE CORRECTA ---
        if (actual === 63) direccion = -1; // Si tocas pared, rebotas
        actual += direccion;
        // ------------------------------

        let celdaDestino = document.getElementById('celda-' + actual);
        if (celdaDestino) {
            let rect = celdaDestino.getBoundingClientRect();
            actor.style.left = (rect.left + rect.width/2 - 37.5) + 'px';
            actor.style.top = (rect.top + rect.height/2 - 37.5) + 'px';
            
            actor.style.transform = "scale(1.3)";
            setTimeout(() => actor.style.transform = "scale(1)", 200);
        }

        if (pasosDados >= dado) {
            clearInterval(intervalo);
            setTimeout(() => { if(callback) callback(); }, 400);
        }
    }, 450); 
}

function finalizarAnimacion(data, jugador, destino) {
    let actor = document.getElementById('actor-movimiento');
    if (actor) actor.remove();

    posicionesLocales[jugador.idUsuario] = destino;
    animando = false; 
    
    actualizarTablero(data);
    actualizarInterfaz(data);
    
    // Si alguien ganó, mostramos victoria para TODOS (el servidor manda data.ganador)
    if (data.ganador && data.ganador !== "") {
        mostrarVictoria(data.ganador);
    } else if (destino === 63) {
        // Fallback por si acaso
        mostrarVictoria(jugador.nick);
    }
}

function actualizarTablero(data) {
    if (animando) return; 
    document.querySelectorAll('.ficha-mini').forEach(el => el.remove());

    let celdasOcupadas = {};
    data.jugadores.forEach(jugador => {
        if (!celdasOcupadas[jugador.casilla]) celdasOcupadas[jugador.casilla] = [];
        celdasOcupadas[jugador.casilla].push(jugador.rol);
    });

    for (let casilla in celdasOcupadas) {
        let celdaDOM = document.getElementById('celda-' + casilla);
        if (celdaDOM) {
            let img = document.createElement('img');
            img.src = 'combinaciones_png/' + obtenerNombreCombinado(celdasOcupadas[casilla]);
            img.className = 'ficha-mini';
            celdaDOM.appendChild(img);
        }
    }
}

function obtenerNombreCombinado(roles) {
    let m = roles.includes("marcos"), v = roles.includes("vader"), j = roles.includes("jaume"), p = roles.includes("paula");
    if (m && v && j && p) return "comb_15_marcos+vader+jaume+paula.png";
    if (v && j && p) return "comb_14_vader+jaume+paula.png";
    if (m && j && p) return "comb_13_marcos+jaume+paula.png";
    if (m && v && p) return "comb_12_marcos+vader+paula.png";
    if (m && v && j) return "comb_11_marcos+vader+jaume.png";
    if (j && p) return "comb_10_jaume+paula.png";
    if (v && p) return "comb_09_vader+paula.png";
    if (v && j) return "comb_08_vader+jaume.png";
    if (m && p) return "comb_07_marcos+paula.png";
    if (m && j) return "comb_06_marcos+jaume.png";
    if (m && v) return "comb_05_marcos+vader.png";
    if (p) return "comb_04_paula.png";
    if (j) return "comb_03_jaume.png";
    if (v) return "comb_02_vader.png";
    return "comb_01_marcos.png";
}

function actualizarInterfaz(data) {
    document.getElementById('col-izq').innerHTML = '';
    document.getElementById('col-der').innerHTML = '';

    data.jugadores.forEach((jugador, index) => {
        // Pasamos el dato del ganador para bloquear botones
        let card = crearHTMLTarjeta(jugador, data.idUsuarioLogueado, data.esModoDev, data.ganador);
        if (index < 2) document.getElementById('col-izq').innerHTML += card;
        else document.getElementById('col-der').innerHTML += card;
    });
}

function mostrarNotificacion(msg) {
    const n = document.getElementById('notificacion');
    n.innerHTML = msg;
    n.style.display = 'block';
    setTimeout(() => { n.style.display = 'none'; }, 3000);
}

function crearHTMLTarjeta(jugador, miId, esModoDev, ganador) {
    let esMiTurno = (jugador.turno === 1);
    let soyYo = (jugador.idUsuario === miId);
    let control = (soyYo || esModoDev);
    let active = esMiTurno ? 'active-turn' : '';
    
    let html = `<div class="player-card ${active}">
        <div class="avatar-zoom-box"><img src="${jugador.imagen}" class="player-avatar"></div>
        <p class="player-name">${jugador.nick}</p>
        <p class="player-rank">Casilla: ${jugador.casilla}</p>`;

    // --- SI HAY GANADOR, BLOQUEAMOS TODO ---
    if (ganador && ganador !== "") {
        html += `<div class="status-indicator badge-blocked" style="background:var(--dark); color:white;">🏆 GANÓ ${ganador}</div>`;
        html += `</div>`;
        return html;
    }

    if (jugador.bloqueo > 0) {
        if (esMiTurno && control) {
             html += `<div class="status-indicator badge-blocked" style="margin-bottom:5px;">🚫 BLOQUEADO (${jugador.bloqueo})</div>
                      <button onclick="pasarTurnoBloqueo(${jugador.idUsuario})" class="status-indicator btn-lanzar" style="background:#e74c3c;">PASAR TURNO 💤</button>`;
        } else {
             html += `<div class="status-indicator badge-blocked">🚫 BLOQUEADO (${jugador.bloqueo})</div>`;
        }
    } else if (esMiTurno) {
        if (control) {
            if (animando) {
                html += `<button disabled class="status-indicator btn-lanzar btn-disabled">🎲 RODANDO...</button>`;
            } else {
                if (esModoDev) {
                    html += `<div class="dev-container"><small style="display:block; margin-bottom:5px; color:#b45309;">🛠️ TRUCAR</small>
                             <div class="dev-buttons">
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 1)" class="btn-dev">1</button>
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 2)" class="btn-dev">2</button>
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 3)" class="btn-dev">3</button>
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 4)" class="btn-dev">4</button>
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 5)" class="btn-dev">5</button>
                                <button onclick="tirarDadoManual(${jugador.idUsuario}, 6)" class="btn-dev">6</button>
                             </div></div>`;
                } else {
                    html += `<button onclick="tirarDado(${jugador.idUsuario})" class="status-indicator btn-lanzar">🎲 LANZAR DADO</button>`;
                }
            }
        } else {
            html += `<div class="status-indicator badge-wait">🎲 TURNO RIVAL</div>`;
        }
    } else {
        html += `<div class="status-indicator badge-wait">⏳ ESPERANDO...</div>`;
    }
    html += `</div>`;
    return html;
}

function pasarTurnoBloqueo(targetId) {
    fetch('jugar?modo=datos&action=pasarTurno&t=' + Date.now() + '&targetId=' + targetId)
        .then(() => cargarEstado()); 
}

function mostrarVictoria(ganador) {
    clearInterval(intervaloJuego); 
    const overlay = document.getElementById('overlay');
    document.getElementById('texto-ganador').innerText = "¡Enhorabuena, " + ganador + "!";
    overlay.style.display = 'flex';
    document.getElementById('contenedor-confeti').innerHTML = ''; 
    for(let i=0; i<50; i++) {
        let c = document.createElement('div'); 
        c.className = 'confeti';
        c.style.left = Math.random()*100+'%'; 
        c.style.backgroundColor = ['#f1c40f','#e74c3c','#3498db','#2ecc71'][Math.floor(Math.random()*4)];
        c.style.animationDelay = Math.random()*2+'s'; 
        document.getElementById('contenedor-confeti').appendChild(c);
    }
}