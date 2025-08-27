(() => {
  const $ = (s, r=document) => r.querySelector(s);

  // Public API
  window.openMatchDialog = function({ playerA, playerB, onSubmit }){
    $('#matchNameA').textContent =
    $('#matchNA1').textContent =
    $('#matchNA2').textContent =
    $('#matchNA3').textContent = playerA;

    $('#matchNameB').textContent =
    $('#matchNB1').textContent =
    $('#matchNB2').textContent =
    $('#matchNB3').textContent = playerB;

    // Empty Inputs
    ['matchS1A','matchS1B','matchS2A','matchS2B','matchTBA','matchTBB'].forEach(id => $('#'+id).value = '');
    $('#matchTBWrap').hidden = true;
    $('#matchSummary').textContent = 'Bitte Ergebnisse eintragen…';
    $('#matchSummary').classList.remove('match-ok','match-err');
    $('#matchDlgSave').disabled = true;

    const dateEl = $('#matchDate');
    dateEl.valueAsDate = new Date();

    const modal = $('#matchModal');
    modal.hidden = false; 
    modal.setAttribute('aria-hidden','false');

    const onSave = () => {
      const res = collect();
      if(!res.valid) return;
      close();
      onSubmit && onSubmit(res.payload);
    };

    // Events (open)
    $('#matchDlgSave').addEventListener('click', onSave, { once:true });
    $('#matchDlgClose').onclick = close;
    $('#matchDlgCancel').onclick = close;
    document.addEventListener('keydown', escClose);

    ['matchS1A','matchS1B','matchS2A','matchS2B','matchTBA','matchTBB']
      .forEach(id => $('#'+id).addEventListener('input', recalc));

    recalc();

    // --- intern ---
    function close(){
      modal.hidden = true; modal.setAttribute('aria-hidden','true');
      document.removeEventListener('keydown', escClose);
    }
    function escClose(e){ if(e.key === 'Escape') close(); }

    function recalc(){
      const s1 = getPair('matchS1A','matchS1B');
      const s2 = getPair('matchS2A','matchS2B');

      const v1 = validateSet(s1.a, s1.b);
      const v2 = validateSet(s2.a, s2.b);

      paintSet($('#matchS1Msg').parentElement, $('#matchS1Msg'), v1);
      paintSet($('#matchS2Msg').parentElement, $('#matchS2Msg'), v2);

      let setsA = 0, setsB = 0;
      if(v1.valid){ v1.winner==='A' ? setsA++ : setsB++; }
      if(v2.valid){ v2.winner==='A' ? setsA++ : setsB++; }

      const needTB = v1.valid && v2.valid && setsA===1 && setsB===1;
      $('#matchTBWrap').hidden = !needTB;

      let tb=null, vtb={ valid:false };
      if(needTB){
        tb = getPair('matchTBA','matchTBB');
        vtb = validateMatchTB(tb.a, tb.b);
        paintSet($('#matchTBWrap'), $('#matchTBMsg'), vtb);
      } else {
        // TB reset
        $('#matchTBA').value=''; $('#matchTBB').value=''; $('#matchTBMsg').textContent='';
        $('#matchTBWrap').classList.remove('match-ok','match-err');
      }

      let winner = null;
      if(v1.valid && v2.valid){
        if(setsA===2) winner='A';
        else if(setsB===2) winner='B';
        else if(needTB && vtb.valid) winner = vtb.winner;
      }

      const summary = $('#matchSummary');
      let canSave = false;
      if(winner){
        const score = printableScore(playerA, playerB, s1, s2, needTB ? getPair('matchTBA','matchTBB') : null);
        summary.textContent = `Gewinner: ${winner==='A'?playerA:playerB} • Ergebnis: ${score}`;
        summary.classList.remove('match-err'); summary.classList.add('match-ok');
        canSave = true;
      } else {
        summary.textContent = 'Ergebnisse prüfen…';
        summary.classList.remove('match-ok'); summary.classList.add('match-err');
      }
      $('#matchDlgSave').disabled = !canSave;
    }

    function collect(){
        const s1 = getPair('matchS1A','matchS1B');
        const s2 = getPair('matchS2A','matchS2B');
        const v1 = validateSet(s1.a, s1.b);
        const v2 = validateSet(s2.a, s2.b);

        let setsA=0, setsB=0;
        if(v1.valid) (v1.winner==='A'?setsA++:setsB++);
        if(v2.valid) (v2.winner==='A'?setsA++:setsB++);

        const needTB = v1.valid && v2.valid && setsA===1 && setsB===1;

        let tb = null, vtb = { valid:false };
        if (needTB) {
            tb = getPair('matchTBA','matchTBB');
            vtb = validateMatchTB(tb.a, tb.b);
        }

        const valid = v1.valid && v2.valid && (!needTB || vtb.valid);
        if(!valid) return { valid:false };

        let winner;
        if(setsA===2) winner='A';
        else if(setsB===2) winner='B';
        else winner = vtb.winner; // Winner from MTB

        const sets = [
            { a: s1.a, b: s1.b },
            { a: s2.a, b: s2.b },
        ];
        if (needTB && vtb.valid) {
            sets.push({ a: tb.a, b: tb.b });
        }

        const d = document.getElementById('matchDate').value;
        const matchDate = d && /^\d{4}-\d{2}-\d{2}$/.test(d)
            ? d
            : new Date().toISOString().slice(0,10);

        const payload = {
            playerA, playerB,
            matchDate,
            sets, // MTB is coded as 3rd set
            winner: winner==='A' ? playerA : playerB,
            looser: winner==='B' ? playerA : playerB,
        };

        return { valid:true, payload };
    }

  };

  // --- Helper-Functions (privat) ---
  function getPair(aId,bId){
    const a = Number(document.getElementById(aId).value);
    const b = Number(document.getElementById(bId).value);
    return { a, b };
  }

  function validateSet(a,b){
    if(Number.isNaN(a) || Number.isNaN(b))
      return { valid:false, reason:'Bitte beide Werte eingeben.' };
    const max = Math.max(a,b), min = Math.min(a,b), diff = Math.abs(a-b);
    if(max < 6) return { valid:false, reason:'Satz endet i. d. R. bei 6, 7:5 oder 7:6.' };
    if(max === 6){
      if(diff >= 2 && min <= 4) return { valid:true, winner: a>b ? 'A':'B' };
      return { valid:false, reason:'Bei 6 muss der Abstand ≥2 sein (z. B. 6:4).' };
    }
    if(max === 7){
      if(min === 5 || min === 6) return { valid:true, winner: a>b ? 'A':'B' };
      return { valid:false, reason:'7 ist nur mit 7:5 oder 7:6 gültig.' };
    }
    return { valid:false, reason:'Ungültiger Satz-Score.' };
  }

  function validateMatchTB(a,b){
    if(Number.isNaN(a) || Number.isNaN(b))
      return { valid:false, reason:'Bitte beide TB-Werte eingeben.' };
    const max = Math.max(a,b), diff = Math.abs(a-b);
    if(max >= 10 && diff >= 2) return { valid:true, winner: a>b ? 'A':'B' };
    return { valid:false, reason:'Tiebreak bis mind. 10 mit 2 Punkten Abstand.' };
  }

  function paintSet(fieldset, msgEl, v){
    fieldset.classList.remove('match-ok','match-err');
    if(v.valid){ fieldset.classList.add('match-ok'); msgEl.textContent = 'OK'; }
    else { fieldset.classList.add('match-err'); msgEl.textContent = v.reason || 'Ungültig'; }
  }

  function printableScore(aName,bName, s1, s2, tb){
    const sets = [`${s1.a}:${s1.b}`, `${s2.a}:${s2.b}`];
    if(tb) sets.push(`${tb.a}:${tb.b} (MTB)`);
    return `${aName} vs. ${bName} – ${sets.join(', ')}`;
  }
})();
