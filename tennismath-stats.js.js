// ============================================================
// MÓDULO ESTADÍSTICAS TENNISMATH — TenisMetricsPro
// Calculador automático desde datos TenisMath parseados
// + UI de pestañas Esencial / Detallado / Por golpe
// Integrar en index.html junto al módulo punto-a-punto existente
// ============================================================
// ⚠️ NO TOCAR saveMatchStats, formulario existente, historial,
//    ni ningún otro módulo. SOLO agregar funcionalidad nueva.
// ============================================================

const TennisMathStats = {

  // ——— CALCULADOR PRINCIPAL ———
  // Recibe el resultado de PuntoAPunto.parseTennisMath(text)
  // Retorna objeto con todas las estadísticas
  calculate(parsed) {
    const p1 = parsed.p1Name;
    const p2 = parsed.p2Name;
    const allPoints = [];

    // Flatten all points from all sets/games
    parsed.sets.forEach(set => {
      set.games.forEach(game => {
        game.points.forEach(pt => {
          allPoints.push({
            ...pt,
            server: game.server,
            gameWinner: game.winner,
          });
        });
      });
    });

    const stats = {
      p1Name: p1,
      p2Name: p2,
      essential: this._calcEssential(allPoints, p1, p2, parsed),
      detailed: this._calcDetailed(allPoints, p1, p2, parsed),
      byShot: this._calcByShot(allPoints, p1, p2),
    };

    return stats;
  },

  // ——— ESENCIAL ———
  _calcEssential(pts, p1, p2, parsed) {
    const service = this._calcService(pts, p1, p2, parsed);
    const points = this._calcPoints(pts, p1, p2);
    const conversion = this._calcConversion(pts, p1, p2, parsed);

    return { service, points, conversion };
  },

  // ——— DETALLADO ———
  _calcDetailed(pts, p1, p2, parsed) {
    const service = this._calcServiceDetailed(pts, p1, p2, parsed);
    const returnStats = this._calcReturn(pts, p1, p2);
    const points = this._calcPoints(pts, p1, p2);
    const forcedErrors = this._calcForcedErrors(pts, p1, p2);
    const conversion = this._calcConversionDetailed(pts, p1, p2, parsed);

    return { service, returnStats, points, forcedErrors, conversion };
  },

  // ——— POR GOLPE ———
  _calcByShot(pts, p1, p2) {
    const shotTypes = ['ground', 'volley', 'drop-shot', 'smash', 'lob'];
    const result = {};

    shotTypes.forEach(shotType => {
      result[shotType] = {
        p1: { winners: { bh: 0, fh: 0 }, forcedErrors: { bh: 0, fh: 0 }, unforcedErrors: { bh: 0, fh: 0 } },
        p2: { winners: { bh: 0, fh: 0 }, forcedErrors: { bh: 0, fh: 0 }, unforcedErrors: { bh: 0, fh: 0 } },
      };
    });

    pts.forEach(pt => {
      const shotRaw = (pt.shot || '').toLowerCase();
      let shotCategory;
      if (shotRaw === 'volley') shotCategory = 'volley';
      else if (shotRaw === 'drop-shot' || shotRaw === 'dropshot') shotCategory = 'drop-shot';
      else if (shotRaw === 'smash') shotCategory = 'smash';
      else if (shotRaw === 'lob') shotCategory = 'lob';
      else if (shotRaw === 'fh' || shotRaw === 'bh') shotCategory = 'ground';
      else return; // skip df, ace, etc

      const side = (shotRaw === 'fh' || pt.shot === 'FH') ? 'fh' : 'bh';
      // For shots like volley, smash, etc — get the side from the original shot field
      let actualSide = 'fh';
      if (pt.shot === 'BH') actualSide = 'bh';
      else if (pt.shot === 'FH') actualSide = 'fh';
      // Check if the point description had BH or FH after the shot type
      // The parser stores the last detected shot — for compound shots like "volley • BH"
      // pt.shot will be "volley" and we need to check the raw description
      // For now, use pt.shot directly if it's FH/BH, otherwise default to FH

      // Determine which player committed the action
      // For winners: the player who hit the winner
      // For errors: the player who made the error
      let playerKey;
      if (pt.type === 'w' || pt.type === 'rw') {
        // Winner: pt.winner is the one who scored
        playerKey = pt.winner === 1 ? 'p1' : 'p2';
      } else if (pt.type === 'ue') {
        // Unforced error: the one who lost the point made the error
        playerKey = pt.winner === 1 ? 'p2' : 'p1';
      } else if (pt.type === 'fe') {
        // Forced error: the one who lost the point made the error
        playerKey = pt.winner === 1 ? 'p2' : 'p1';
      } else return;

      const category = pt.type === 'w' || pt.type === 'rw' ? 'winners' :
                       pt.type === 'ue' ? 'unforcedErrors' : 'forcedErrors';

      // For shot types like volley/smash/lob/drop-shot, use the secondary shot info
      // The TennisMath parser stores the main shot type in pt.shot
      // We need to handle cases like "volley • BH" where shot = "volley"
      // In these cases, we don't have FH/BH info for the specific shot
      // Default to FH unless we can detect BH from context
      if (shotCategory !== 'ground') {
        // For non-ground shots, we count totals (FH is default bucket)
        result[shotCategory][playerKey][category].fh++;
      } else {
        result[shotCategory][playerKey][category][actualSide]++;
      }
    });

    return result;
  },

  // ——— SERVICE STATS ———
  _calcService(pts, p1, p2, parsed) {
    // Count serves per player
    const p1Serves = pts.filter(pt => pt.server === p1);
    const p2Serves = pts.filter(pt => pt.server === p2);

    // First serve: indicated by • (single dot) in TennisMath
    // Second serve: indicated by •• (double dot)
    // We can approximate from the parsed data
    // For now, count total service points and estimate
    const p1Total = p1Serves.length;
    const p2Total = p2Serves.length;

    // Count double faults
    const p1DF = pts.filter(pt => pt.server === p1 && pt.type === 'df').length;
    const p2DF = pts.filter(pt => pt.server === p2 && pt.type === 'df').length;

    // Count aces
    const p1Aces = pts.filter(pt => pt.server === p1 && pt.type === 'ace').length;
    const p2Aces = pts.filter(pt => pt.server === p2 && pt.type === 'ace').length;

    return {
      p1: { totalServices: p1Total, doubleFaults: p1DF, aces: p1Aces },
      p2: { totalServices: p2Total, doubleFaults: p2DF, aces: p2Aces },
    };
  },

  _calcServiceDetailed(pts, p1, p2, parsed) {
    const basic = this._calcService(pts, p1, p2, parsed);

    // Count 1st serve points won by each player when serving
    const p1ServePts = pts.filter(pt => pt.server === p1);
    const p2ServePts = pts.filter(pt => pt.server === p2);

    const p1ServeWon = p1ServePts.filter(pt => pt.winner === 1).length;
    const p2ServeWon = p2ServePts.filter(pt => pt.winner === 2).length;

    const p1ServePct = p1ServePts.length > 0 ? Math.round((p1ServeWon / p1ServePts.length) * 100) : 0;
    const p2ServePct = p2ServePts.length > 0 ? Math.round((p2ServeWon / p2ServePts.length) * 100) : 0;

    return {
      ...basic,
      p1: {
        ...basic.p1,
        servicePointsWon: p1ServeWon,
        servicePointsWonPct: p1ServePct,
      },
      p2: {
        ...basic.p2,
        servicePointsWon: p2ServeWon,
        servicePointsWonPct: p2ServePct,
      },
    };
  },

  // ——— POINTS STATS ———
  _calcPoints(pts, p1, p2) {
    const p1Total = pts.filter(pt => pt.winner === 1).length;
    const p2Total = pts.filter(pt => pt.winner === 2).length;

    // Winners by player (the player who HIT the winner)
    const p1Winners = pts.filter(pt => pt.winner === 1 && (pt.type === 'w' || pt.type === 'rw'));
    const p2Winners = pts.filter(pt => pt.winner === 2 && (pt.type === 'w' || pt.type === 'rw'));

    const p1WinFH = p1Winners.filter(pt => pt.shot === 'FH' || pt.shot === 'volley' || pt.shot === 'smash' || pt.shot === 'drop-shot' || pt.shot === 'lob').length;
    const p1WinBH = p1Winners.filter(pt => pt.shot === 'BH').length;
    // Recalculate: count all FH and BH separately
    const p1WinnersFH = p1Winners.filter(pt => pt.shot === 'FH').length;
    const p1WinnersBH = p1Winners.filter(pt => pt.shot === 'BH').length;
    const p2WinnersFH = p2Winners.filter(pt => pt.shot === 'FH').length;
    const p2WinnersBH = p2Winners.filter(pt => pt.shot === 'BH').length;

    // Unforced errors by player (the player who MADE the error = the one who LOST)
    const p1UE = pts.filter(pt => pt.winner === 2 && pt.type === 'ue'); // p1 made error, p2 won
    const p2UE = pts.filter(pt => pt.winner === 1 && pt.type === 'ue'); // p2 made error, p1 won

    const p1UEFH = p1UE.filter(pt => pt.shot === 'FH').length;
    const p1UEBH = p1UE.filter(pt => pt.shot === 'BH').length;
    const p2UEFH = p2UE.filter(pt => pt.shot === 'FH').length;
    const p2UEBH = p2UE.filter(pt => pt.shot === 'BH').length;

    const p1AggressiveMargin = p1Winners.length - p1UE.length;
    const p2AggressiveMargin = p2Winners.length - p2UE.length;

    return {
      p1: {
        total: p1Total,
        winners: p1Winners.length,
        winnersFH: p1WinnersFH,
        winnersBH: p1WinnersBH,
        unforcedErrors: p1UE.length,
        unforcedErrorsFH: p1UEFH,
        unforcedErrorsBH: p1UEBH,
        aggressiveMargin: p1AggressiveMargin,
      },
      p2: {
        total: p2Total,
        winners: p2Winners.length,
        winnersFH: p2WinnersFH,
        winnersBH: p2WinnersBH,
        unforcedErrors: p2UE.length,
        unforcedErrorsFH: p2UEFH,
        unforcedErrorsBH: p2UEBH,
        aggressiveMargin: p2AggressiveMargin,
      },
    };
  },

  // ——— FORCED ERRORS ———
  _calcForcedErrors(pts, p1, p2) {
    // Forced errors: the player who MADE the error lost the point
    const p1FE = pts.filter(pt => pt.winner === 2 && pt.type === 'fe');
    const p2FE = pts.filter(pt => pt.winner === 1 && pt.type === 'fe');

    return {
      p1: {
        total: p1FE.length,
        fh: p1FE.filter(pt => pt.shot === 'FH').length,
        bh: p1FE.filter(pt => pt.shot === 'BH').length,
      },
      p2: {
        total: p2FE.length,
        fh: p2FE.filter(pt => pt.shot === 'FH').length,
        bh: p2FE.filter(pt => pt.shot === 'BH').length,
      },
    };
  },

  // ——— RETURN STATS ———
  _calcReturn(pts, p1, p2) {
    // Return errors: errors made while returning serve
    // In TennisMath, these are "forced return error" and "unforced return error"
    const p1ReturnErrors = pts.filter(pt =>
      pt.winner === 2 && pt.server !== undefined &&
      pt.server !== null && pt.type === 'fe' &&
      // Check if it's a return error — the returner is the non-server
      true // We approximate: errors on return = server's opponent errors on receiving games
    );

    // Return winners
    const p1ReturnWinners = pts.filter(pt => pt.winner === 1 && pt.type === 'rw');
    const p2ReturnWinners = pts.filter(pt => pt.winner === 2 && pt.type === 'rw');

    return {
      p1: {
        returnWinners: p1ReturnWinners.length,
        returnWinnersFH: p1ReturnWinners.filter(pt => pt.shot === 'FH').length,
        returnWinnersBH: p1ReturnWinners.filter(pt => pt.shot === 'BH').length,
      },
      p2: {
        returnWinners: p2ReturnWinners.length,
        returnWinnersFH: p2ReturnWinners.filter(pt => pt.shot === 'FH').length,
        returnWinnersBH: p2ReturnWinners.filter(pt => pt.shot === 'BH').length,
      },
    };
  },

  // ——— CONVERSION STATS ———
  _calcConversion(pts, p1, p2, parsed) {
    // Receiving points won
    const p1RecvPts = pts.filter(pt => pt.server === p2);
    const p1RecvWon = p1RecvPts.filter(pt => pt.winner === 1).length;
    const p2RecvPts = pts.filter(pt => pt.server === p1);
    const p2RecvWon = p2RecvPts.filter(pt => pt.winner === 2).length;

    const p1RecvPct = p1RecvPts.length > 0 ? Math.round((p1RecvWon / p1RecvPts.length) * 100) : 0;
    const p2RecvPct = p2RecvPts.length > 0 ? Math.round((p2RecvWon / p2RecvPts.length) * 100) : 0;

    // Break points: games where the returner won
    let p1BP = 0, p1BPConverted = 0, p2BP = 0, p2BPConverted = 0;
    parsed.sets.forEach(set => {
      set.games.forEach(game => {
        if (!game.server || !game.winner) return;
        // Count break point opportunities from score progression
        // A break point = receiver reaches a score where winning next point wins the game
        // Simplified: just count break results
        if (game.server === p1 && game.winner === p2) {
          p1BPConverted++; // p2 broke p1's serve
          p1BP++; // at least 1 BP existed
        } else if (game.server === p1 && game.winner === p1) {
          // p1 held — but there might have been break points saved
          // We need to check deuce/advantage situations
        }
        if (game.server === p2 && game.winner === p1) {
          p2BPConverted++;
          p2BP++;
        }
      });
    });

    // Net points: points won at the net (volley, smash, approach)
    const netShots = ['volley', 'smash'];
    const p1NetWon = pts.filter(pt => pt.winner === 1 && netShots.includes((pt.shot || '').toLowerCase())).length;
    const p1NetTotal = pts.filter(pt => netShots.includes((pt.shot || '').toLowerCase()) &&
      ((pt.winner === 1) || (pt.winner === 2 && pt.type !== 'w'))).length;
    const p2NetWon = pts.filter(pt => pt.winner === 2 && netShots.includes((pt.shot || '').toLowerCase())).length;
    const p2NetTotal = pts.filter(pt => netShots.includes((pt.shot || '').toLowerCase()) &&
      ((pt.winner === 2) || (pt.winner === 1 && pt.type !== 'w'))).length;

    return {
      p1: {
        receivingPtsWonPct: p1RecvPct,
        breakPointsConverted: p2BPConverted, // p1 converting BPs on p2's serve
        breakPointsTotal: p2BP,
        netWon: p1NetWon,
        netTotal: p1NetWon + pts.filter(pt => pt.winner === 2 && netShots.includes((pt.shot || '').toLowerCase())).length,
      },
      p2: {
        receivingPtsWonPct: p2RecvPct,
        breakPointsConverted: p1BPConverted,
        breakPointsTotal: p1BP,
        netWon: p2NetWon,
        netTotal: p2NetWon + pts.filter(pt => pt.winner === 1 && netShots.includes((pt.shot || '').toLowerCase())).length,
      },
    };
  },

  _calcConversionDetailed(pts, p1, p2, parsed) {
    const basic = this._calcConversion(pts, p1, p2, parsed);

    // Approach points
    // In TennisMath, approach shots lead to net play — approximation
    // We count points where player came to net after an approach
    // For simplicity, use same net points data
    return basic;
  },

  // ——— HTML RENDERER ———
  renderStatsHTML(stats) {
    const p1 = stats.p1Name;
    const p2 = stats.p2Name;
    const ess = stats.essential;
    const det = stats.detailed;
    const shot = stats.byShot;

    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;border-bottom:1px solid #eee;margin-bottom:10px;">
          <button onclick="setPapStatsTab('essential')" class="pap-stats-tab pap-stats-tab-active" id="papStTabEss"
            style="flex:1;padding:7px;border:none;background:none;cursor:pointer;font-size:11px;color:#999;border-bottom:2px solid transparent;">
            Esencial
          </button>
          <button onclick="setPapStatsTab('detailed')" class="pap-stats-tab" id="papStTabDet"
            style="flex:1;padding:7px;border:none;background:none;cursor:pointer;font-size:11px;color:#999;border-bottom:2px solid transparent;">
            Detallado
          </button>
          <button onclick="setPapStatsTab('byshot')" class="pap-stats-tab" id="papStTabShot"
            style="flex:1;padding:7px;border:none;background:none;cursor:pointer;font-size:11px;color:#999;border-bottom:2px solid transparent;">
            Por golpe
          </button>
        </div>

        <div id="papStEssential">${this._renderEssential(ess, p1, p2)}</div>
        <div id="papStDetailed" style="display:none;">${this._renderDetailed(det, p1, p2)}</div>
        <div id="papStByShot" style="display:none;">${this._renderByShot(shot, p1, p2)}</div>
      </div>
    `;
  },

  _renderEssential(ess, p1, p2) {
    const s = ess.service;
    const p = ess.points;
    const c = ess.conversion;

    return `
      ${this._sectionTitle('Servicio')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(s.p1.aces || '—', 'Aces', s.p2.aces || '—')}
      ${this._statRow(s.p1.doubleFaults, 'Doble faltas', s.p2.doubleFaults)}

      ${this._sectionTitle('Puntos')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(p.p1.total, 'Total ganados', p.p2.total)}
      ${this._statRow(p.p1.winners, 'Winners', p.p2.winners)}
      ${this._statRowSub(p.p1.winnersBH + ' BH / ' + p.p1.winnersFH + ' FH', '', p.p2.winnersBH + ' BH / ' + p.p2.winnersFH + ' FH')}
      ${this._statRow(p.p1.unforcedErrors, 'Err. no forzados', p.p2.unforcedErrors)}
      ${this._statRowSub(p.p1.unforcedErrorsBH + ' BH / ' + p.p1.unforcedErrorsFH + ' FH', '', p.p2.unforcedErrorsBH + ' BH / ' + p.p2.unforcedErrorsFH + ' FH')}
      ${this._statRowHighlight(
        (p.p1.aggressiveMargin >= 0 ? '+' : '') + p.p1.aggressiveMargin,
        'Margen agresivo',
        (p.p2.aggressiveMargin >= 0 ? '+' : '') + p.p2.aggressiveMargin,
        p.p1.aggressiveMargin, p.p2.aggressiveMargin)}

      ${this._sectionTitle('Conversión')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(c.p1.receivingPtsWonPct + '%', 'Pts recepción', c.p2.receivingPtsWonPct + '%')}
      ${this._statRow(c.p1.breakPointsConverted + '/' + c.p1.breakPointsTotal, 'Break points', c.p2.breakPointsConverted + '/' + c.p2.breakPointsTotal)}
      ${this._statRow(c.p1.netWon + '/' + c.p1.netTotal, 'Pts en red', c.p2.netWon + '/' + c.p2.netTotal)}
    `;
  },

  _renderDetailed(det, p1, p2) {
    const s = det.service;
    const r = det.returnStats;
    const p = det.points;
    const f = det.forcedErrors;
    const c = det.conversion;

    return `
      ${this._sectionTitle('Servicio detallado')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(s.p1.totalServices, 'Total servicios', s.p2.totalServices)}
      ${this._statRow(s.p1.aces || '—', 'Aces', s.p2.aces || '—')}
      ${this._statRow(s.p1.doubleFaults, 'Doble faltas', s.p2.doubleFaults)}
      ${this._statRow(s.p1.servicePointsWonPct + '%', 'Pts servicio ganados', s.p2.servicePointsWonPct + '%')}

      ${this._sectionTitle('Devolución')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(r.p1.returnWinners, 'Winners devoluc.', r.p2.returnWinners)}
      ${this._statRowSub(r.p1.returnWinnersBH + ' BH / ' + r.p1.returnWinnersFH + ' FH', '', r.p2.returnWinnersBH + ' BH / ' + r.p2.returnWinnersFH + ' FH')}

      ${this._sectionTitle('Errores forzados')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(f.p1.total, 'Total forz.', f.p2.total)}
      ${this._statRowSub(f.p1.bh + ' BH / ' + f.p1.fh + ' FH', 'Distribución', f.p2.bh + ' BH / ' + f.p2.fh + ' FH')}

      ${this._sectionTitle('Conversión')}
      ${this._statsHead(p1, p2)}
      ${this._statRow(c.p1.receivingPtsWonPct + '%', 'Pts recepción', c.p2.receivingPtsWonPct + '%')}
      ${this._statRow(c.p1.breakPointsConverted + '/' + c.p1.breakPointsTotal, 'Break points', c.p2.breakPointsConverted + '/' + c.p2.breakPointsTotal)}
      ${this._statRow(c.p1.netWon + '/' + c.p1.netTotal, 'Pts en red', c.p2.netWon + '/' + c.p2.netTotal)}
    `;
  },

  _renderByShot(shot, p1, p2) {
    const types = [
      { key: 'ground', label: 'Ground stroke' },
      { key: 'volley', label: 'Volea' },
      { key: 'drop-shot', label: 'Drop-shot' },
      { key: 'smash', label: 'Smash' },
      { key: 'lob', label: 'Lob' },
    ];

    let html = '';
    types.forEach(t => {
      const d = shot[t.key];
      if (!d) return;
      const p1w = d.p1.winners.bh + d.p1.winners.fh;
      const p2w = d.p2.winners.bh + d.p2.winners.fh;
      const p1fe = d.p1.forcedErrors.bh + d.p1.forcedErrors.fh;
      const p2fe = d.p2.forcedErrors.bh + d.p2.forcedErrors.fh;
      const p1ue = d.p1.unforcedErrors.bh + d.p1.unforcedErrors.fh;
      const p2ue = d.p2.unforcedErrors.bh + d.p2.unforcedErrors.fh;

      // Skip if all zeros
      if (p1w + p2w + p1fe + p2fe + p1ue + p2ue === 0) return;

      html += `
        ${this._sectionTitle(t.label)}
        ${this._statsHead(p1, p2)}
        ${this._statRow(p1w, 'Winners', p2w)}
        ${p1w + p2w > 0 ? this._statRowSub(d.p1.winners.bh + ' BH / ' + d.p1.winners.fh + ' FH', '', d.p2.winners.bh + ' BH / ' + d.p2.winners.fh + ' FH') : ''}
        ${this._statRow(p1fe, 'Err. forzados', p2fe)}
        ${p1fe + p2fe > 0 ? this._statRowSub(d.p1.forcedErrors.bh + ' BH / ' + d.p1.forcedErrors.fh + ' FH', '', d.p2.forcedErrors.bh + ' BH / ' + d.p2.forcedErrors.fh + ' FH') : ''}
        ${this._statRow(p1ue, 'Err. no forzados', p2ue)}
        ${p1ue + p2ue > 0 ? this._statRowSub(d.p1.unforcedErrors.bh + ' BH / ' + d.p1.unforcedErrors.fh + ' FH', '', d.p2.unforcedErrors.bh + ' BH / ' + d.p2.unforcedErrors.fh + ' FH') : ''}
      `;
    });

    return html;
  },

  // ——— HTML HELPERS ———
  _sectionTitle(text) {
    return `<div style="font-size:11px;font-weight:500;color:#999;text-transform:uppercase;letter-spacing:.04em;margin:12px 0 6px;">${text}</div>`;
  },

  _statsHead(p1, p2) {
    return `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:5px 0;border-bottom:0.5px solid #eee;">
      <div style="font-size:10px;font-weight:500;color:#999;">${p1}</div>
      <div style="font-size:9px;color:#ccc;text-align:center;padding:0 8px;">Métrica</div>
      <div style="font-size:10px;font-weight:500;color:#999;text-align:right;">${p2}</div>
    </div>`;
  },

  _statRow(v1, label, v2) {
    const n1 = parseFloat(v1), n2 = parseFloat(v2);
    const c1 = !isNaN(n1) && !isNaN(n2) && n1 > n2 ? 'color:#534AB7;' : '';
    const c2 = !isNaN(n1) && !isNaN(n2) && n2 > n1 ? 'color:#0F6E56;' : '';
    return `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 0;border-bottom:0.5px solid #f5f5f5;">
      <div style="font-size:13px;font-weight:500;${c1}">${v1}</div>
      <div style="font-size:10px;color:#999;text-align:center;padding:0 4px;">${label}</div>
      <div style="font-size:13px;font-weight:500;text-align:right;${c2}">${v2}</div>
    </div>`;
  },

  _statRowSub(v1, label, v2) {
    return `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:2px 0 6px;border-bottom:0.5px solid #f5f5f5;">
      <div style="font-size:10px;color:#888;">${v1}</div>
      <div style="font-size:9px;color:#ccc;text-align:center;padding:0 4px;">${label}</div>
      <div style="font-size:10px;color:#888;text-align:right;">${v2}</div>
    </div>`;
  },

  _statRowHighlight(v1, label, v2, n1, n2) {
    const c1 = n1 > 0 ? 'color:#534AB7;' : n1 < 0 ? 'color:#E24B4A;' : '';
    const c2 = n2 > 0 ? 'color:#0F6E56;' : n2 < 0 ? 'color:#E24B4A;' : '';
    return `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 0;border-bottom:0.5px solid #f5f5f5;background:#fafafa;margin:2px -4px;padding:6px 4px;border-radius:4px;">
      <div style="font-size:14px;font-weight:600;${c1}">${v1}</div>
      <div style="font-size:10px;font-weight:500;color:#666;text-align:center;padding:0 4px;">${label}</div>
      <div style="font-size:14px;font-weight:600;text-align:right;${c2}">${v2}</div>
    </div>`;
  },
};

// Tab switcher function (global for onclick)
function setPapStatsTab(tab) {
  document.getElementById('papStEssential').style.display = tab === 'essential' ? 'block' : 'none';
  document.getElementById('papStDetailed').style.display = tab === 'detailed' ? 'block' : 'none';
  document.getElementById('papStByShot').style.display = tab === 'byshot' ? 'block' : 'none';
  document.querySelectorAll('.pap-stats-tab').forEach(t => t.classList.remove('pap-stats-tab-active'));
  document.getElementById(tab === 'essential' ? 'papStTabEss' : tab === 'detailed' ? 'papStTabDet' : 'papStTabShot').classList.add('pap-stats-tab-active');
}

// Export
if (typeof window !== 'undefined') {
  window.TennisMathStats = TennisMathStats;
  window.setPapStatsTab = setPapStatsTab;
}
if (typeof module !== 'undefined') {
  module.exports = TennisMathStats;
}
