import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pipelineDirectory = resolve(webDirectory, "..", "data-pipeline");
const virtualenvPython = join(
  pipelineDirectory,
  ".venv",
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "python.exe" : "python",
);
const python = process.env.PYTHON || virtualenvPython;

if (!existsSync(python)) {
  console.error(`Python não encontrado: ${python}`);
  console.error("Crie o ambiente em data-pipeline/.venv ou defina a variável PYTHON.");
  process.exit(1);
}

const resultado = spawnSync(python, ["analysis.py"], {
  cwd: pipelineDirectory,
  stdio: "inherit",
  windowsHide: true,
});

if (resultado.error) {
  console.error(`Não foi possível executar a análise: ${resultado.error.message}`);
  process.exit(1);
}

process.exitCode = resultado.status ?? 1;