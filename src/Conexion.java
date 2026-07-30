import java.sql.Connection;
import java.sql.DriverManager;

/**
 * Conexión a la base de datos MySQL (AWS RDS).
 *
 * Las credenciales se leen del entorno. NUNCA deben escribirse aquí: este
 * repositorio es público y, además, un fichero .class no oculta nada — las
 * constantes de texto se leen con `strings` o `javap -c` en dos segundos.
 *
 * Variables necesarias en el despliegue:
 *   DB_URL       jdbc:mysql://<host>:3306/juego_oca
 *   DB_USER      usuario dedicado a juego_oca (nunca root)
 *   DB_PASSWORD
 */
public class Conexion {
    private static final String URL = System.getenv("DB_URL");
    private static final String USER = System.getenv("DB_USER");
    private static final String PASS = System.getenv("DB_PASSWORD");

    public static Connection obtenerConexion() {
        Connection con = null;
        try {
            if (URL == null || USER == null || PASS == null) {
                throw new IllegalStateException(
                    "Faltan las variables de entorno DB_URL / DB_USER / DB_PASSWORD");
            }
            Class.forName("com.mysql.cj.jdbc.Driver");
            con = DriverManager.getConnection(URL, USER, PASS);
            System.out.println("¡Conectado con éxito a AWS RDS!");
        } catch (Exception e) {
            System.out.println("Error de conexión: " + e.getMessage());
        }
        return con;
    }
}
