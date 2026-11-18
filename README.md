# MatrizLab — Calculadora de sistemas de ecuaciones lineales

Aplicación web **gratuita y sin dependencias** para resolver sistemas de hasta **40 ecuaciones y 40 incógnitas** con eliminación de **Gauss-Jordan y pivoteo parcial**. Se ejecuta localmente en el navegador. Puedes publicarla en GitHub Pages.

## Funcionalidades

- Editar matrices aumentadas `[A | b]` con dimensiones independientes de ecuaciones e incógnitas (1 a 40).
- Pegar matrices desde Excel (separadas por tabuladores), CSV, texto y filas copiadas directamente en la tabla.
- Introducir valores decimales, coma decimal, fracciones (p. ej. `3/4`) y notación científica (`1e-3`).
- Distinguir **solución única**, **infinitas soluciones** y **sistema incompatible** mediante rangos.
- Mostrar soluciones paramétricas, determinante en matrices cuadradas y matriz escalonada reducida.
- Visualizar operaciones elementales y, para sistemas pequeños, matrices intermedias.
- Comprobar el error residual numérico de las soluciones únicas.
- Copiar las soluciones o exportarlas a CSV; conservar la última matriz en el navegador.
- Ejemplos 3×3, 9×9, indeterminado e incompatible. El 9×9 es un ejemplo genérico, **no representa un mecanismo físico específico**.

## Publicar en GitHub Pages

1. En [GitHub](https://github.com/new), crea un repositorio **público** llamado, por ejemplo, `matrizlab`. Para GitHub Free, Pages está disponible en repositorios públicos.
2. Dentro del repositorio, elige **Add file → Upload files**. Sube `index.html`, `styles.css` y `solver.js` y `app.js` **directamente en la raíz**. Puedes añadir también el README y las pruebas. Confirma los cambios (**Commit changes**).
3. Abre **Settings → Pages**. En **Build and deployment → Source** elige **Deploy from a branch**.
4. En **Branch** selecciona `main`, carpeta `/(root)` y pulsa **Save**.
5. Cuando finalice la publicación, la URL habitual será `https://TU_USUARIO.github.io/matrizlab/` (sustituye TU_USUARIO por el usuario real y respeta el nombre del repositorio).

Documentación oficial: [Configurar un origen de publicación](https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Abrir sin GitHub

Abre el archivo `index.html` en Chrome, Edge o Firefox. No requiere Node.js ni internet.

## Ejemplo pegado desde Excel

Selecciona las columnas de coeficientes y término independiente en Excel y cópialas. En MatrizLab despliega **Importar desde Excel o CSV**, pega el contenido y pulsa **Importar matriz**.

```text
2    1   -1    8
-3  -1    2  -11
-2   1    2   -3
```

La solución es `x1 = 2`, `x2 = 3`, `x3 = -1`.

## Precisión y límites

El cálculo emplea `Number` (IEEE 754 de doble precisión). La detección de rangos usa una tolerancia relativa; en matrices mal condicionadas, casi singulares, o con escalas muy diferentes, la clasificación puede verse afectada por errores de redondeo. **No es un solucionador simbólico exacto** ni una herramienta de cálculo certificada para aplicaciones críticas. Compara con software numérico especializado en dichos casos.

## Pruebas

Opcionalmente, si tienes Node.js instalado, ejecuta:

```bash
node tests/solver.test.js
```

## Licencia

MIT. Se permite su uso educativo y modificación.
