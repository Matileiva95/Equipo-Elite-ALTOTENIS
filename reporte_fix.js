function _generarReportePDF({ titulo, tipo, filename }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const año = asistMes.getFullYear();
  const mes = asistMes.getMonth();
  const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
    'Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mes];
  const diasEnMes = new Date(año, mes+1, 0).getDate();

  const cols = [];
  for(let d=1; d<=diasEnMes; d++){
    const dt = new Date(año, mes, d);
    const dow = dt.getDay();
    if(dow>=1 && dow<=5) cols.push({
      d,
      key:`${año}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      dow
    });
  }

  const pageW = 297; const marginL = 10; const marginR = 10; const marginT = 12;
  const totalCols = cols.length + 3;

  const resolverGrupo = (p) =>
    (window._groups||[]).find(g => g.id === p.group_id)?.name || 'Sin grupo';

  doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.setTextColor(30,30,30);
  doc.text(`${titulo} — ${mesNombre} ${año}`, marginL, marginT+4);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.setTextColor(100,100,100);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`,
    pageW-marginR, marginT+4, {align:'right'});

  const allPlayers = data.players;
  let totalAsist=0, totalSes=0, conFaltas=0, ok=0;
  allPlayers.forEach(p=>{
    const asist = p.asistencia||{};
    let pSes=0, pPres=0;
    cols.forEach(c=>{
      const dd = asist[c.key]||{};
      if(tipo==='tenis'){
        ['t1','t2'].forEach(t=>{
          const v=dd[t]||'';
          if(v==='p'||v==='t'||v==='l'||v==='s'){ pSes++; }
          if(v==='p'||v==='t'){ pPres++; }
        });
      } else {
        const v=dd.f1||'';
        if(v==='p'||v==='t'||v==='l'||v==='s'){ pSes++; }
        if(v==='p'||v==='t'){ pPres++; }
      }
    });
    totalSes+=pSes; totalAsist+=pPres;
    const pct=pSes>0?Math.round((pPres/pSes)*100):100;
    if(pct<100) conFaltas++; else ok++;
  });
  const avgPct=totalSes>0?Math.round((totalAsist/totalSes)*100):0;

  const boxY=marginT+9; const boxH2=12; const boxW=38;
  const boxes=[
    {label:'Total jugadores', val:String(allPlayers.length), color:[41,182,246]},
    {label:'Asistencia promedio', val:`${avgPct}%`,
      color:avgPct>=90?[39,174,96]:avgPct>=70?[243,156,18]:[231,76,60]},
    {label:'Con ausencias', val:String(conFaltas), color:[231,76,60]},
    {label:'Sin ausencias', val:String(ok), color:[39,174,96]},
  ];
  boxes.forEach((b,i)=>{
    const bx=marginL+i*(boxW+4);
    doc.setFillColor(...b.color); doc.roundedRect(bx,boxY,boxW,boxH2,2,2,'F');
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(b.val, bx+boxW/2, boxY+7.5, {align:'center'});
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(b.label, bx+boxW/2, boxY+11, {align:'center'});
  });

  const grupoOrden = ['Elite','F2','F1','F1C','Naranja','Verde'];
  const grupoMap = {};
  grupoOrden.forEach(g => grupoMap[g] = []);
  allPlayers.forEach(p => {
    const nombre = resolverGrupo(p);
    if(grupoMap[nombre] !== undefined) grupoMap[nombre].push(p);
    else { if(!grupoMap['Sin grupo']) grupoMap['Sin grupo']=[]; grupoMap['Sin grupo'].push(p); }
  });
  const gruposConJugadores = [...grupoOrden,'Sin grupo']
    .filter(g => (grupoMap[g]||[]).length > 0);

  const tableStartY = boxY+boxH2+5;
  const dayLabels = cols.map(c=>{
    const names=['','L','M','X','J','V'];
    return `${names[c.dow]}\n${c.d}`;
  });
  const head = [['Jugador', ...dayLabels, 'Asist%', 'Faltas']];

  const body = [];
  const rowMeta = [];

  const buildPlayerRow = (p) => {
    const asist = p.asistencia||{};
    let pSes=0, pPres=0;
    const row = [p.name];
    cols.forEach(c=>{
      const dd = asist[c.key]||{};
      let cell='';
      if(tipo==='tenis'){
        const t1=dd.t1||''; const t2=dd.t2||'';
        if(t1 && t2) cell=`${t1.toUpperCase()}/${t2.toUpperCase()}`;
        else if(t1) cell=t1.toUpperCase();
        else if(t2) cell=t2.toUpperCase();
        [t1,t2].forEach(t=>{
          if(t==='p'||t==='t'||t==='l'||t==='s'){ pSes++; }
          if(t==='p'||t==='t'){ pPres++; }
        });
      } else {
        const f1=dd.f1||'';
        cell=f1.toUpperCase();
        if(f1==='p'||f1==='t'||f1==='l'||f1==='s'){ pSes++; }
        if(f1==='p'||f1==='t'){ pPres++; }
      }
      row.push(cell);
    });
    const pct=pSes>0?Math.round((pPres/pSes)*100):'-';
    const faltas=pSes>0?(pSes-pPres):0;
    row.push(pct==='-'?'-':`${pct}%`);
    row.push(String(faltas));
    return row;
  };

  gruposConJugadores.forEach(g => {
    const headerRow = new Array(totalCols).fill('');
    headerRow[0] = `── ${g.toUpperCase()} ──`;
    body.push(headerRow);
    rowMeta.push({ isHeader:true, grupo:g });
    (grupoMap[g]||[]).forEach(p => {
      body.push(buildPlayerRow(p));
      rowMeta.push({ isHeader:false });
    });
  });

  const statusColors = {
    p:[39,174,96],
    t:[41,182,246],
    l:[241,196,15],
    d:[142,68,173],
    s:[231,76,60],
  };

  doc.autoTable({
    head, body,
    startY: tableStartY,
    margin:{left:marginL, right:marginR},
    styles:{fontSize:7,cellPadding:1.5,halign:'center',valign:'middle'},
    headStyles:{fillColor:[52,73,94],textColor:255,fontSize:7,
      fontStyle:'bold',halign:'center'},
    columnStyles:{
      0:{halign:'left',fontStyle:'bold',cellWidth:32},
      [cols.length+1]:{fontStyle:'bold'},
      [cols.length+2]:{fontStyle:'bold'},
    },
    didDrawCell(data){
      if(data.section !== 'body') return;
      const meta = rowMeta[data.row.index];
      if(!meta) return;

      if(meta.isHeader){
        doc.setFillColor(26,26,46);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height,'F');
        if(data.column.index === 0){
          const tableWidth = pageW - marginL - marginR;
          doc.setTextColor(255,255,255);
          doc.setFontSize(7.5); doc.setFont('helvetica','bold');
          doc.text(
            `── ${meta.grupo.toUpperCase()} ──`,
            marginL + tableWidth/2,
            data.cell.y + data.cell.height/2 + 0.8,
            {align:'center'}
          );
        }
        return;
      }

      if(data.column.index >= 1 && data.column.index <= cols.length){
        const raw = String(data.cell.raw||'');
        if(!raw) return;

        if(raw.includes('/')){
          const [left, right] = raw.split('/');
          const halfW = data.cell.width/2;
          const colL = statusColors[left.toLowerCase()] || [200,200,200];
          const colR = statusColors[right.toLowerCase()] || [200,200,200];
          doc.setFillColor(...colL);
          doc.rect(data.cell.x, data.cell.y, halfW, data.cell.height,'F');
          doc.setTextColor(255,255,255);
          doc.setFontSize(5.5); doc.setFont('helvetica','bold');
          doc.text(left,
            data.cell.x + halfW/2,
            data.cell.y + data.cell.height/2 + 0.8,
            {align:'center'});
          doc.setFillColor(...colR);
          doc.rect(data.cell.x+halfW, data.cell.y, halfW, data.cell.height,'F');
          doc.setTextColor(255,255,255);
          doc.text(right,
            data.cell.x + halfW + halfW/2,
            data.cell.y + data.cell.height/2 + 0.8,
            {align:'center'});
        } else {
          const col = statusColors[raw.toLowerCase()];
          if(col){
            doc.setFillColor(...col);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height,'F');
            doc.setTextColor(255,255,255); doc.setFontSize(6.5);
            doc.text(raw,
              data.cell.x+data.cell.width/2,
              data.cell.y+data.cell.height/2+0.8,
              {align:'center'});
          }
        }
      }

      if(data.column.index === cols.length+1){
        const pct=parseInt(data.cell.raw)||0;
        if(data.cell.raw !== '-'){
          const col=pct>=90?[39,174,96]:pct>=70?[243,156,18]:[231,76,60];
          doc.setTextColor(...col);
          doc.setFontSize(7); doc.setFont('helvetica','bold');
          doc.text(String(data.cell.raw||''),
            data.cell.x+data.cell.width/2,
            data.cell.y+data.cell.height/2+0.8,
            {align:'center'});
        }
      }
    },
    alternateRowStyles:{fillColor:[248,249,250]},
  });

  const legendY = doc.lastAutoTable.finalY + 6;
  const legend = [
    {label:'P = Presente',       color:[39,174,96]},
    {label:'T = Torneo',         color:[41,182,246]},
    {label:'L = Lesión',         color:[241,196,15]},
    {label:'D = Descanso',       color:[142,68,173]},
    {label:'S = Sin justificar', color:[231,76,60]},
  ];
  doc.setFontSize(7); doc.setFont('helvetica','normal');
  let lx = marginL;
  legend.forEach(item => {
    doc.setFillColor(...item.color);
    doc.rect(lx, legendY-2.5, 3, 3,'F');
    doc.setTextColor(50,50,50);
    doc.text(item.label, lx+4.5, legendY+0.2);
    lx += doc.getTextWidth(item.label) + 10;
  });

  doc.save(`${filename}_${mesNombre}_${año}.pdf`);
}

function generarReporteTenis() {
  _generarReportePDF({ titulo:'Reporte de Asistencia Tenis', tipo:'tenis', filename:'Asistencia_Tenis' });
}

function generarReporteFisico() {
  _generarReportePDF({ titulo:'Reporte de Asistencia Físico', tipo:'fisico', filename:'Asistencia_Fisico' });
}
