# Usa una imagen base oficial de Node.js 18-alpine
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY package.json .
COPY package-lock.json .

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos
COPY . .

# Instala el Cloud SQL Auth Proxy
RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy && chmod +x cloud_sql_proxy

# Expone el puerto de la aplicación
EXPOSE 8000

# Comando para iniciar la aplicación y el Cloud SQL Auth Proxy
CMD ["sh", "-c", "./cloud_sql_proxy -dir=/cloudsql & npm run start"]
