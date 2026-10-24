# Flujos de GitHub Actions

`ci.yml` (pruebas en cada push) y `release.yml` (publicación al subir una etiqueta `vX.Y.Z`) van en
`.github/workflows/`. Están acá porque las herramientas remotas no pueden escribir en esa carpeta: para activarlos,
copialos una vez:

```powershell
mkdir .github\workflows
copy tools\ci\*.yml .github\workflows\
```

Después, con el repositorio en GitHub, cada push corre las pruebas y cada etiqueta publica una versión.
