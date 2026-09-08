# Estándares de ingeniería

MileCommand se construye contra **28 estándares** versionados junto al código. No son una guía de
estilo: son la vara con la que se mide cada cambio, y buena parte los hace cumplir una máquina.

**El cuerpo normativo completo es privado.** Lo que sigue es el mapa, con lo que cada estándar decide y
—más importante— **qué lo sostiene cuando nadie está mirando**.

## Por qué se escriben así

Tres reglas de redacción que se respetan sin excepción:

- **Presente perpetuo.** Un estándar describe el estado actual, nunca cómo se llegó a él. Cuando algo
  cambia, se reescribe el estándar; no se añade una nota de «esto cambió». El historial vive en git.
- **Autocontenidos.** Un estándar solo enlaza a otros estándares. Si al quitarle un enlace externo deja
  de entenderse, ese contenido era canónico y estaba en el lugar equivocado.
- **Con su costo escrito.** Donde un estándar acepta un riesgo, lo dice. Un estándar sin costos declarados
  se lee como si no tuviera ninguno.

## El mapa

| Grupo                | Qué decide                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Base**             | Principios, código limpio, límites por archivo y función, y qué se comprueba antes de escribir                |
| **Arquitectura**     | Cuatro capas por dominio, regla de dependencias y el patrón de repositorio                                    |
| **Sistema de diseño** | Tokens de marca, tema claro y oscuro, y white-label por compañía sin tocar componentes                        |
| **Por stack**        | Backend, web y móvil: estructura, estado, validación y nombres                                                |
| **Monorepo**         | Fronteras entre paquetes, targets y la regla de oro: solo se valida lo afectado                                |
| **Gates**            | La secuencia de verificación, en un solo lugar, que el pipeline llama                                          |
| **Entrega**          | Versionado, ramas, Pull Requests, work items y actas de verificación                                           |
| **Módulos**          | Catálogo componible: cada módulo declara su identidad, dependencias, permisos y límites                        |
| **Seguridad**        | Aislamiento multi-tenant, autenticación, bitácora y qué puede hacer cada rol                                   |
| **Interfaz**         | Qué debe contener cada pantalla, campo, tabla y estado, contra WCAG 2.2 AA                                    |
| **Proceso**          | Backlog, costeo, datos externos, especificación y el perfil Básico de ISO/IEC 29110                           |
| **Rigor**            | Investigar antes de suponer, pruebas estrictas y verificación de interfaz                                     |

## Qué hace cumplir cada cosa, y qué no

Esta es la tabla que importa. Un estándar que solo vive en un documento es una intención.

| Mecanismo                                          | ¿Bloquea?                                                     |
| -------------------------------------------------- | ------------------------------------------------------------- |
| La secuencia de gates                              | Sí: se detiene en la primera fase roja y sale distinto de cero |
| El pipeline sobre un Pull Request                  | Sí, vía la política de compilación de la rama destino          |
| Fronteras de arquitectura en el linter             | Sí: una capa que importe lo que no debe no compila             |
| **Guardias de deriva**                             | Sí: corren como cualquier otra prueba                          |
| Merge commit obligatorio y work item ligado        | Sí: política del repositorio                                   |
| Empujar directo a una rama permanente              | **Imposible**: la política rechaza el push                     |
| Pruebas que se comprueban a sí mismas              | Se revisa; lo verifica quien las escribe                       |
| La revisión del Pull Request                       | **No**: es la propia mientras el equipo sea una persona        |
| El despliegue                                      | **No tiene aprobación**: un merge a producción publica          |

## Los guardias de deriva

Buena parte de lo que puede romperse en un monorepo no es una función mal escrita: es **una cosa
declarada en dos sitios que dejaron de coincidir**. Una ruta que el cliente llama y el servidor ya no
sirve. Un módulo que dice consumirse donde no se consume. Un paso de recorrido guiado que apunta a un
marcador renombrado. Ninguna rompe una prueba: rompen una pantalla, meses después.

Hay **diez guardias** que comparan las dos declaraciones y fallan si divergen. Corren como pruebas
normales, así que el gate de siempre los ejecuta. Los seis rasgos que comparten:

1. **Leen texto fuente; no importan nada.** Un `import` obligaría al arnés a construir lo que vigila.
2. **Comparan en las dos direcciones.** Lo declarado y sin usar interesa tanto como lo usado sin declarar.
3. **Se niegan a pasar en vacío.** Cero controladores o cero descriptores es un error, no un barrido
   limpio. Sin eso, mover una carpeta convierte al guardia en un adorno verde.
4. **Cuentan las dos formas de decir lo mismo.** Un marcador puede ser un atributo literal o una prop.
5. **Ignoran lo que solo existe en una prueba**, y qué cuenta como prueba lo decide un solo predicado
   compartido.
6. **Leen cada archivo una vez.** Uno que relea dentro de un bucle anidado pasó de 56 ms a 7,7 s bajo
   contención, y un gate lento da un rojo que nadie sabe leer.

**Y un guardia se comprueba haciéndolo fallar sobre el árbol real**: se renombra lo que vigila, se ve el
rojo, se restaura. Un guardia que nadie ha visto en rojo no está vigilando nada.

## Pruebas: lo que las hace contar

Una prueba deja de contar por dos caminos, y los dos son silenciosos: no falla nunca, o dejó de describir
la forma real. De ahí seis reglas:

- **Se comprueba en rojo antes de cerrar.** Se deshace el arreglo y se mira la prueba fallar. Es el único
  modo de saber que la prueba prueba.
- **Una fixture está completa, o no es de ese tipo.** Nada de forzar un literal a un tipo del dominio: eso
  convierte al compilador en quien lo hace cumplir, gratis y para siempre.
- **Un dato deliberadamente malformado se etiqueta**, o en seis meses alguien lo «arregla» y borra el caso.
- **La comparación de objetos completos ignora las claves en `undefined`.** Un campo nuevo que el servidor
  debía enviar y no envía no rompe ninguna prueba escrita antes de que el campo existiera.
- **Nada enfocado, nada saltado a mano.** Enfocar una prueba apaga en silencio a todas las demás de su
  archivo, y el gate sale verde con una fracción de la suite.
- **La cobertura se sube o se queda**; no se baja para que pase una entrega.

## Y una advertencia sobre la interfaz

Una prueba verde y una pantalla rota se ven idénticas desde la terminal. Por eso hay dos arneses que
recorren las pantallas en dieciséis combinaciones de anchura, idioma y tema, midiendo lo que una máquina
puede medir: desplazamiento horizontal, elementos fuera de la ventana, tamaño mínimo de los controles y
contraste sobre el relleno real de cada tarjeta.

Lo que ninguno cubre —si un mensaje de error dice cómo seguir, si el verbo de un botón es el correcto— se
lee. El estándar lo pide y ninguna máquina lo mide.
