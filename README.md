# Trabajo Práctico 10 - Consultas de reservas paso a paso

## 1. Punto de partida y proyecto
Este proyecto (copia denominada `tp-10-salas-consultas-mongodb`) es la continuación directa del TP09. Su objetivo principal es incorporar operaciones de lectura avanzadas (consultas) al listado de la API, agregando capacidades de **filtrado, ordenamiento, paginación y selección de campos (proyección)** sin alterar los documentos en la base de datos ni romper las operaciones CRUD previas.

## 2. Entorno y Versiones
- **Node.js**: >= 22.13.0
- **Base de Datos**: MongoDB Atlas, clúster gratuito Free (M0). Colección: `reservas`. Base: `reservas_salas_u10`.
- **Dependencias principales**: Express 5.2.1, Mongoose 9.10.3.

## 3. Preparación, Instalación y Ejecución
1. **Instalación:** Ejecutar `npm install`.
2. **Entorno Atlas y DNS:** Se configuró un clúster Free (M0). El archivo `src/config/base-datos.js` impone el uso de resolutores DNS públicos (`8.8.8.8`, `1.1.1.1`).
3. **Variables de Entorno:** Copiar `.env.example` como `.env` e inyectar la credencial real (`MONGODB_URI`) apuntando a la base `reservas_salas_u10`.
4. **Comando de Inicio:**
   ```bash
   node --env-file=.env src/index.js
   ```

## 4. Estructura por Capas y Consultas
Se respetó la arquitectura original. El listado web (HTML) y la ruta `/estado` continúan utilizando el método `listar()` y `contar()` originales sin alteraciones. 
Para la API, se creó un método independiente:
- **`src/controladores/reservas.js` (`listarApi`)**: Intercepta y valida estrictamente los query parameters (`sala`, `orden`, `pagina`, `limite`). Asigna valores por defecto y rechaza parámetros desconocidos o inválidos (400).
- **`src/servicios/reservas-mongo.js` (`consultar`)**: Recibe los parámetros limpios y construye la consulta Mongoose aplicando `.find(filtro)`, `.select()`, `.sort()`, `.skip()` y `.limit()`.

## 5. Contrato HTTP de la API - Listado (GET /api/reservas)
El endpoint `GET /api/reservas` ahora responde con un objeto de metadatos y un arreglo limitado de resultados:
```json
{
  "datos": [ ... ],
  "pagina": 1,
  "limite": 2,
  "total": 6,
  "paginas": 3
}
```
**Parámetros aceptados (Query Params):**
- `sala`: Filtro exacto por nombre de sala (ej: "Sala Norte").
- `orden`: "estudiante" (default), "personas-asc", "personas-desc". Desempata siempre por `_id` ascendente.
- `pagina`: Número entero entre 1 y 1000 (default: 1).
- `limite`: Número entero entre 1 y 20 (default: 2).

*El resto de los endpoints (POST, GET/:id, PUT, PATCH, DELETE) mantienen el contrato y comportamiento exacto del TP09.*

## 6. Instrucciones para Postman (Consultas)
En Postman, configurar **Body: none**. Usar la pestaña **Params** para encender o apagar las distintas combinaciones:
1. **Listado por defecto:** `GET /api/reservas` (Sin params). Devuelve la página 1, límite 2, total de documentos y total de páginas.
2. **Filtrar y Ordenar:** Activar Key `sala` = `Sala Norte` y Key `orden` = `personas-asc`.
3. **Paginar:** Activar Key `pagina` = `3` y Key `limite` = `2`. (Si no hay suficientes documentos para esa página, `datos` devolverá un arreglo vacío `[]` con estado 200).

## 7. Matriz de Pruebas de Consultas (Resultados Observados)
*(Pruebas ejecutadas sobre una base inicial de 6 reservas de ejercicio)*

| Caso (Query Params) | Resultado Observado (Estado y Respuesta) |
| :--- | :--- |
| **Sin Params (Comparación pág 1 y 2)** | 200 OK. Página 1 devolvió 2 reservas (Ej IDs: `6745aa...` y `6745bb...`). Al pedir `pagina=2`, devolvió 2 reservas con IDs distintos (`6745cc...` y `6745dd...`), demostrando el salto correcto. |
| **sala=Sala Norte, pagina=3, limite=2** | 200 OK. `datos` vacío `[]`, total 4, paginas 2. |
| **sala=Sala inexistente** | 200 OK. `datos` vacío `[]`, total 0, paginas 0. |
| **pagina=0** o **pagina=1.5** | 400 Bad Request. Rechazado por validación de rango/enteros. |
| **limite=21** | 400 Bad Request. Rechazado por límite máximo excedido. |
| **Dos filas pagina activas** (Array) | 400 Bad Request. Rechazado por no ser un valor textual único. |
| **sala vacía** o **repetida** | 400 Bad Request. Rechazado por validación estricta de string. |
| **orden=otro** o **select=email** | 400 Bad Request. Rechazado por parámetro no permitido/desconocido. |
| **Reinicio del servidor** | Se detuvo el proceso Node (Ctrl+C). Al reiniciar, un GET individual al ID `6745aa...` devolvió exactamente el mismo recurso (estudiante, sala, personas) sin alteraciones. |

## 8. Calidad de Código
- `.gitignore` intercepta dependencias y secretos locales.
- Prettier y ESLint analizaron toda la base de código (`src/` y `scripts/`) sin reportar errores.

## 9. Decisión de Diseño conceptual (Salas y Reservas)
Si decidiéramos incorporar información detallada de las salas, los datos que describirían a una sala serían su capacidad máxima, ubicación (piso/edificio) y equipamiento (proyector, pizarra, etc.). Por otro lado, la reserva mantendría los datos del evento temporal: estudiante, fecha, turno, cantidad de asistentes y estado. 

Para este escenario, **tendría sentido utilizar una Referencia** (guardar el `salaId` dentro de la reserva) en lugar de datos embebidos. Esto se debe a que la sala es una entidad física independiente que existe por sí misma y será compartida por muchísimas reservas a lo largo del tiempo. Si la sala cambia su equipamiento, solo actualizamos un documento maestro de sala en lugar de modificar miles de reservas históricas embebidas.