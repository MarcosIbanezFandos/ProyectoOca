# 🦢 Juego de La Oca Online - Multiplayer Edition

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Tomcat](https://img.shields.io/badge/Apache%20Tomcat-F8DC75?style=for-the-badge&logo=apache-tomcat&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

> **Una versión moderna, web y multijugador del clásico juego de mesa, desplegada en la nube.**

Este proyecto es una aplicación web completa desarrollada en **Java (Jakarta EE)** que permite a múltiples jugadores competir en tiempo real con sincronización de estado basada en base de datos.

---

## 📸 Capturas de Pantalla

| Registro de Usuario | Lobby de Partidas | Tablero en Juego |
|:-------------------:|:-----------------:|:----------------:|
| ![Registro](screenshots/Screenshot%20Register.png) | ![Lobby](screenshots/Screenshot%20Lobby.png) | ![Tablero](screenshots/Screenshot%20Tablero.png) |

---

## 🚀 Características Principales

* **🕹️ Multijugador Real:** Sincronización de turnos y movimientos mediante *polling* asíncrono.
* **🎲 Lógica de Juego Completa:** Implementación de todas las reglas clásicas (Oca, Puente, Posada, Pozo, Laberinto, Cárcel, Dados y Calavera).
* **⚙️ Configuración de Partida:** Soporte para modo rebote opcional, modo desarrollador y límite de jugadores por sala.
* **☁️ Arquitectura Cloud:**
    * **Backend:** Java Servlets sobre Apache Tomcat.
    * **Persistencia:** Base de datos MySQL alojada en **AWS RDS**.
    * **Despliegue:** Contenerizado con **Docker** (JDK 21) en **Railway**.

---

## 🛠️ Tecnologías Utilizadas

### Backend
* **Java Servlets:** Gestión de lógica de negocio, sesiones y validación de turnos.
* **JDBC:** Comunicación nativa con el motor MySQL.

### Frontend
* **JavaScript (ES6+):** Motor de animación de fichas, gestión de dado 3D y comunicación con la API mediante Fetch.
* **CSS3:** Animaciones avanzadas y diseño responsive.

---

## 🌐 Jugar en Línea

A diferencia de un proyecto local, este juego está desplegado en la nube y es accesible desde cualquier parte del mundo:
* **Enlace de acceso**: [¡Juega aquí ahora!](https://proyectoooca-production.up.railway.app)
* **Sin instalación**: No necesitas configurar Java ni Tomcat; solo entra con el link, regístrate y empieza la carrera.
* **Multijugador sincronizado**: Comparte el link con tus amigos, cread una sala y veréis los movimientos de los demás en tiempo real gracias a la sincronización con AWS RDS.

---

## 🔧 Instalación Local rápida con Docker

```
bash
git clone [https://github.com/MarcosIbanezFandos/ProyectoOca.git](https://github.com/MarcosIbanezFandos/ProyectoOca.git)
cd ProyectoOca
docker build -t oca-game .
docker run -p 8080:8080 oca-game
