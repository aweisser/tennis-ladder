const DEFAULT_STATE = {
    ranking: [],
    challenges: [],
};
let selectedPlayer = null;
const STORAGE_KEY = "tennis-ladder-v1";

const elPyramid = document.getElementById('pyramid');
const elRanking = document.getElementById('ranking');
const elChallenges = document.getElementById('challenges');


function getRankingIdx(rowIdx, colIdx) {
  return (rowIdx * (rowIdx + 1)) / 2 + colIdx;
}

function getPyramidRowCol(rankingIdx) {
  const row = Math.floor((Math.sqrt(1 + 8 * rankingIdx) - 1) / 2);
  const col = rankingIdx - (row * (row + 1)) / 2;
  return { row, col };
}

function movePlayer(fromIndex, toIndex) {
  const [player] = state.ranking.splice(fromIndex, 1);
  state.ranking.splice(toIndex, 0, player);
}

function applyChallengeResult(challenge) {
  const winnerIdx = state.ranking.findIndex(p => p.name === challenge.result.winner);
  const looserIdx = state.ranking.findIndex(p => p.name === challenge.result.looser);
  if (winnerIdx > looserIdx) {
    movePlayer(winnerIdx, looserIdx);
  }
}

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_STATE; }
  catch { return DEFAULT_STATE; }
}

function saveState(state){ 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); 
}

function renderAll(){
  renderPyramid();
  renderRanking();
  renderChallenges();
}

function renderPyramid() {
  elPyramid.innerHTML = '';
  let latestRowIdx = -1;
  let level = null;
  state.ranking.forEach((player, rankIdx) => {
    const rowIdx = getPyramidRowCol(rankIdx).row;
    if (rowIdx != latestRowIdx) {
      latestRowIdx = rowIdx;
      level = newPyramidLevel(size=rowIdx+1);
      elPyramid.appendChild(level);
    }
    const card = newPlayerCard(player, rankIdx);
    level.appendChild(card);
  });
}

function renderRanking() {
  elRanking.innerHTML = '';
  state.ranking.forEach((player, rankIdx) => {
    const name = player ? player.name : null;
    const card = document.createElement('div');
    card.className = 'player'
    const label = document.createElement('span');
    label.innerHTML = name ? `<span class="gridlabel">${rankIdx + 1}. ${name}</span>` : `<span class="slot">${rankIdx + 1}. [frei]</span>`;
    card.appendChild(label);
    
    const actions = document.createElement('div');
    actions.className = 'actions';

    const up = document.createElement('button');
    up.textContent = '↑';
    up.title = "Spieler einen Platz nach vorne schieben";
    up.onclick = function (event) {
      state.ranking[rankIdx] = state.ranking[rankIdx-1];
      state.ranking[rankIdx-1] = player;
      saveState(state);
      renderAll();
      event.stopPropagation();
    };
    actions.appendChild(up);
  
    const down = document.createElement('button');
    down.textContent = '↓';
    down.title = "Spieler einen Platz nach hinten schieben";
    down.onclick = function (event) {
      state.ranking[rankIdx] = state.ranking[rankIdx+1];
      state.ranking[rankIdx+1] = player;
      saveState(state);
      renderAll();
      event.stopPropagation();
    };
    actions.appendChild(down);

    if (rankIdx == 0) {
      up.disabled = true;
    }
    if (rankIdx == state.ranking.length-1) {
      down.disabled = true;
    }

    if (name) {
      const rm = document.createElement('button');
      rm.textContent = '-';
      rm.title = 'Spieler entfernen';
      rm.onclick = function (event) {
        if (confirm(`Spieler "${name}" wirklich löschen?`)) {
          state.ranking.splice(rankIdx,1);
          state.ranking.push(null);
          saveState(state);
          renderAll();
        }
        event.stopPropagation();
      };
      actions.appendChild(rm);
    } else {
      const add = document.createElement('button');
      add.textContent = '+';
      add.title = "Spielernamen eintragen";
      add.onclick = function (event) {
        const val = prompt('Name für diesen Spieler:');
        if (val) {
          state.ranking[rankIdx] = {
            uid: crypto.randomUUID(),
            name: val.trim()
          };
          saveState(state);
          renderAll();
        }
        event.stopPropagation();
      };
      actions.appendChild(add);
    }
    card.appendChild(actions);
    elRanking.appendChild(card);
  });
}

function renderChallenges() {
  const tbody = document.getElementById('challenges-body');
  tbody.innerHTML = '';
  for (let i = state.challenges.length - 1; i >= 0; i--) {
    const challenge = state.challenges[i];
    const tr = document.createElement('tr');

    let date = new Date(challenge.requestDate);
    if (challenge.result) {
      date = new Date(challenge.result.matchDate);
    }
    const dateText = date.toLocaleString('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    // Challenger, Challengee and Date
    tr.innerHTML = `
    <td data-label="Datum"><time datetime="${date.toISOString()}">${dateText}</time></td>
      <td data-label="Challenger">${challenge.challenger}</td>
      <td data-label="Challengee">${challenge.challengee}</td>
    `;

    // Result
    const tdResult = document.createElement("td");
    if (challenge.result) {
      tdResult.innerHTML = `<td data-label="Result"><span class="badge done">${printableMatchResult(challenge.result)}</span></td>`
    } else {
      const resultBtn = document.createElement('button');
      resultBtn.textContent = 'Erfassen';
      resultBtn.onclick = function (event) {
          openMatchDialog({
            playerA: challenge.challenger,
            playerB: challenge.challengee,
            onSubmit: (result) => {
              // result = { playerA, playerB, matchDate, sets:[{a,b},{a,b},{a,b}], winner, looser }
              challenge.result = result;
              applyChallengeResult(challenge);
              saveState(state);
              renderAll();
            }
          });
          event.stopPropagation();

      };
      tdResult.appendChild(resultBtn);
    }
    tr.appendChild(tdResult);

     // Winner
    const tdWinner = document.createElement("td");
    if (challenge.result) {
      tdWinner.innerHTML = `<td data-label="Winner">${challenge.result.winner}</td>`
    } else {
      tdWinner.innerHTML = `<td data-label="Result"><span class="badge open">offen</span></td>`
    }
    tr.appendChild(tdWinner);

    // Actions
    const tdActions = document.createElement("td");
    const rmChallengeBtn = document.createElement('button');
    rmChallengeBtn.textContent = '-';
    rmChallengeBtn.onclick = function (event) {
      if (confirm(`Spiel zwischen "${challenge.challenger}" und "${challenge.challengee}" wirklich löschen?`)) {
        const idx = state.challenges.findIndex(c => c.uid === challenge.uid);
        if (idx !== -1) {
          state.challenges.splice(idx, 1);
          saveState(state);
          renderAll();
        }     
      }
      event.stopPropagation();
    };
    tdActions.appendChild(rmChallengeBtn);
    tr.appendChild(tdActions);

    // Append challenge
    tbody.appendChild(tr);
  }
}

function printableMatchResult(result) {
  // result = { playerA, playerB, matchDate, sets:[{a,b},{a,b},{a,b}], winner, looser }
  if (result && result.sets) {
    const s1 = result.sets[0];
    const s2 = result.sets[1];
    const tb = result.sets.length > 2 ? result.sets[2] : null;
    const setsPlain = [`${s1.a}:${s1.b}`, `${s2.a}:${s2.b}`];
    if(tb) setsPlain.push(`${tb.a}:${tb.b} (MTB)`);
    return `${setsPlain.join(', ')}`;
  } 
  return '';
}


function newPyramidLevel(size) {
  const level = document.createElement('section');
  level.className = 'level';
  level.dataset.size = size;
  level.setAttribute('aria-label', `Level ${size}`);
  return level;
}

function newPlayerCard(player, rankIdx) {
  const name = player ? player.name : null;
  const rowIdx = getPyramidRowCol(rankIdx).row;
  const colIdx = getPyramidRowCol(rankIdx).col;
  const card = document.createElement('div');
  card.className = 'player';
  card.dataset.level = rowIdx;
  card.dataset.rank = colIdx;
  card.dataset.name = name;
  card.dataset.uid = player ? player.uid : null;
  const label = document.createElement('span');
  label.innerHTML = name ? `<span class="gridlabel">${rankIdx+1}. ${name}</span>` : `<span class="slot">${rankIdx+1}. [frei]</span>`;
  card.onclick = () => {
    document.querySelectorAll(".playable").forEach(el => {
      el.classList.remove("playable");
    });
    document.querySelectorAll("button.challenge").forEach(btn => {
      btn.hidden = true;
    });
    if (card.classList.contains("selected")) {
      card.classList.remove("selected");
    } else {
      document.querySelectorAll(".selected").forEach(el => {
        el.classList.remove("selected");
      });
      card.classList.add("selected");

      selectedPlayer = {
        uid: card.dataset.uid,
        name: card.dataset.name
      }
      
      document.querySelectorAll(".player").forEach(el => {
        // same row left from the selected player is playable
        if (el.dataset.level == rowIdx && el.dataset.rank < colIdx) {
          el.classList.add("playable");
        }
        
        // everyone right above selected player is playable too
        if (el.dataset.level == rowIdx - 1 && el.dataset.rank >= colIdx) {
          el.classList.add("playable");
        }
        
        // A player with an open challenge is not playable.
        const challengeeHasOpenChallenge = state.challenges.some(c => 
            (c.challengeeUid === el.dataset.uid || c.challengerUid === el.dataset.uid)
            && c.result == null
        );
        if (challengeeHasOpenChallenge) {
          el.classList.remove("playable");
        }
        
        // A player is not playable if the challenger has an open challenge
        const challengerHasOpenChallenge = state.challenges.some(c => 
            (c.challengeeUid === selectedPlayer.uid || c.challengerUid === selectedPlayer.uid)
            && c.result == null
        );
        if (challengerHasOpenChallenge) {
          el.classList.remove("playable");
        }
        
      });
      
    }
    document.querySelectorAll(".playable").forEach(el => {
      el.querySelectorAll("button.challenge").forEach(btn => {
        btn.hidden = false;
      });
    });
  };
  card.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'actions';
  if (player) {
    const playBtn = document.createElement('button');
    playBtn.textContent = 'F';
    playBtn.title = 'Diesen Spieler fordern!';
    playBtn.className = 'challenge';
    playBtn.dataset.player = player.name;
    playBtn.dataset.playerUid = player.uid;
    playBtn.hidden = true;
    playBtn.onclick = function (event) {
      const challenge = {
        uid: crypto.randomUUID(),
        challenger: selectedPlayer.name,
        challengerUid: selectedPlayer.uid,
        challengee: playBtn.dataset.player,
        challengeeUid: playBtn.dataset.playerUid,
        requestDate: new Date(),
        result: null,
      };
      if (confirm(`Die Forderung von Spieler "${challenge.challenger}" gegen Spieler "${challenge.challengee}" eintragen?`)) {
        state.challenges.push(challenge);
        saveState(state);
        renderAll();
      }
      event.stopPropagation();
    };
    actions.appendChild(playBtn);
  } else {
    const add = document.createElement('button');
    add.textContent = '+';
    add.title = "Spielernamen eintragen";
    add.onclick = function (event) {
      const val = prompt('Name für diesen Spieler:');
      if (val) {
        state.ranking[rankIdx] = {
          uid: crypto.randomUUID(),
          name: val.trim()
        };
        saveState(state);
        renderAll();
      }
      event.stopPropagation();
    };
    actions.appendChild(add);
  }
  card.appendChild(actions);
  return card;
}

/* MAIN Loop */
let state = loadState()

/* Register onClick Events on Buttons */
document.getElementById('addLevelBtn').onclick = () => {
    const lowestRankIdx = state.ranking.length-1;
    const lowestLevelIdx = getPyramidRowCol(lowestRankIdx).row;
    const newLevelIdx = isNaN(lowestLevelIdx) ? 0 : lowestLevelIdx+1;
    const newLevelLenght = newLevelIdx+1;
    for (let i = 0; i < newLevelLenght; i++) {
      state.ranking.push(null)
    }
    saveState(state); 
    renderAll();
}

document.getElementById('delLevelBtn').onclick = () => {
  const lowestRankIdx = state.ranking.length-1;
  const lowestLevelIdx = getPyramidRowCol(lowestRankIdx).row;
  const lowestLevelLength = lowestLevelIdx+1;
  for (let i = 0; i < lowestLevelLength; i++) {
      state.ranking.pop();
  }
  saveState(state); 
  renderAll();
}

document.getElementById('resetRankingBtn').onclick = () => {
    if(confirm('Ranking wirklich löschen?')) {
        state.ranking = [];
        saveState(state); 
        renderAll();
    }
};

document.getElementById('resetChlBtn').onclick = () => {
    if(confirm('Alle Challenges löschen?')) {
        state.challenges = [];
        saveState(state);
        renderAll();
    }
};

/* Render dynamic elements */
renderAll();
