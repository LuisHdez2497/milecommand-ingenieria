# 0003 · Pipeline estricto, tres ramas y despliegue automático

**Estado:** Aceptada · **Reemplaza a** [0001](0001-azure-devops-sin-pipelines.md)

## Contexto

El 0001 decidió Azure Repos y Boards **sin pipelines**, con los gates corriendo en la máquina de quien
trabaja y su salida transcrita en la descripción del Pull Request. Eso dejó tres huecos que se vieron en
cuanto se miraron de cerca:

1. **Nada bloqueaba un merge en rojo.** La evidencia era texto que alguien escribía.
2. **Los proyectos hermanos ya tenían pipeline**, y uno bien pensado —con cálculo de alcance para no
   gastar minutos—, así que MileCommand era el desalineado.
3. **Ese pipeline, al leerlo, era más flojo que la regla que decía cumplir.** No corría Prettier, ni la
   integración contra Postgres, ni instalaba Chromium; barría Semgrep solo sobre `packages/` y con la
   versión sin fijar. **Nadie lo había notado porque salía verde.**

El tercero es el que cambia el diseño: el problema no era la falta de pipeline, era que **la lista de
gates vivía en dos sitios** —un `.md` y un YAML— y habían divergido sin que nada lo dijera.

Y el producto ya está desplegado en Firebase, publicado a mano.

## Opciones

| Opción                                                    | Costo real                                                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Seguir sin pipeline                                       | Gratis en minutos, y deja el merge en rojo a merced de la disciplina. El 0001 ya lo aceptaba; el producto desplegado lo vuelve más caro. |
| Pipeline que **repite** la lista de gates en el YAML      | Es lo que hacen los proyectos hermanos, y es exactamente cómo se llegó a dos verdades sobre el mismo commit.                             |
| **Pipeline que llama al mismo script que corre en local** | Un archivo más (`tools/verificar.mjs`), y la paridad deja de depender de que alguien sincronice dos listas.                              |
| GitHub Actions en el espejo público                       | Gratis e ilimitado en repos públicos, y volvería público el fuente de un producto con datos reales de un cliente. Se descartó por eso.   |
| Despliegue con aprobación manual                          | Más seguro, y un clic más. Se descartó: se pidió automático al completar el PR.                                                          |

## Decisión

**Azure Pipelines, con la secuencia de gates en un solo lugar, tres ramas permanentes y publicación
automática al mezclar a `main`.**

- **`tools/verificar.mjs` es la fuente única de los gates.** El pipeline no la repite: la llama. Local y
  CI no pueden divergir porque son el mismo código ([regla 21](../../.claude/rules/21-validation-gates.md)).
- **Ocho fases, y las que no aplican se apagan** leyendo el diff: formato, Chromium, gates de Nx,
  formato y análisis y pruebas de Flutter, Semgrep, dependencias, migraciones e integración contra
  Postgres. Se detiene en la primera roja.
- **`--skip-nx-cache` siempre.** Un resultado cacheado no prueba nada, y aquí lo que sigue al verde es un
  despliegue a producción.
- **Semgrep con versión fijada en `.toolchain` y acotado a los archivos que cambiaron.**
- **Tres ramas permanentes** (`dev`, `qa`, `main`), para alinear con los proyectos hermanos
  ([regla 36](../../.claude/rules/36-gitflow-y-releases.md)).
- **Merge a `main` publica**, sin aprobación, y solo lo que el grafo de Nx marque como afectado.

## Consecuencias

- **`dev` y `qa` son ramas, no ambientes.** Sigue habiendo solo local y producción. Quien lea «qa»
  esperando una URL no la va a encontrar, y por eso la regla 36 lo dice en su primera sección.
- **Un merge a `main` llega a un cliente sin que nadie apruebe.** Lo único que se interpone es la
  corrida de verificación sobre `main`, que por eso se repite aunque el PR ya se hubiera validado.
- **Las migraciones corren al arrancar el contenedor, ahora sin nadie mirando.** Lo que tarde sobre una
  tabla grande bloquea el arranque, así que se piensa antes de mezclar.
- **El filtro de ruta de los Pull Requests no vive en el repositorio.** En Azure Repos la validación de
  PR la gobierna la política de compilación de la rama, y su filtro de ruta se configura en el portal.
  Es la única pieza del diseño que no está versionada, y hay que decirlo porque se olvida.
- **Los 1 800 minutos mensuales son un techo real.** Con `--skip-nx-cache` siempre y tres ramas, una
  entrega gasta tres corridas. Si el mes se agota, el pipeline deja de correr y con él la única barrera
  automática.
- **La llave de despliegue es una cuenta de servicio en Secure files.** `FIREBASE_TOKEN` está deprecado,
  y la vía de _Workload Identity Federation_ tenía un fallo documentado de timeout en la CLI v15: una
  llave JSON lo evita.
- **Acotar Semgrep se midió, no se supuso:** 6 segundos sobre tres archivos contra más de quince minutos
  sin terminar sobre el árbol completo con bind mount en Windows. Un gate que tarda quince minutos es un
  gate que se salta.
- **Se descubrió una prueba de integración intermitente.** Falló una vez en 1 298 y pasó al repetir. Un
  gate intermitente sobre el aislamiento entre compañías enseña a re-correr en vez de investigar, así que
  **el pipeline no se configura con reintento automático**: se busca la causa.
