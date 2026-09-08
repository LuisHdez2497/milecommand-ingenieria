# MileCommand · Evidencia de ingeniería

Documentación de ingeniería y cadena de entrega de **MileCommand**, una plataforma multi-tenant de
cumplimiento DOT para empresas de transporte de carga en Estados Unidos: centraliza los expedientes de
los conductores, sus vencimientos, las revisiones anuales que exige la regulación y la evidencia que un
auditor pide cuando llega sin avisar.

Este repositorio existe por una sola razón: **hacer verificable** cómo se verifica y se entrega ese
producto. No es el producto.

> ### Qué NO está aquí
>
> **El código fuente de MileCommand es privado y no se publica.** Tampoco su modelo de datos, su
> aislamiento entre compañías, su motor de cumplimiento, su diseño de marca, su backlog ni el cuerpo
> normativo completo de sus estándares. Todo eso es propiedad de su autor y se muestra, cuando
> corresponde, en entrevista.
>
> Lo que sí está aquí es la cadena de entrega y las decisiones que la gobiernan: la parte del trabajo
> que se puede enseñar sin regalar el producto.
>
> Y hay **una omisión declarada**: la plantilla de verificación lleva el paso que pasa el entorno al
> arranque del grafo, pero **no la lista de variables**. No son secretos —los valores se generan en el
> agente y mueren con él— pero sus nombres describen la superficie de configuración del producto. El
> hueco está marcado dentro del propio archivo, porque un artefacto recortado sin avisar deja de ser
> evidencia.

**El producto está en producción**, con un cliente real. Eso condiciona todo lo que sigue: no hay
ambiente intermedio donde equivocarse, y cada merge a la rama de producción publica.

---

## Qué demuestra

| Señal                                              | Dónde se comprueba                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Una sola fuente para la verificación**           | [`entrega/verificar.mjs`](entrega/verificar.mjs) — el mismo script que corre en la máquina y en el pipeline |
| **Entrega automatizada con controles**             | [`entrega/`](entrega/) — verificación bloqueante por Pull Request y publicación automática al mezclar       |
| **Decisiones registradas, con su costo**           | [`decisiones/`](decisiones/) — incluida una reemplazada, con el porqué                                      |
| **Estándares que un linter hace cumplir**          | [`estandares/`](estandares/) — resumen de los 28 estándares y de qué los sostiene                           |
| **Desarrollo dirigido por especificación, con IA** | [`metodo/`](metodo/) — el ciclo completo y los guardrails que lo hacen fiable                               |

## Contenido

```
decisiones/   Registros de decisión sobre la cadena de entrega
entrega/      Pipeline de Azure DevOps, sus plantillas y el verificador
estandares/   Resumen de los estándares de ingeniería
metodo/       Desarrollo dirigido por especificación, asistido por IA
```

## La idea que sostiene todo lo demás

**El pipeline no repite la lista de gates: la llama.**

Y **es el mismo archivo en los tres repositorios**: se descubre a si mismo —lee el paquete del API y
sus librerias, la app de Flutter del espacio de trabajo de pub, y si existen infraestructura declarada y
un arnes de navegador—, asi que dos fases aparecen solo donde aplican y ninguna copia divergira de otra.

Es una decisión pequeña con una consecuencia grande. Mientras la lista de verificaciones vivió en dos
sitios —un documento y un YAML— divergieron sin que nada lo dijera: el pipeline no corría el formateador,
ni las pruebas de integración contra la base, ni instalaba el navegador de pruebas, y usaba una versión
distinta del analizador estático. **Nadie lo notó porque las dos salían verdes.**

Ahora hay un solo archivo, `verificar.mjs`, y el pipeline lo invoca. La paridad entre local y CI no
depende de que alguien sincronice dos listas: es el mismo código.

Ese cambio destapó tres defectos que llevaban meses escondidos, y los tres eran la misma familia: **un
verde que se apoyaba en un artefacto que solo existía en la máquina de trabajo.**

| Lo que fallaba en un agente limpio       | Por qué pasaba en local                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| El análisis de la app móvil              | Los archivos generados por el generador de código no se versionan |
| Las migraciones de base de datos         | Los paquetes del monorepo se leen desde su `dist`, que no existía |
| Una prueba «intermitente» de integración | Su fixture dependía del orden: insertaba nada, en silencio        |

La última no era intermitente. Su fixture ligaba un permiso con un `INSERT ... SELECT` sobre una tabla
que en una base recién migrada está vacía, así que insertaba cero filas sin quejarse, y la prueba
dependía de que otra hubiera corrido antes. Ahora siembra lo suyo y **falla ruidosamente** si no liga.

## Cómo se verifica una entrega

Doce fases, y las que no aplican se apagan leyendo el diff. Sobre un agente limpio: **6.9 minutos**.

| Fase                                                 | Cuándo corre                     |
| ---------------------------------------------------- | -------------------------------- |
| Formato de todo el repositorio                       | Siempre                          |
| Navegador de pruebas                                 | Si cambió TypeScript             |
| Lint · tipos · pruebas · compilación (solo afectado) | Si cambió TypeScript             |
| Formato · generados · análisis · pruebas de Dart     | Si cambió la app móvil           |
| Análisis estático de seguridad                       | Sobre los archivos que cambiaron |
| Dependencias vulnerables                             | Siempre                          |
| Librerías del monorepo                               | Si cambió TypeScript             |
| Migraciones e **integración contra Postgres real**   | Si cambió TypeScript             |

Tres detalles que no son estéticos:

- **La caché nunca decide.** Todo corre sin caché: un resultado leído de la caché dice que esa
  combinación de entradas pasó _alguna vez_, no que el árbol de ahora pase.
- **Las versiones de las herramientas se fijan.** Con `latest`, el catálogo de reglas del analizador
  cambia sin que nada lo diga, y un rojo nuevo no se distingue de una regresión.
- **El análisis estático se acota a lo que cambió.** Medido: 6 segundos sobre tres archivos contra más de
  quince minutos sin terminar sobre el árbol completo. Un gate que tarda quince minutos es un gate que se
  salta.

Y el resumen distingue tres estados, no dos: verde, no aplica y **omitida por bandera**. Lo tercero
existe porque «no se pudo correr» y «pasó» se ven igual en un reporte mal escrito.

## Las decisiones, en una línea cada una

| ADR                                                                  | Decisión                                              | Por qué importa                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [0001](decisiones/0001-azure-devops-sin-pipelines.md)                | Repositorio y tablero sin pipelines · **reemplazada** | Se conserva porque un registro no se edita cuando cambia la decisión: se reemplaza, y el viejo dice qué se creyó |
| [0003](decisiones/0003-pipeline-estricto-y-despliegue-automatico.md) | Pipeline estricto y despliegue automático             | La verificación en un solo lugar, y el costo de no tener aprobación manual escrito con todas sus letras          |

Falta el 0002 a propósito: es una decisión de diseño de producto y no se publica.

## Lo que este repositorio también admite

Que un despliegue automático **sin aprobación** llega a un cliente en minutos, y que lo único que se
interpone es una corrida de verificación. Que la revisión del Pull Request es la propia mientras el
equipo sea una persona. Y que los minutos de agente del nivel gratuito son un techo real: si el mes se
agota, la única barrera automática deja de correr.

Están escritas en el ADR 0003, en su sección de consecuencias, porque una decisión sin sus costos
escritos se lee como si no tuviera ninguno.

---

Licencia: ver [LICENSE](LICENSE). No es software de código abierto.
