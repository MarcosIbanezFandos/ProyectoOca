FROM tomcat:9.0-jdk11-openjdk
# Copiamos todo el contenido de tu carpeta 'oca' a la raíz del servidor
COPY . /usr/local/tomcat/webapps/ROOT
EXPOSE 8080
CMD ["catalina.sh", "run"]