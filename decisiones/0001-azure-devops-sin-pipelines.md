# 0001 · Azure DevOps para repositorio y tablero, sin pipelines

**Estado:** **Reemplazada** por [0003](0003-pipeline-estricto-y-despliegue-automatico.md)

> Este registro describe la decisión tal como se tomó, y se conserva por eso. **Dos de sus premisas ya
> no son ciertas**: se adoptaron pipelines, y `main` dejó de ser la única rama permanente. No se edita
> —un registro editado borra lo que se consideró en su momento—; se lee junto al 0003, que dice qué
> cambió y por qué.

## Contexto

El trabajo se organizaba sin tablero y sin revisión: el historial vivía en un remoto que nadie
revisaba, el backlog era un documento de `docs/`, y un cambio se consideraba entregable cuando los
gates pasaban en la máquina de quien lo escribió.

Eso deja tres huecos que se notan al crecer: no hay dónde discutir un cambio antes de que entre, no
hay forma de reconciliar el trabajo planeado con el entregado, y no hay evidencia de que una entrega se
verificó —que es justo lo que pide el perfil Básico de ISO/IEC 29110
([regla 37](../../.claude/rules/37-iso-29110.md))—.

El producto ya corre en Firebase, con la base en Cloud SQL y los secretos en Secret Manager. Esa parte
funciona y no está en discusión.

## Opciones

| Opción                                     | Costo real                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seguir sin PRs ni tablero                  | Gratis hoy, pero deja los tres huecos abiertos y hace inviable afirmar el perfil Básico. El backlog en un `.md` no liga trabajo con entrega.                |
| GitHub con Actions                         | Da PRs, tablero flojo y CI. Obligaría a mover el remoto y a mantener el proceso en un tercer lugar distinto del que ya usan los proyectos hermanos.         |
| Azure DevOps completo, incluidos pipelines | Da todo, y ata la validación a minutos de agente y a un YAML que hay que mantener. En un equipo de una persona el pipeline repite lo que ya corre en local. |
| **Azure Repos + Boards, sin pipelines**    | Da revisión, tablero y trazabilidad. **No** da una corrida que bloquee: el merge en rojo solo lo impide la persona.                                         |
| Mover también el hosting a Azure           | Unificaría proveedor, y obligaría a reescribir despliegue, base y secretos que hoy funcionan. Nada lo pide.                                                 |

## Decisión

**Azure Repos para el repositorio, Azure Boards para el tablero, Pull Request obligatorio hacia `main`,
y ningún pipeline.** El hosting se queda en Firebase.

Los gates siguen corriendo **en la máquina de quien trabaja**
([regla 21](../../.claude/rules/21-validation-gates.md)), y su salida se **transcribe en la descripción
del PR**, que es la única evidencia que queda de que se corrieron.

Una sola rama permanente: `main`. No se adoptan `dev` ni `qa`, porque una rama larga se justifica como
mecanismo de promoción entre ambientes y aquí solo existen local y producción
([regla 36](../../.claude/rules/36-gitflow-y-releases.md)).

## Consecuencias

- **El PR no bloquea nada.** Sin política de compilación no hay quien impida mezclar con un gate en
  rojo. La regla lo dice con todas sus letras en dos sitios
  ([31](../../.claude/rules/31-alcance-operativo.md),
  [42](../../.claude/rules/42-desarrollo-dirigido-por-especificacion.md)) para que nadie lo suponga
  resuelto.
- **La evidencia de pruebas vale menos que una corrida verificable.** Es texto que alguien escribió, no
  un artefacto que una máquina produjo. Se acepta a cambio de no mantener un pipeline que duplicaría lo
  que ya corre en local.
- **Tampoco hay gancho local que impida commitear a `main`.** Los únicos son `lint-staged` y
  `commitlint`. Que todo entre por PR es disciplina.
- **Repositorio y hosting quedan en proveedores distintos.** Es deliberado y no acopla nada: el código
  habla con la base y el almacenamiento por sus interfaces y por `env`.
- **La revisión sigue siendo la propia** mientras el equipo sea una persona. Lo que el PR compra no es
  una segunda opinión: es que el cambio quede explicado y ligado a su work item.
- El día que aparezca un pipeline, una política de rama o una segunda persona, **se reescriben las
  reglas 31, 36 y 42** y este registro se reemplaza por uno nuevo.
