# Desarrollo dirigido por especificación, asistido por IA

MileCommand se construye con un asistente, y la diferencia con «usar un asistente» es **la dirección del
control**.

Pedir código y revisarlo después deja la decisión en la generación: quien revisa descubre el enfoque
cuando ya está construido. Aquí el orden es el inverso. Primero se escribe qué se quiere y cómo se va a
lograr; y el procedimiento que el asistente ejecuta **está versionado junto al código**, así que se puede
leer, discutir y corregir.

## Las tres capas

| Capa               | Qué fija                     | Dónde vive                                    |
| ------------------ | ---------------------------- | --------------------------------------------- |
| **Requisito**      | _Qué_ hay que construir      | Work item, con siete bloques obligatorios     |
| **Especificación** | _Cómo_ se va a construir     | Un documento, **solo cuando hace falta**      |
| **Procedimiento**  | _Con qué pasos_ se construye | Skills versionadas en el repositorio          |

**La especificación nunca repite el requisito.** El work item dice qué; la especificación dice cómo.
Duplicar el qué produce dos documentos que se contradicen en la primera corrección.

## El filtro: cuándo se escribe especificación y cuándo no

Escribir un documento de diseño para cada cambio es burocracia; no escribir ninguno es reconstruir dos
veces. La salida son **tres preguntas**, contestadas antes de escribir nada:

- **A** — ¿se puede describir el cambio en una frase?
- **B** — ¿se conoce el código afectado y el enfoque **no** está en duda?
- **C** — ¿es reversible sin migración de datos?

| Situación          | Ruta                   | Qué se escribe                                              |
| ------------------ | ---------------------- | ----------------------------------------------------------- |
| A=No · B=Sí · C=Sí | **Corta**              | El qué y el cómo juntos, con nombres de archivo y función   |
| B=No               | **Investigar primero** | Nada todavía: se diagnostica con evidencia medida y se para |
| C=No               | **Completa**           | El diseño entero, con alternativas, migración y reversión   |
| A=Sí · B=Sí · C=Sí | **Directa**            | Nada. Se dice por qué y se va al código                     |

**La ruta se declara en la primera línea del documento**, con su razón en media línea, para que quien
revise pueda discutir la decisión en vez de descubrirla al final. Y si la ruta es directa, **el documento
no se crea**: un archivo vacío por cumplir es peor que nada.

Cuatro clases de cambio van **siempre** por la ruta completa, por pequeñas que parezcan: los datos
personales de un conductor, el aislamiento entre compañías, el motor que decide si alguien puede manejar
legalmente, y la bitácora de auditoría. Las cuatro comparten que **el error no se nota al construir: se
nota en operación y ya no se puede deshacer.**

## Los procedimientos

Cada uno declara qué hace, cuándo se salta y **qué herramientas puede usar**: un procedimiento de diseño
no escribe código, y uno de auditoría no edita.

| Procedimiento          | Qué hace                                                |
| ---------------------- | ------------------------------------------------------- |
| Retomar el trabajo     | Lee el repositorio y el tablero, y dice qué sigue       |
| Especificar            | Decide la ruta y, si toca, escribe el cómo              |
| Investigar             | Rastrea un defecto hasta su causa, con evidencia medida |
| Construir              | Implementa la unidad y corre la batería completa        |
| Revisar el diff        | Pasada de calidad antes de subir                        |
| Cerrar el cambio       | Rama, gates y commit con su porqué                      |
| Revisar los PR activos | Checklist y gates sobre lo que está abierto             |
| Cerrar una entrega     | Verifica criterios uno por uno y levanta el acta        |
| Auditar seguridad      | Verifica las invariantes contra el diff                 |
| Guardar la sesión      | Escribe el punto de retomada                            |

Que el procedimiento esté escrito y versionado tiene una consecuencia que importa más que la
automatización: **una corrección al proceso se hace una vez y aplica a todo el trabajo siguiente.**
Cuando una trampa cuesta una sesión, se anota en el procedimiento y no vuelve a costarla.

## Por qué esto no es «confiar en el modelo»

La velocidad de generación no sirve de nada si el resultado hay que verificarlo a mano. Lo que hace
utilizable el ciclo es que **buena parte de la verificación sea automática y bloqueante** — y que lo que
no lo es esté dicho, no supuesto.

Sí bloquean: la secuencia de gates, el pipeline sobre cada Pull Request, las fronteras de arquitectura en
el linter, los diez guardias de deriva, la política que exige merge commit y work item ligado, y la que
hace **imposible** empujar directo a una rama permanente.

No bloquean, y está escrito: la revisión del Pull Request es la propia mientras el equipo sea una
persona, y el despliegue no tiene aprobación.

## Dos disciplinas que sostienen lo demás

**Investigar antes de suponer.** Nada se afirma de memoria: el valor de una constante, la firma de una
función, el nombre de una columna se leen antes de construir encima. Una suposición correcta y una
comprobación se ven idénticas en el resultado; la diferencia aparece cuando la suposición es falsa, y para
entonces ya hay código encima. Y un hallazgo se reporta con **cómo se comprobó**: el archivo y la línea,
o el comando y su salida. «Revisé X» no es evidencia.

**Una prueba que no puede fallar no es una prueba.** Antes de cerrar se deshace el arreglo y se mira la
prueba en rojo. Vale igual para los guardias: uno que no se puede hacer fallar no está haciendo cumplir
nada.

Las dos suenan obvias. La sesión en que este pipeline se puso en verde encontró **cuatro defectos** que
existían justo por saltárselas: tres verdes que se apoyaban en artefactos que solo existían en la máquina
de trabajo, y una prueba «intermitente» que en realidad dependía del orden. Ninguno lo habría encontrado
una corrida más; todos aparecieron al obligar a que local y CI fueran el mismo código.

## Qué absorbe el asistente y qué no

El ciclo de vida formal exige artefactos, y producirlos a mano es la burocracia que hace que los equipos
pequeños abandonen el proceso. Casi todos **salen del trabajo mismo**: el requisito es el work item, el
diseño es la especificación, el informe de pruebas es la salida de los gates, la configuración es el
repositorio con sus etiquetas, y la aceptación es el Pull Request mezclado.

**El asistente absorbe el costo de redacción, no el criterio.** Redacta el borrador desde lo que ya
ocurrió en el repositorio y en el tablero; decidir qué es correcto sigue siendo humano, y por eso cada
artefacto pasa por una revisión que puede rechazarlo.
