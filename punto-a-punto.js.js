// ============================================================
// MÓDULO PUNTO A PUNTO — TenisMetricsPro
// Parser ITF + TenisMath + Gráfico Momentum + Estadísticas
// Integrar en index.html de Altotenis / TMP frontend
// ============================================================

// ——— PARSERS ———

const PuntoAPunto = {

  // Detecta automáticamente el formato del texto pegado
  detectFormat(text) {
    if (text.includes('SET 1') && text.includes('[COL]') || text.includes('[VER]') || text.includes('won by')) {
      return 'itf';
    }
    if (text.includes('is serving') || text.includes('unforced error') || text.includes('winner')) {
      return 'tennismath';
    }
    return null;
  },

  // ——— PARSER ITF ———
  parseITF(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const sets = [];
    let currentSet = null;
    let currentGame = null;
    let parsingPlayer = null; // 'p1' or 'p2'
    let p1Id = null, p2Id = null;
    let p1Name = null, p2Name = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // SET header
      if (/^SET\s+\d+$/i.test(line)) {
        const setNum = parseInt(line.match(/\d+/)[0]);
        currentSet = { setNum, games: [] };
        sets.push(currentSet);
        continue;
      }

      // Game header: "X - Y won by Name"
      const gameMatch = line.match(/^(\d+)\s*-\s*(\d+)\s+won\s+by\s+(.+)$/i);
      if (gameMatch) {
        currentGame = {
          scoreBefore: `${gameMatch[1]}–${gameMatch[2]}`,
          winner: gameMatch[3].trim(),
          p1Scores: [],
          p2Scores: [],
        };
        if (currentSet) currentSet.games.push(currentGame);
        parsingPlayer = null;
        continue;
      }

      // Player ID line: [XXX](url)
      const playerMatch = line.match(/^\[([A-Z]{3})\]/);
      if (playerMatch) {
        const id = playerMatch[1];
        if (!p1Id) {
          p1Id = id;
          parsingPlayer = 'p1';
        } else if (id === p1Id) {
          parsingPlayer = 'p1';
        } else {
          if (!p2Id) p2Id = id;
          parsingPlayer = 'p2';
        }
        continue;
      }

      // Score values (numbers or "Ad")
      if (currentGame && parsingPlayer) {
        const val = line.trim();
        if (/^\d+$/.test(val) || val === 'Ad') {
          const numVal = val === 'Ad' ? 'Ad' : parseInt(val);
          if (parsingPlayer === 'p1') {
            currentGame.p1Scores.push(numVal);
          } else {
            currentGame.p2Scores.push(numVal);
          }
        }
      }
    }

    // ITF lists games in REVERSE order within each set
    sets.forEach(s => s.games.reverse());

    // Now reconstruct point-by-point from score progressions
    // Determine player names from game winners
    const allWinners = sets.flatMap(s => s.games.map(g => g.winner));
    const uniqueNames = [...new Set(allWinners)];

    // The player matching p1Id is determined by who won which games
    // For now, p1 = first player code found, p2 = second
    const result = {
      format: 'itf',
      p1Id,
      p2Id,
      sets: [],
      totalPoints: { p1: 0, p2: 0 },
    };

    sets.forEach(setData => {
      const setResult = {
        setNum: setData.setNum,
        games: [],
        points: { p1: 0, p2: 0 },
      };

      setData.games.forEach((game, gi) => {
        // Remove last entries which are accumulated game tallies
        // The score sequences contain point-by-point scores followed by game tally
        // We need to separate them: scores that are 0,15,30,40,Ad are point scores
        // Scores that are larger integers (1,2,3,4,5,6,7) at the end are game tallies
        const p1Pts = this._extractPointScores(game.p1Scores);
        const p2Pts = this._extractPointScores(game.p2Scores);

        // Check if this is a tiebreak (scores go 1,2,3... not 15,30,40)
        const isTB = this._isTiebreak(p1Pts, p2Pts);

        let points;
        if (isTB) {
          points = this._parseTiebreakPoints(game.p1Scores, game.p2Scores, p1Id, p2Id);
        } else {
          points = this._parseGamePoints(p1Pts, p2Pts);
        }

        // Determine if it's a break based on winner vs server
        // Server alternates: G1 = p1, G2 = p2, etc. (we'll determine from context)
        const winnerIsP1 = game.winner !== uniqueNames.find(n => n !== game.winner) &&
          allWinners.filter(w => w === game.winner).length > 0;

        // Calculate game score after this game
        const prevGames = setData.games.slice(0, gi + 1);
        const p1Games = prevGames.filter(g => {
          return uniqueNames.indexOf(g.winner) === 0;
        }).length;
        const p2Games = prevGames.filter(g => {
          return uniqueNames.indexOf(g.winner) === 1;
        }).length;

        const gameResult = {
          score: game.scoreBefore,
          winner: game.winner,
          points,
          isTB,
          pointsP1: points.filter(p => p === 1).length,
          pointsP2: points.filter(p => p === 2).length,
        };

        setResult.games.push(gameResult);
        setResult.points.p1 += gameResult.pointsP1;
        setResult.points.p2 += gameResult.pointsP2;
      });

      result.sets.push(setResult);
      result.totalPoints.p1 += setResult.points.p1;
      result.totalPoints.p2 += setResult.points.p2;
    });

    return result;
  },

  _extractPointScores(scores) {
    // Point scores are 0, 15, 30, 40, Ad
    // Game tally scores are small integers at the end (0-7)
    // Strategy: scan from end, remove trailing integers that look like game tallies
    const pts = [...scores];
    // Remove last 1-2 entries that are game tallies (values 0-7 after the last 40/Ad/0)
    while (pts.length > 0) {
      const last = pts[pts.length - 1];
      if (typeof last === 'number' && last >= 0 && last <= 7 && last !== 15 && last !== 30 && last !== 40) {
        // Check if previous was also a tally or 40/Ad (end of game)
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2];
          if (prev === 0 || (typeof prev === 'number' && prev >= 0 && prev <= 7 && prev !== 15 && prev !== 30 && prev !== 40)) {
            pts.pop();
            continue;
          }
        }
        pts.pop();
        break;
      }
      break;
    }
    return pts;
  },

  _isTiebreak(p1Pts, p2Pts) {
    // Tiebreak scores go 1,2,3,4,5... not 15,30,40
    const allScores = [...p1Pts, ...p2Pts];
    const has15or30or40 = allScores.some(s => s === 15 || s === 30 || s === 40 || s === 'Ad');
    return !has15or30or40 && allScores.length > 0;
  },

  _parseTiebreakPoints(p1Raw, p2Raw, p1Id, p2Id) {
    // TB scores are running totals: 0,0,1,1,1,2... / 1,2,2,3,4,4...
    // Extract just the running scores (remove game tallies at end)
    const p1 = p1Raw.filter(s => typeof s === 'number');
    const p2 = p2Raw.filter(s => typeof s === 'number');

    // Remove last entries (game tallies — larger values or final set score)
    // TB scores max out at ~7, game tallies would be the set score (6,7)
    // We use the shorter array length as reference
    const len = Math.min(p1.length, p2.length);
    const points = [];
    let prevP1 = 0, prevP2 = 0;

    for (let i = 0; i < len; i++) {
      if (p1[i] > prevP1) {
        points.push(2); // p1 in ITF codes = Collins typically
        prevP1 = p1[i];
        prevP2 = p2[i];
      } else if (p2[i] > prevP2) {
        points.push(1); // p2 = Vergara
        prevP1 = p1[i];
        prevP2 = p2[i];
      }
    }
    return points;
  },

  _parseGamePoints(p1Scores, p2Scores) {
    const points = [];
    let prevP1 = 0, prevP2 = 0;
    const len = Math.max(p1Scores.length, p2Scores.length);

    for (let i = 0; i < len; i++) {
      const c1 = i < p1Scores.length ? p1Scores[i] : p1Scores[p1Scores.length - 1];
      const c2 = i < p2Scores.length ? p2Scores[i] : p2Scores[p2Scores.length - 1];

      const v1 = this._scoreVal(c1);
      const v2 = this._scoreVal(c2);
      const pv1 = this._scoreVal(prevP1);
      const pv2 = this._scoreVal(prevP2);

      let winner;
      if (c1 === 'Ad' && prevP1 !== 'Ad') winner = 2; // p1 (COL) scored
      else if (c2 === 'Ad' && prevP2 !== 'Ad') winner = 1; // p2 (VER) scored
      else if (prevP1 === 'Ad' && c1 === 40 && c2 === 40) winner = 1; // VER broke Ad
      else if (prevP2 === 'Ad' && c2 === 40 && c1 === 40) winner = 2; // COL broke Ad
      else if (v1 > pv1 && v2 === pv2) winner = 2; // p1 score went up
      else if (v2 > pv2 && v1 === pv1) winner = 1; // p2 score went up
      else if (v1 > pv1) winner = 2;
      else if (v2 > pv2) winner = 1;
      else winner = 0; // shouldn't happen

      points.push(winner);
      prevP1 = c1;
      prevP2 = c2;
    }
    return points;
  },

  _scoreVal(s) {
    if (s === 0 || s === '0') return 0;
    if (s === 15) return 1;
    if (s === 30) return 2;
    if (s === 40) return 3;
    if (s === 'Ad') return 4;
    return 0;
  },

  // ——— PARSER TENNISMATH ———
  parseTennisMath(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result = {
      format: 'tennismath',
      sets: [],
      stats: { p1: {}, p2: {} },
    };

    let currentSet = null;
    let currentGame = null;
    let p1Name = null, p2Name = null;

    for (const line of lines) {
      // Set header
      const setMatch = line.match(/^Set\s+#(\d+)/i);
      if (setMatch) {
        currentSet = { setNum: parseInt(setMatch[1]), games: [] };
        result.sets.push(currentSet);
        continue;
      }

      // Game header
      const gameMatch = line.match(/^Game\s+#(\d+):\s+(\d+-\d+)/i);
      if (gameMatch) {
        currentGame = {
          gameNum: parseInt(gameMatch[1]),
          scoreBefore: gameMatch[2],
          server: null,
          points: [],
        };
        if (currentSet) currentSet.games.push(currentGame);
        continue;
      }

      // Server line
      const serverMatch = line.match(/^(\w[\w\s]+?)\s+is\s+serving/i);
      if (serverMatch && currentGame) {
        currentGame.server = serverMatch[1].trim().toLowerCase();
        if (!p1Name) p1Name = currentGame.server;
        else if (currentGame.server !== p1Name && !p2Name) {
          p2Name = currentGame.server;
        }
        continue;
      }

      // Point line: score •/•• player action
      const pointMatch = line.match(/^\s*[(!)*]*\s*[\d:+A-]+\s+([•]+)\s+(.+)$/);
      if (pointMatch && currentGame) {
        const desc = pointMatch[2].trim();
        const point = this._parseTennisMathPoint(desc, p1Name, p2Name);
        if (point) currentGame.points.push(point);
        continue;
      }

      // Game winner line
      const winMatch = line.match(/^(\w[\w\s]+?)\s+wins\s+the\s+game/i);
      if (winMatch && currentGame) {
        currentGame.winner = winMatch[1].trim().toLowerCase();
      }
    }

    result.p1Name = p1Name;
    result.p2Name = p2Name;
    return result;
  },

  _parseTennisMathPoint(desc, p1Name, p2Name) {
    const lower = desc.toLowerCase();

    // Determine who lost the point (and therefore who won it)
    let loser = null;
    if (p1Name && lower.includes(p1Name)) loser = p1Name;
    else if (p2Name && lower.includes(p2Name)) loser = p2Name;

    // Determine type
    let type = 'point';
    if (lower.includes('double fault')) type = 'df';
    else if (lower.includes('unforced error')) type = 'ue';
    else if (lower.includes('forced error') || lower.includes('forced return error')) type = 'fe';
    else if (lower.includes('winner') || lower.includes('return winner')) type = 'w';
    else if (lower.includes('ace')) type = 'ace';

    // Determine shot
    let shot = null;
    if (lower.includes('• fh') || lower.endsWith('fh')) shot = 'FH';
    else if (lower.includes('• bh') || lower.endsWith('bh')) shot = 'BH';
    if (lower.includes('volley')) shot = 'volley';
    if (lower.includes('drop-shot') || lower.includes('dropshot')) shot = 'drop-shot';
    if (lower.includes('smash')) shot = 'smash';
    if (lower.includes('lob')) shot = 'lob';

    // Winner of the point
    let winner;
    if (type === 'w' || type === 'ace') {
      // The named player won
      winner = loser === p1Name ? 1 : 2;
    } else {
      // The named player lost (error)
      winner = loser === p1Name ? 2 : 1;
    }

    return { winner, type, shot };
  },

  // ——— MOMENTUM CHART BUILDER ———
  buildMomentumData(parsedData) {
    const setsData = [];

    parsedData.sets.forEach(set => {
      const setPoints = [];

      set.games.forEach((game, gi) => {
        const isLastGame = gi === set.games.length - 1;
        const pts = parsedData.format === 'tennismath'
          ? game.points.map(p => p.winner)
          : game.points;

        // Determine if break
        let isBreak = false;
        if (parsedData.format === 'itf') {
          // For ITF, server alternates starting G1
          // Simple heuristic: odd games = p1 serves, even = p2 serves (or vice versa)
          // We'll flag breaks based on the parsed data
          isBreak = game.isBreak || false;
        } else {
          // TennisMath has explicit server info
          if (game.server && game.winner) {
            isBreak = game.server !== game.winner;
          }
        }

        pts.forEach((w, pi) => {
          const isGameEnd = pi === pts.length - 1;
          setPoints.push({
            w, // 1 = p1 wins point, 2 = p2 wins point
            gameWon: isGameEnd,
            isBreak: isGameEnd && isBreak,
            setWon: isGameEnd && isLastGame,
            score: game.score || game.scoreBefore,
            isTB: game.isTB || false,
          });
        });
      });

      setsData.push({
        setNum: set.setNum,
        points: setPoints,
      });
    });

    return setsData;
  },

  // ——— RENDER MOMENTUM CHART ———
  // Requires Chart.js loaded
  renderMomentumChart(canvasId, setPoints, p1Name, p2Name) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const C_P1 = '#534AB7', C_P2 = '#0F6E56', C_BRK = '#EF9F27', C_SET = '#97C459';

    let c1 = 0, c2 = 0;
    const mom = [], bg = [], bd = [], rad = [], lbls = [], gameBounds = [];

    setPoints.forEach((p, i) => {
      if (p.w === 1) c1++; else c2++;
      mom.push(c1 - c2);
      lbls.push(i + 1);
      if (p.gameWon && i < setPoints.length - 1) gameBounds.push(i + 1);

      let b, d, r = 3;
      if (p.setWon) { b = C_SET; d = '#3B6D11'; r = 9; }
      else if (p.isBreak) { b = C_BRK; d = '#BA7517'; r = 7; }
      else if (p.gameWon && p.w === 1) { b = C_P1; d = '#3C3489'; r = 6; }
      else if (p.gameWon && p.w === 2) { b = C_P2; d = '#085041'; r = 6; }
      else if (p.w === 1) {
        b = isDark ? 'rgba(83,74,183,0.5)' : 'rgba(83,74,183,0.35)';
        d = isDark ? 'rgba(83,74,183,0.7)' : 'rgba(83,74,183,0.55)';
      } else {
        b = isDark ? 'rgba(15,110,86,0.45)' : 'rgba(15,110,86,0.3)';
        d = isDark ? 'rgba(15,110,86,0.65)' : 'rgba(15,110,86,0.5)';
      }
      bg.push(b); bd.push(d); rad.push(r);
    });

    const total = setPoints.length;
    const gridC = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const tickC = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)';

    return new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels: lbls,
        datasets: [{
          data: mom, borderColor: C_P1, borderWidth: 2,
          fill: {
            target: 'origin',
            above: isDark ? 'rgba(83,74,183,0.12)' : 'rgba(83,74,183,0.08)',
            below: isDark ? 'rgba(15,110,86,0.12)' : 'rgba(15,110,86,0.08)',
          },
          pointBackgroundColor: bg, pointBorderColor: bd, pointBorderWidth: 1.5,
          pointRadius: rad, pointHoverRadius: ctx => rad[ctx.dataIndex] + 2,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 14, right: 12, bottom: 4, left: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(10,14,26,0.97)' : 'rgba(255,255,255,0.97)',
            titleColor: isDark ? '#e0e0e0' : '#0A0E1A',
            bodyColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 0.5, padding: 10, titleFont: { weight: '500' },
            callbacks: {
              title: ctx => {
                const p = setPoints[ctx[0].dataIndex];
                if (p.setWon) return `Set ganado · ${p.score}`;
                if (p.isBreak) return `Break · ${p.score}`;
                if (p.gameWon) return `Game · ${p.score}`;
                return `Punto #${ctx[0].label}`;
              },
              label: ctx => {
                const p = setPoints[ctx.dataIndex];
                const who = p.w === 1 ? p1Name : p2Name;
                return `${who} gana el punto`;
              },
              afterLabel: ctx => {
                const d = mom[ctx.dataIndex];
                return d > 0 ? `${p1Name} +${d} pts` : d < 0 ? `${p2Name} +${Math.abs(d)} pts` : 'Iguales';
              },
            },
          },
        },
        scales: {
          x: { ticks: { display: false }, grid: { display: false }, border: { display: false } },
          y: {
            grid: { color: gridC, lineWidth: 0.5 },
            ticks: { font: { size: 9 }, color: tickC, callback: v => (v > 0 ? '+' : '') + v },
            border: { display: false },
          },
        },
      },
      plugins: [{
        id: 'momentumAnnotations',
        afterDraw(chart) {
          const { ctx, scales: { x, y }, chartArea: { top, bottom, left, right: r } } = chart;
          ctx.save();
          const y0 = y.getPixelForValue(0);

          // Zero line
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(left, y0); ctx.lineTo(r, y0); ctx.stroke();

          // Game lines
          gameBounds.forEach(gi => {
            const gx = x.getPixelForValue(gi);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 0.5; ctx.setLineDash([2, 5]);
            ctx.beginPath(); ctx.moveTo(gx, top + 4); ctx.lineTo(gx, bottom); ctx.stroke();
            ctx.setLineDash([]);
          });

          // Direction labels
          ctx.font = '9px sans-serif';
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)';
          ctx.textAlign = 'right';
          ctx.fillText('↑ ' + p1Name, r - 2, y0 - 6);
          ctx.fillText('↓ ' + p2Name, r - 2, y0 + 14);

          // Final diff label
          const lastD = mom[total - 1];
          const lastPx = x.getPixelForValue(total - 1);
          const lastPy = y.getPixelForValue(lastD);
          ctx.font = '500 10px sans-serif';
          ctx.fillStyle = lastD >= 0 ? C_P1 : C_P2;
          ctx.textAlign = 'right';
          ctx.fillText((lastD >= 0 ? '+' : '') + lastD + ' pts', lastPx - 6, lastPy + (lastD >= 0 ? -10 : 16));
          ctx.restore();
        },
      }],
    });
  },
};

// Export for use in app
if (typeof window !== 'undefined') {
  window.PuntoAPunto = PuntoAPunto;
}
if (typeof module !== 'undefined') {
  module.exports = PuntoAPunto;
}
