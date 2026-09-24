# Guía de sustentación: Red de Transporte Hyperloop

## 1. Cómo ejecutarlo en tu computador
Requisito: Node.js 18 o superior (`node -v` para comprobarlo).

```bash
cd hyperloop-api
npm install          # instala express, jest y supertest
npm test             # corre las 21 pruebas
npm run test:coverage  # (opcional) muestra el % de cobertura
npm run test:buggy   # (demo) las MISMAS pruebas contra el código original con bugs
npm start            # (opcional) levanta la API en http://localhost:3000
```

## 2. Estructura del proyecto
| Archivo | Para qué sirve |
|---|---|
| `app.js` | API corregida (Modelo -> Servicio -> Controlador -> Rutas) |
| `original/app.buggy.js` | Código original con los 2 bugs (para comparar) |
| `tests/unit.test.js` | 10 pruebas unitarias |
| `tests/integration.test.js` | 9 pruebas de integración (3 Top-Down, 3 Bottom-Up, 3 Big Bang) |
| `tests/regression.test.js` | 2 pruebas de regresión |
| `server.js` | Arranca el servidor (separado de `app.js` para poder probar sin abrir puertos) |

Cambios de testabilidad (no alteran la lógica): `app.js` ahora exporta también `PodModel`, `HyperloopService` y `HyperloopController`, y `PodModel.reset()` reinicia los datos entre pruebas.

## 3. Errores encontrados y cómo se solucionaron

**Bug 1 - Sobreventa (overbooking).**
- Original: `if (pod.passengers > pod.capacity)`
- Problema: con 20/20 la condición `20 > 20` es falsa, así que se vendía el asiento 21.
- Solución: `if (pod.passengers >= pod.capacity)`

**Bug 2 - Sobrescritura de destino.**
- Original: `pod.destination = requestedDestination;` se ejecutaba siempre.
- Problema: un pasajero nuevo cambiaba el destino de todos los que ya iban a bordo.
- Solución: si la cápsula ya lleva pasajeros y tiene destino, solo se acepta el mismo destino; uno distinto lanza `Destino no coincide con el de la cápsula en tránsito` (HTTP 400). Si está vacía, el primer pasajero define la ruta.
- Decisión de diseño: se rechaza en lugar de ignorar en silencio, para que el cliente sepa que su reserva no se hizo.

## 4. Justificación de los enfoques de integración
- **Top-Down (TD1-TD3):** se empieza por controlador/rutas y se **mockea** lo de abajo (`bookSeat`, `getPods`). Sirve para validar el contrato HTTP (200/400) sin depender de la lógica ni de los datos.
- **Bottom-Up (BU1-BU3):** se empieza por Modelo + Servicio reales y se sube hasta el Controlador. Sirve para confirmar que la lógica de negocio y los datos funcionan bien antes de exponerlos.
- **Big Bang (BB1-BB3):** todo integrado a la vez con peticiones HTTP reales (`supertest`). Sirve para validar el flujo completo de extremo a extremo.

## 5. Guion sugerido para la demo
1. Mostrar `original/app.buggy.js` y señalar las 2 líneas defectuosas.
2. Ejecutar `npm run test:buggy`: fallan 7 pruebas (U5, U6, U9, BU2, BU3, REG-1, REG-2). Explicar que así se detectan los bugs.
3. Mostrar `app.js` corregido y explicar los 2 arreglos.
4. Ejecutar `npm test`: pasan las 21.
5. Recorrer `tests/` explicando por qué se eligió cada enfoque (sección 4).

## 6. Preguntas que podrían hacerte
- **¿Diferencia entre mock y spy?** El mock reemplaza el comportamiento (`mockReturnValue`); el spy observa las llamadas (`toHaveBeenCalledWith`). En Jest `spyOn` permite ambas cosas y `restoreAllMocks` deja todo como estaba.
- **¿Por qué `PodModel.reset()` en `beforeEach`?** Los datos viven en memoria; sin reiniciarlos, una prueba contamina a la siguiente.
- **¿Qué es una prueba de regresión?** Una que asegura que un bug ya corregido no vuelva. REG-1 y REG-2 reproducen exactamente los 2 bugs.
- **¿Por qué separar `app.js` y `server.js`?** Para que `supertest` use la app sin ocupar un puerto real.
