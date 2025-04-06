const cors = require('cors');

const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const express = require('express');

const saltRounds = 10;

const app = express();
const PORT = 3000;

app.use(cors());
//CONEXIÓN
const db = mysql.createConnection({
    host: 'shortline.proxy.rlwy.net',
    user: 'root',
    password: 'ObOvdDRvZEqieXSaRPAMORKnUVnMexFA',
    database: 'railway',
    port: '21478'
});

db.connect((err) => {
    if(err){
        console.error('Error al conextar a la base de datos: ',err);
    }else{
        console.log('Conectado a la base de datos MYSQL');
    }
});

//MIDDELWARE PARA LEER JSON
app.use(express.json());

//RUTA PRINCIPAL
app.get('/', (request, result) => {
    result.send('Hola API');
});

// RUTA REGISTRAR USUARIOS
app.post('/usuarios', (request, result) => {
    const {Nombre, Apaterno, Amaterno, Usuario, Contra} = request.body;

    bcrypt.hash(Contra, saltRounds, (err, hash) => {
        if(err){
            console.error('Error al hashear la contraseña: ', err);
            return result.status(500).json({ error: 'Error en el servidor'});
        }
        const sql = 'INSERT INTO tbl_usuarios (Usuario_Nombre, Usuario_APaterno, Usuario_AMaterno, Usuario_Usuario, Usuario_Contrasenia, Usuario_fecCreacion) VALUES (?,?,?,?,?,NOW())';

        db.query(sql, [Nombre, Apaterno, Amaterno, Usuario, hash], (err, dbResult) => {
            if(err){
                console.error('Error al registrar usuario: ', err);
                return result.status(500).json({ error: 'No se pudo registrar el usuario'});
            }
            result.status(201).json({ mensaje: 'Usuario creado con éxito', id: dbResult.insertId });
        });
    });
});

// RUTA LOGIN
app.post('/login', (request, result) => {
    const { usuario, contra } = request.body;

    const sql = 'SELECT * FROM tbl_usuarios WHERE Usuario_Nombre = ?';

    db.query(sql, [usuario], (err, rows) => {
        if(err){
            console.error('Error en el Login: ', err);
            return result.status(500).json({ error: 'Error en el Servidor'});
        }
        if(rows.length === 0){
            result.status(401).json({ mensaje: 'Usuario no encontrado' });
        }
        const user = rows[0];
        //COMPARAR CONTRASEÑAS
        bcrypt.compare(contra, user.Usuario_Contrasenia, (err, isEqual) => {
            if(err){
                return result.status(500).json({ error: 'Error al verificar la Contraseña'});
            }
            if(!isEqual){
                result.status(401).json({ mensaje: 'Contraseña Incorrecta' });
            }
            result.status(200).json({ mesaje: 'Login Exitoso', usuario: {
                id: user.UsuarioId, 
                nombre: user.Usuario_Nombre + ' ' + user.Usuario_APaterno + ' ' + user.Usuario_AMaterno
            } });
        });
    });
});

// RUTA CONSULTA DE USUARIOS
app.get('/obtenerUsuarios', (request, result) => {
    const sql = `SELECT CONCAT(Usuario_Nombre, ' ', Usuario_APaterno, ' ', Usuario_AMaterno) AS Nombre FROM tbl_usuarios`;

    db.query(sql, (err, rows) => {
        if(err){
            console.error('Error al obtener los usuarios: ', err);
            return result.status(500).json({ error: 'Error en el servidor' });
        }
        result.status(200).json({ mensaje: 'Usuarios obtenidos', usuarios: rows });
    });
});

// RUTA ENVIAR MENSAJE
app.post('/envioMensajes',(request,result) => {
    const {remitenteId, destinatarioId, mensaje } = request.body;

    const sql = `INSERT INTO tbl_mensajes (Mensaje_EmisorId,Mensaje_ReceptorId,Mensaje_Contenido,Mensaje_FecEnvio) VALUES (?,?,?,NOW())`;
    db.query(sql, [remitenteId, destinatarioId, mensaje], (err, result) => {
        if(err){
            console.error('Error al enviar mensaje: ',err);
            return result.status(500).json({ error: 'No se pudo enviar el mensaje'});
        }
        result.status(201).json({ mensaje: 'Mensaje enviado con éxito', id: result.insertId });
    });
});

// RUTA VER MENSAJES    
app.get('/verMensajes', (request,result) => {
    const {user1, user2} = request.query;

    const sql = `SELECT m.MensajeId, m.Mensaje_EmisorId, m.Mensaje_ReceptorId, m.Mensaje_Contenido, m.Mensaje_FecEnvio,
                    CONCAT(u1.Usuario_Nombre, ' ', u1.Usuario_APaterno, ' ', u1.Usuario_AMaterno) AS Remitente,
                    CONCAT(u2.Usuario_Nombre, ' ', u2.Usuario_APaterno, ' ', u2.Usuario_AMaterno) AS Destinatario
                    FROM tbl_mensajes m 
                    INNER JOIN tbl_usuarios u1 ON m.Mensaje_EmisorId = u1.UsuarioId
                    INNER JOIN tbl_usuarios u2 ON m.Mensaje_ReceptorId = u2.UsuarioId
                    WHERE (m.Remitente_ID = ? AND m.Destinatario_ID = ?) OR (m.Remitente_ID = ? AND m.Destinatario_ID = ?)
                    ORDER BY m.Mensaje_FecEnvio ASC;`;
    
    db.query(sql, [user1, user2, user2, user1], (err, rows) => {
        if(err){
            console.error('Error al obtener los mensajes: ',err);
            return result.status(500).json({ error: 'No se pudieron obtener mensajes' });
        }
        result.status(200).json({ mensajes: rows });
    });
});

app.listen(PORT, () => {
    console.log(`API corriendo en http://localhost:${PORT}`);
});