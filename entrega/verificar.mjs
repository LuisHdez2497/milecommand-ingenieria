import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = process.cwd();
const argumentos = process.argv.slice(2);
const bandera = (nombre) => argumentos.includes(nombre);
const valor = (nombre, porOmision) => {
  const at = argumentos.indexOf(nombre);
  return at === -1 || at === argumentos.length - 1 ? porOmision : argumentos[at + 1];
};

const TODO = bandera('--todo');
const BASE = valor('--base', 'origin/dev');
const SIN_INTEGRACION = bandera('--sin-integracion');
const SIN_FLUTTER = bandera('--sin-flutter');

function toolchain() {
  const ruta = resolve(RAIZ, '.toolchain');
  if (!existsSync(ruta)) {
    throw new Error(`Sin ${ruta} no se puede fijar la version de las herramientas`);
  }
  const pares = {};
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (limpia === '' || limpia.startsWith('#')) {
      continue;
    }
    const [clave, ...resto] = limpia.split('=');
    pares[clave] = resto.join('=');
  }
  return pares;
}

function appsFlutter() {
  const ruta = resolve(RAIZ, 'apps/pubspec.yaml');
  if (!existsSync(ruta)) {
    return [];
  }
  const bloque = /workspace:\s*\n((?:\s*-\s*\S+\s*\n)+)/.exec(readFileSync(ruta, 'utf8'));
  if (bloque === null) {
    return [];
  }
  return [...bloque[1].matchAll(/-\s*(\S+)/g)].map((encontrado) => encontrado[1]);
}

function descubrir() {
  const manifiesto = resolve(RAIZ, 'packages/api/package.json');
  if (!existsSync(manifiesto)) {
    throw new Error(`Sin ${manifiesto} no se puede descubrir la forma del repositorio`);
  }
  const api = JSON.parse(readFileSync(manifiesto, 'utf8'));
  const alcanceNpm = api.name.split('/')[0];
  const librerias = Object.keys(api.dependencies ?? {})
    .filter((nombre) => nombre.startsWith(`${alcanceNpm}/`))
    .map((nombre) => nombre.slice(alcanceNpm.length + 1))
    .sort();
  return {
    api: api.name,
    librerias,
    appFlutter: appsFlutter().find((miembro) => !miembro.includes('/')),
    infra: existsSync(resolve(RAIZ, 'infra')),
    navegador: existsSync(resolve(RAIZ, 'packages/sweep-e2e')),
  };
}

const VERSIONES = toolchain();
const FORMA = descubrir();
const EN_AZURE = process.env.TF_BUILD === 'True';

function abrirSeccion(nombre) {
  process.stdout.write(EN_AZURE ? `##[group]${nombre}\n` : `\n--- ${nombre}\n`);
}

function cerrarSeccion() {
  if (EN_AZURE) {
    process.stdout.write('##[endgroup]\n');
  }
}

function reportarError(mensaje) {
  if (EN_AZURE) {
    process.stdout.write(`##vso[task.logissue type=error]${mensaje}\n`);
  }
}

function correr(comando, entorno = {}) {
  const inicio = Date.now();
  const salida = spawnSync(comando, {
    shell: true,
    stdio: 'inherit',
    cwd: RAIZ,
    env: { ...process.env, ...entorno },
  });
  return { codigo: salida.status ?? 1, segundos: Math.round((Date.now() - inicio) / 1000) };
}

function lineasDe(comando) {
  const salida = spawnSync(comando, { shell: true, encoding: 'utf8', cwd: RAIZ });
  if (salida.status !== 0) {
    return null;
  }
  return salida.stdout.split('\n').filter((linea) => linea.trim() !== '');
}

function cambios() {
  const contraLaBase = lineasDe(`git diff --name-only ${BASE}`);
  if (contraLaBase === null) {
    return null;
  }
  const sinRastrear = lineasDe('git ls-files --others --exclude-standard') ?? [];
  return [...new Set([...contraLaBase, ...sinRastrear])];
}

const REESCRIBE_LA_VERIFICACION =
  /^(\.pipelines\/|azure-pipelines|\.toolchain|tools\/verificar\.mjs)/;
const FLUTTER = /^apps\//;
const INFRA = /^infra\//;
const TYPESCRIPT =
  /^(packages\/|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|nx\.json|tsconfig)/;

function alcance() {
  if (TODO) {
    return { flutter: true, typescript: true, infra: true, motivo: 'bandera --todo' };
  }
  const lista = cambios();
  if (lista === null) {
    return {
      flutter: true,
      typescript: true,
      infra: true,
      motivo: `no se pudo comparar contra ${BASE}`,
    };
  }
  if (lista.some((archivo) => REESCRIBE_LA_VERIFICACION.test(archivo))) {
    return {
      flutter: true,
      typescript: true,
      infra: true,
      motivo: 'cambia como se verifica lo demas',
    };
  }
  return {
    flutter: lista.some((archivo) => FLUTTER.test(archivo)),
    typescript: lista.some((archivo) => TYPESCRIPT.test(archivo)),
    infra: lista.some((archivo) => INFRA.test(archivo)),
    motivo: `${lista.length} archivos contra ${BASE}`,
  };
}

const ambito = alcance();

if (bandera('--alcance')) {
  process.stdout.write(`hayTypescript=${ambito.typescript}\n`);
  process.stdout.write(`hayFlutter=${ambito.flutter && FORMA.appFlutter !== undefined}\n`);
  process.stdout.write(`hayInfra=${ambito.infra && FORMA.infra}\n`);
  process.stdout.write(`motivo=${ambito.motivo}\n`);
  process.exit(0);
}

const rutaDocker = RAIZ.split('\\').join('/');
const CODIGO = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|ya?ml|dart|tf|sh|env\.example)$/;

function objetivoSemgrep() {
  if (TODO) {
    return '.';
  }
  const lista = cambios() ?? [];
  const archivos = lista
    .filter((archivo) => CODIGO.test(archivo))
    .filter((archivo) => existsSync(resolve(RAIZ, archivo)));
  return archivos.length === 0 ? '' : archivos.map((archivo) => `"${archivo}"`).join(' ');
}

const objetivo = objetivoSemgrep();
const semgrep =
  `docker run --rm -v "${rutaDocker}:/src" semgrep/semgrep:${VERSIONES.SEMGREP_VERSION} ` +
  'semgrep scan --config p/typescript --config p/javascript --config p/secrets ' +
  `--error --metrics=off --exclude=dist --exclude=coverage ${objetivo}`;

const nx = TODO
  ? 'npx nx run-many -t lint typecheck test build --skip-nx-cache'
  : `npx nx affected -t lint typecheck test build --base=${BASE} --skip-nx-cache`;

const conFlutter = ambito.flutter && !SIN_FLUTTER && FORMA.appFlutter !== undefined;
const conInfra = ambito.infra && FORMA.infra;
const conIntegracion = ambito.typescript && !SIN_INTEGRACION;

const FASES = [
  { nombre: 'Formato', comando: 'npx prettier --check .', corre: true },
  {
    nombre: 'Navegador de pruebas',
    comando: 'npx playwright install chromium',
    corre: ambito.typescript && FORMA.navegador,
  },
  { nombre: 'Gates de TypeScript', comando: nx, corre: ambito.typescript },
  {
    nombre: 'Formato de Dart',
    comando: 'cd apps && dart pub get && dart format --set-exit-if-changed .',
    corre: conFlutter,
  },
  {
    nombre: 'Generados de Dart',
    comando: `cd apps/${FORMA.appFlutter} && dart run build_runner build --delete-conflicting-outputs`,
    corre: conFlutter,
  },
  {
    nombre: 'Analisis de Flutter',
    comando: 'cd apps && flutter analyze --fatal-infos --fatal-warnings',
    corre: conFlutter,
  },
  {
    nombre: 'Pruebas de Flutter',
    comando: `cd apps/${FORMA.appFlutter} && flutter test`,
    corre: conFlutter,
  },
  { nombre: 'Analisis estatico (Semgrep)', comando: semgrep, corre: objetivo !== '' },
  {
    nombre: 'Dependencias vulnerables',
    comando: 'pnpm audit --prod --audit-level=high',
    corre: true,
  },
  {
    nombre: 'Formato de Terraform',
    comando: 'terraform fmt -recursive -check infra',
    corre: conInfra,
  },
  {
    nombre: 'Analisis de la infraestructura',
    comando:
      `docker run --rm -v "${rutaDocker}:/src" bridgecrew/checkov:${VERSIONES.CHECKOV_VERSION} ` +
      '--directory /src/infra --framework terraform --compact --quiet',
    corre: conInfra,
  },
  {
    nombre: 'Librerias del workspace',
    comando: `npx nx run-many -t build --projects=${FORMA.librerias.join(',')} --skip-nx-cache`,
    corre: conIntegracion && FORMA.librerias.length > 0,
    omitidaPorBandera: SIN_INTEGRACION,
  },
  {
    nombre: 'Migraciones',
    comando: `pnpm --filter ${FORMA.api} migration:run`,
    corre: conIntegracion,
    omitidaPorBandera: SIN_INTEGRACION,
  },
  {
    nombre: 'Aislamiento contra Postgres',
    comando: 'npx nx run api:test --skip-nx-cache',
    entorno: { RUN_RLS_IT: 'true' },
    corre: conIntegracion,
    omitidaPorBandera: SIN_INTEGRACION,
  },
];

process.stdout.write(`\nVerificacion de ${FORMA.api.split('/')[0].replace('@', '')}\n`);
process.stdout.write(
  `  alcance:   typescript=${ambito.typescript} flutter=${ambito.flutter} infra=${ambito.infra}\n`,
);
process.stdout.write(`  motivo:    ${ambito.motivo}\n`);
process.stdout.write(
  `  forma:     api=${FORMA.api} librerias=${FORMA.librerias.join('+') || 'ninguna'} ` +
    `flutter=${FORMA.appFlutter ?? 'ninguna'} infra=${FORMA.infra} navegador=${FORMA.navegador}\n`,
);
process.stdout.write(
  `  semgrep=${VERSIONES.SEMGREP_VERSION} checkov=${VERSIONES.CHECKOV_VERSION ?? 'no aplica'}\n\n`,
);

const resultados = [];
let rojo = false;

for (const fase of FASES) {
  if (!fase.corre) {
    resultados.push({
      nombre: fase.nombre,
      estado: fase.omitidaPorBandera === true ? 'OMITIDA POR BANDERA' : 'no aplica',
      segundos: 0,
    });
    continue;
  }
  abrirSeccion(fase.nombre);
  process.stdout.write(`    ${fase.comando}\n\n`);
  const { codigo, segundos } = correr(fase.comando, fase.entorno);
  cerrarSeccion();
  resultados.push({ nombre: fase.nombre, estado: codigo === 0 ? 'verde' : 'ROJO', segundos });
  if (codigo !== 0) {
    rojo = true;
    reportarError(`${fase.nombre}: el gate salio en rojo tras ${segundos}s`);
    break;
  }
}

process.stdout.write('\n\nResumen\n');
for (const { nombre, estado, segundos } of resultados) {
  const tiempo = segundos > 0 ? `${segundos}s` : '';
  process.stdout.write(`  ${estado.padEnd(20)} ${nombre.padEnd(32)} ${tiempo}\n`);
}

const omitidas = resultados.filter((r) => r.estado === 'OMITIDA POR BANDERA');
if (omitidas.length > 0) {
  process.stdout.write(
    `\n${omitidas.length} fase(s) omitidas por bandera. Una fase que no corrio no es una fase que paso.\n`,
  );
}

if (rojo) {
  process.stdout.write('\nHay un gate en rojo. No se commitea, no se abre PR y no se despliega.\n');
  process.exit(1);
}

process.stdout.write('\nTodos los gates aplicables en verde.\n');
