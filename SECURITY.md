# Premisas de seguridad — ProyectoOca

Reglas que **todo cambio en este repositorio debe cumplir** antes de mergear.
Aplica igual a código escrito a mano y a código generado por un asistente de IA.

Stack: Servlets Java sobre Tomcat · MySQL en AWS RDS · frontend estático.

> Este repositorio es **público**. Todo lo que se commitea es visible para
> cualquiera, para siempre, aunque se borre después.

---

## 1. Secretos y credenciales

**Ningún secreto en el código.** Ni en `.java`, ni en `web.xml`, ni en el README.

Y muy importante en este proyecto: **tampoco en los `.class` compilados.** Un
`.class` no es un binario opaco — las constantes de texto se leen en dos segundos:

```bash
javap -c -p WEB-INF/classes/Conexion.class   # muestra cada literal del código
```

Commitear un `.class` con una contraseña dentro publica exactamente lo mismo que
commitear el fuente con la contraseña dentro.

> **Nota sobre este repositorio:** hoy se versionan los `.class` de
> `WEB-INF/classes/` porque son el artefacto que despliega el `Dockerfile` y los
> fuentes `.java` nunca se subieron. Por eso **no** están en `.gitignore`:
> borrarlos rompería el despliegue. La dirección correcta es subir los `.java`
> (como ya se ha hecho con `src/Conexion.java`) y compilar dentro del Dockerfile;
> a partir de ahí sí se podrán ignorar los compilados.

La conexión a base de datos se lee del entorno, con fallo ruidoso si falta:

Es lo que hace ya `src/Conexion.java`:

```java
private static final String URL  = System.getenv("DB_URL");
private static final String USER = System.getenv("DB_USER");
private static final String PASS = System.getenv("DB_PASSWORD");
// ❌ nunca:  private static final String PASS = "mipassword123";
```

El despliegue necesita `DB_URL`, `DB_USER` y `DB_PASSWORD` en el entorno. Sin
ellas la aplicación arranca pero no conecta, y lo dice en el log.

Reglas de base de datos:

- **Nunca el usuario `root`.** Un usuario dedicado con permisos solo sobre
  `juego_oca`, y solo `SELECT/INSERT/UPDATE/DELETE`. Nada de `GRANT ALL`.
- La instancia RDS **no debe ser accesible desde internet**: `Publicly accessible = No`
  y un security group que solo permita el 3306 desde el servidor de la aplicación.
- Contraseña larga y aleatoria, generada por un gestor. Rotarla ante cualquier duda.
- Añadir al `.gitignore`: `*.class`, `WEB-INF/classes/`, `*.war`, `build/`, `target/`.
  Lo que se versiona es el **fuente**, no el compilado.

### Si se filtra una credencial

Rotarla en AWS **primero**. Quitarla del código después. Asumir que el histórico
de git la conserva. Revisar los logs de conexión de RDS.

---

## 2. Contraseñas de usuario

El esquema actual guarda `password_hash` con **SHA-256 sin salt**. Eso no es
suficiente: SHA-256 está diseñado para ser rápido, y una GPU prueba miles de
millones de combinaciones por segundo. Con una tabla arcoíris, las contraseñas
comunes caen al instante, y dos usuarios con la misma clave tienen el mismo hash.

Usar un algoritmo pensado para contraseñas — **bcrypt**, scrypt o Argon2 — que
lleva salt propio y es deliberadamente lento:

```java
// dependencia: org.mindrot:jbcrypt
String hash = BCrypt.hashpw(clavePlana, BCrypt.gensalt(12));   // registro
boolean ok  = BCrypt.checkpw(clavePlana, hashGuardado);        // login
```

Además:

- Longitud mínima de 8-12 caracteres, validada en servidor.
- El mismo mensaje de error para usuario inexistente y contraseña incorrecta
  ("Usuario o contraseña incorrectos"). Si difieren, se pueden enumerar cuentas.
- Migración: al hacer login con éxito contra el hash viejo, recalcular con bcrypt
  y actualizar. Marcar en la tabla qué algoritmo usa cada fila.

---

## 3. Validación de entradas

- **SQL injection: seguir usando `PreparedStatement` con `?` siempre.** El código
  actual lo hace bien en todos los servlets — mantenerlo. Nunca construir SQL
  concatenando:
  ```java
  // ✅
  ps = con.prepareStatement("SELECT * FROM usuarios WHERE nick = ?");
  ps.setString(1, nick);

  // ❌ inyección directa
  st.executeQuery("SELECT * FROM usuarios WHERE nick = '" + nick + "'");
  ```
- Validar en el servidor todo `request.getParameter(...)`: nulos, longitud máxima,
  formato. El `required` del HTML se salta con `curl`.
- Los numéricos, con `Integer.parseInt` dentro de try/catch y comprobación de rango.
- **XSS:** el HTML que generan los servlets debe escapar cualquier dato del
  usuario (el nick aparece en el tablero y en el lobby). Usar
  `org.apache.commons.text.StringEscapeUtils.escapeHtml4(nick)` antes de
  concatenarlo en la respuesta.
- Nunca exponer stacktraces al navegador: log en servidor, mensaje genérico fuera.

---

## 4. Autorización y sesiones

- **Toda acción sobre una partida comprueba que el usuario de la sesión participa
  en ella.** Sin eso, cambiar el `idpartida` de la URL permite borrar o jugar
  partidas ajenas. Los `WHERE idpartida = ? AND id_usuario = ?` que ya existen son
  el patrón correcto: no lo pierdas en código nuevo.
- El `id_usuario` sale **siempre de `session.getAttribute(...)`**, jamás de un
  parámetro de la petición.
- Cada servlet protegido empieza comprobando que hay sesión válida; si no, redirige
  al login.
- `session.invalidate()` en logout y `request.changeSessionId()` tras el login
  (evita fijación de sesión).
- Cookie de sesión con `HttpOnly`, `Secure` y `SameSite=Lax` en `web.xml`:
  ```xml
  <session-config>
    <cookie-config>
      <http-only>true</http-only>
      <secure>true</secure>
    </cookie-config>
    <session-timeout>30</session-timeout>
  </session-config>
  ```
- Formularios que modifican estado: token CSRF en sesión, verificado al recibir.

---

## 5. Rate limiting

- **Login y registro son lo prioritario:** sin límite, la fuerza bruta contra
  contraseñas es cuestión de tiempo. Máximo ~5 intentos fallidos por usuario/IP en
  15 minutos, con espera creciente después.
- Limitar también la creación de partidas y las tiradas de dado, para que un
  script no inunde la base de datos.
- Un `Filter` de Tomcat con un contador en memoria basta para este proyecto.

---

## 6. Dependencias y despliegue

- `mysql-connector-j` y el resto de librerías, actualizadas. Revisar CVEs antes de
  cada despliegue.
- HTTPS obligatorio: sobre HTTP, la contraseña del login viaja en claro.
- Activar en GitHub **Secret scanning** y **Push protection** (hoy están
  desactivados en este repositorio): Settings → Code security.

---

## 7. Checklist antes de abrir una PR

- [ ] Cero credenciales en el diff — incluidos `.class` y ficheros de configuración.
- [ ] Todas las consultas usan `PreparedStatement` con `?`.
- [ ] El `id_usuario` viene de la sesión, nunca de un parámetro.
- [ ] Se comprueba que el usuario pertenece a la partida sobre la que actúa.
- [ ] Los datos del usuario se escapan antes de insertarlos en el HTML.
- [ ] Los parámetros se validan en servidor (nulos, longitud, rango).
- [ ] Login y registro siguen limitados.

---

## Reportar un problema

Si encuentras un fallo de seguridad, no abras un issue público: escribe a
marcos.elbosque@gmail.com.
