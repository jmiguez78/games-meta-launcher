import { execFile } from 'node:child_process';

// DPAPI con alcance de usuario: sólo la cuenta de Windows que cifró el dato puede descifrarlo.
// El texto viaja por stdin para que no quede en la línea de comandos del proceso.
function powershell(script, input) {
  if (process.platform !== 'win32')
    return Promise.reject(new Error('El almacenamiento seguro de credenciales sólo está disponible en Windows.'));
  return new Promise((resolve, reject) => {
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true },
      (error, stdout) =>
        error ? reject(new Error('No se pudo acceder al almacenamiento seguro de Windows.')) : resolve(stdout.trim())
    );
    child.stdin.end(input);
  });
}

const prelude =
  'Add-Type -AssemblyName System.Security; $in = [Console]::In.ReadToEnd(); $scope = [Security.Cryptography.DataProtectionScope]::CurrentUser;';

export function protect(text) {
  return powershell(
    `${prelude} [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($in), $null, $scope))`,
    text
  );
}

export function unprotect(blob) {
  return powershell(
    `${prelude} [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($in.Trim()), $null, $scope))`,
    blob
  );
}
