const DEFAULT_STATE = {
    ranking: [],
    challenges: [],
};
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
  const winnerIdx = state.ranking.indexOf(challenge.winner);
  const looserIdx = state.ranking.indexOf(challenge.looser);
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
  renderChallengesTable();
}

function renderPyramid() {
  elPyramid.innerHTML = '';
  let latestRowIdx = -1;
  let level = null;
  state.ranking.forEach((name, rankIdx) => {
    const rowIdx = getPyramidRowCol(rankIdx).row;
    if (rowIdx != latestRowIdx) {
      latestRowIdx = rowIdx;
      level = newPyramidLevel(size=rowIdx+1);
      elPyramid.appendChild(level);
    }
    const card = newPlayerCard(name, rankIdx);
    level.appendChild(card);
  });
}

function renderRanking() {
  elRanking.innerHTML = '';
  state.ranking.forEach((name, rankIdx) => {
    const pyramidRowCol = getPyramidRowCol(rankIdx);

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
      state.ranking[rankIdx-1] = name;
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
      state.ranking[rankIdx+1] = name;
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
          const pname = val.trim();
          state.ranking[rankIdx] = pname;
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

function renderChallengesTable() {
  const tbody = document.getElementById('challenges-body');
  tbody.innerHTML = '';
  for (let i = state.challenges.length - 1; i >= 0; i--) {
    const challenge = state.challenges[i];
    const tr = document.createElement('tr');

    const status = challenge.status ?? (challenge.winner ? 'done' : 'open');
    const date = new Date(challenge.requestDate);
    const dateText = date.toLocaleString('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    tr.innerHTML = `
      <td data-label="Challenger">${challenge.challenger}</td>
      <td data-label="Challengee">${challenge.challengee}</td>
      <td data-label="Datum"><time datetime="${date.toISOString()}">${dateText}</time></td>
      <td data-label="Status"><span class="badge ${status}">${status}</span></td>
    `;
    
    const tdWinner = document.createElement("td");
    if (challenge.winner) {
      tdWinner.innerHTML = `<td data-label="Winner">${challenge.winner}</td>`
    } else {
      const resultBtn = document.createElement('button');
      resultBtn.textContent = 'Ergebnis';
      resultBtn.onclick = function (event) {
        const val = prompt('Wer hat gewonnen?');
        if (val) {
          if (val == challenge.challenger) {
            challenge.winner = challenge.challenger;
            challenge.looser = challenge.challengee;
          }
          if (val == challenge.challengee) {
            challenge.winner = challenge.challengee;
            challenge.looser = challenge.challenger;
          }
          applyChallengeResult(challenge);
          saveState(state);
          renderAll();
        }
        event.stopPropagation();
      };
      tdWinner.appendChild(resultBtn);
    }
    tr.appendChild(tdWinner);
    tbody.appendChild(tr);
  }
}


function newPyramidLevel(size) {
  const level = document.createElement('section');
  level.className = 'level';
  level.dataset.size = size;
  level.setAttribute('aria-label', `Level ${size}`);
  return level;
}

function newPlayerCard(name, rankIdx) {
  const rowIdx = getPyramidRowCol(rankIdx).row;
  const colIdx = getPyramidRowCol(rankIdx).col;
  const card = document.createElement('div');
  card.className = 'player';
  card.dataset.level = rowIdx;
  card.dataset.rank = colIdx;
  card.dataset.name = name;
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
      document.querySelectorAll(".player").forEach(el => {
        // same row left from the selected player is playable
        if (el.dataset.level == rowIdx && el.dataset.rank < colIdx) {
          el.classList.add("playable");
        }
        // everyone right above selected player is playable too
        if (el.dataset.level == rowIdx - 1 && el.dataset.rank >= colIdx) {
          el.classList.add("playable");
        }
      });
      state.player = card.dataset.name;
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
  if (name) {
    const playBtn = document.createElement('button');
    playBtn.textContent = 'F';
    playBtn.title = 'Diesen Spieler fordern!';
    playBtn.className = 'challenge';
    playBtn.dataset.player = name;
    playBtn.hidden = true;
    playBtn.onclick = function (event) {
      const challenge = {
        challenger: state.player,
        challengee: playBtn.dataset.player,
        requestDate: new Date(),
        winner: null,
        looser: null,
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
        const pname = val.trim();
        state.ranking[rankIdx] = pname;
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
