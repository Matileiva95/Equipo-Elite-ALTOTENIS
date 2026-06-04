# Módulo Punto a Punto — Instrucciones de Integración

## ⚠️ REGLA CRÍTICA — NO ROMPER NADA EXISTENTE

**Este módulo es ADITIVO. No debe modificar, reemplazar ni interferir con:**
- La función `saveMatchStats()` existente
- La estructura de `player.matches[]` ni `player.match_stats`
- El formulario actual de estadísticas (aces, dobles faltas, break points, etc.)
- El historial de estadísticas ya guardadas
- La importación por foto/texto con IA existente
- Ningún otro módulo de la aplicación

**El módulo se agrega JUNTO a lo existente como una funcionalidad nueva e independiente.**
- Nuevo botón "Análisis punto a punto" DEBAJO del botón "Guardar estadísticas"
- Panel modal propio que se abre/cierra sin tocar nada del DOM existente
- Sus propios datos se guardan en un campo NUEVO `player.match_analysis[]`, NO en `player.matches[]`
- Chart.js se carga solo si no está ya cargado

## Archivos generados

1. `punto-a-punto.js` — Motor del módulo (parser + chart):
   - `PuntoAPunto.detectFormat(text)` → 'itf' | 'tennismath' | null
   - `PuntoAPunto.parseITF(text)` → datos estructurados
   - `PuntoAPunto.parseTennisMath(text)` → datos estructurados
   - `PuntoAPunto.buildMomentumData(parsed)` → array de sets con puntos
   - `PuntoAPunto.renderMomentumChart(canvasId, points, p1, p2)` → Chart.js instance
   - Todas las funciones viven dentro del objeto `PuntoAPunto` — sin variables globales sueltas

2. `punto-a-punto-panel.html` — Panel UI completo:
   - Modal con input de texto + selector de formato
   - Gráfico momentum por set (Chart.js)
   - Pestaña de estadísticas básicas
   - Variables y funciones prefijadas con `pap` para evitar colisiones

## Pasos para integrar en index.html (Altotenis)

### Paso 1: Agregar Chart.js (SOLO si no existe ya)
```html
<!-- Verificar primero si Chart.js ya está cargado -->
<script>
  if (typeof Chart === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    document.head.appendChild(s);
  }
</script>
```

### Paso 2: Agregar punto-a-punto.js
Copiar el contenido de `punto-a-punto.js` en un `<script>` al final del HTML,
DESPUÉS de todos los scripts existentes. No mover ni reorganizar scripts existentes.

### Paso 3: Agregar el panel HTML
Copiar el contenido de `punto-a-punto-panel.html` ANTES del cierre de `</body>`.
Es un div con `display:none` — no afecta el layout existente.

### Paso 4: Agregar botón en la sección de estadísticas
Buscar el botón existente de "Guardar estadísticas" en el perfil del jugador.
Agregar DEBAJO (no reemplazar, no mover):
```html
<button onclick="openPuntoAPunto()" style="
  background: #534AB7; color: white; border: none; border-radius: 8px;
  padding: 10px 16px; font-size: 13px; cursor: pointer; margin-top: 8px;
  display: flex; align-items: center; gap: 6px; width: 100%;">
  📊 Análisis punto a punto
</button>
```

### Paso 5: Conectar guardado (campo NUEVO)
Los datos de punto a punto se guardan en `player.match_analysis[]` (campo que YA EXISTE
en la tabla players de Supabase — endpoint GET/POST/DELETE /players/:id/match-analysis).

NO tocar `player.matches[]` ni `player.match_stats`.

Estructura de datos a guardar:
```js
{
  type: 'punto_a_punto',
  format: 'itf' | 'tennismath',
  date: '2026-05-12',
  player: 'A. Vergara',
  rival: 'K. Collins',
  rawText: '...texto original...',
  parsedData: { ...datos parseados... },
  sets: [{ setNum, points, totalP1, totalP2 }],
}
```

## Paleta de colores del módulo

| Elemento | Color | Hex |
|----------|-------|-----|
| Jugador (punto/game/área) | Morado | #534AB7 |
| Rival (punto/game/área) | Teal | #0F6E56 |
| Break | Ámbar | #EF9F27 |
| Set/partido ganado | Lima | #97C459 |

## Checklist de seguridad antes de hacer commit

- [ ] `saveMatchStats()` sigue funcionando igual que antes
- [ ] El historial de estadísticas existente se muestra correctamente
- [ ] La importación por foto/texto con IA sigue funcionando
- [ ] No hay errores en consola al cargar la página
- [ ] El botón "Guardar estadísticas" existente no se movió ni cambió
- [ ] Los partidos ya guardados siguen visibles en el historial
- [ ] El nuevo modal se abre y cierra sin afectar el scroll de la página

## Para la sesión con Claude Code

Comando sugerido:
```
claude "Lee INTEGRACION.md y sigue las instrucciones exactas. 
Integra punto-a-punto.js y punto-a-punto-panel.html en index.html.
CRÍTICO: No modificar NADA del módulo de estadísticas existente — 
ni saveMatchStats, ni el formulario, ni el historial, ni la importación IA.
Este módulo es ADITIVO. Solo agregar el botón nuevo debajo del existente
y el panel modal al final del body."
```
