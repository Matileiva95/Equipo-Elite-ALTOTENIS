# Módulo Estadísticas TennisMath — Instrucciones de Integración

## ⚠️ REGLA CRÍTICA — NO ROMPER NADA EXISTENTE

Este módulo es ADITIVO. No modifica saveMatchStats, el formulario existente,
el historial, ni ningún otro módulo. Solo agrega funcionalidad nueva al
módulo punto a punto que ya está integrado.

## Qué hace

Cuando el entrenador pega datos en formato TennisMath, además del gráfico
de momentum (que ya funciona), ahora se calculan y muestran automáticamente
todas las estadísticas del partido en 3 pestañas: Esencial, Detallado y Por golpe.

Para formato ITF no se muestran estadísticas detalladas (porque la ITF no
provee esa información) — solo el momentum.

## Archivo

`tennismath-stats.js` contiene:
- `TennisMathStats.calculate(parsed)` — calcula todas las estadísticas
- `TennisMathStats.renderStatsHTML(stats)` — genera el HTML de las pestañas
- `setPapStatsTab(tab)` — función global para cambiar entre pestañas
- CSS inline integrado, sin estilos externos

## Pasos para integrar

### Paso 1: Agregar tennismath-stats.js
Copiar el contenido de `tennismath-stats.js` en un `<script>` en index.html,
DESPUÉS del script de PuntoAPunto y ANTES del panel HTML.
No mover ni reorganizar scripts existentes.

### Paso 2: Modificar processPuntoAPunto()
Dentro de la función `processPuntoAPunto()` existente, DESPUÉS de generar
el momentum y ANTES de renderizar resultados, agregar:

```javascript
// Si es formato TennisMath, calcular estadísticas detalladas
let tmStats = null;
if (format === 'tennismath' && typeof TennisMathStats !== 'undefined') {
  tmStats = TennisMathStats.calculate(papParsedData);
}
```

### Paso 3: Modificar renderPapResults()
En la función `renderPapResults()`, DESPUÉS de generar los gráficos de
momentum y ANTES de cerrar la función, agregar el bloque de estadísticas:

```javascript
// Mostrar estadísticas TennisMath si existen
const statsDiv = document.getElementById('papStats');
if (tmStats) {
  statsDiv.innerHTML = TennisMathStats.renderStatsHTML(tmStats);
  statsDiv.style.display = 'none'; // Se muestra al cambiar pestaña
} else {
  // Para ITF: mostrar solo estadísticas básicas (puntos totales, breaks)
  statsDiv.innerHTML = buildStatsHTML(setsData, p1Name, p2Name, format);
}
```

### Paso 4: Agregar estilos de las pestañas
Agregar al CSS existente del módulo:
```css
.pap-stats-tab-active {
  color: #534AB7 !important;
  border-bottom-color: #534AB7 !important;
  font-weight: 500;
}
```

### Paso 5: Incluir stats en el guardado
En savePuntoAPunto(), agregar tmStats al objeto que se guarda:
```javascript
match.puntoAPunto.stats = tmStats; // null si es ITF
```

## Checklist de seguridad

- [ ] saveMatchStats() sigue funcionando igual
- [ ] El historial existente no se modifica
- [ ] El formulario de estadísticas normales sigue igual
- [ ] El momentum de formato ITF sigue funcionando
- [ ] Las pestañas Esencial/Detallado/Por golpe se muestran solo para TennisMath
- [ ] No hay errores en consola

## Comando para Claude Code

```
Lee INTEGRACION-STATS.md y tennismath-stats.js. Integra el módulo de
estadísticas TennisMath en index.html de Altotenis. El código va dentro
del módulo punto a punto existente — agregar tennismath-stats.js como
script inline DESPUÉS del script de PuntoAPunto. Modificar processPuntoAPunto()
y renderPapResults() según las instrucciones para que cuando se pega texto
TennisMath se calculen y muestren las estadísticas en pestañas Esencial,
Detallado y Por golpe debajo del momentum. Para formato ITF no mostrar
estas pestañas — solo el momentum y stats básicas que ya existen.
CRÍTICO: No tocar saveMatchStats, formulario existente, historial,
ni ningún otro módulo fuera del punto a punto.
```
