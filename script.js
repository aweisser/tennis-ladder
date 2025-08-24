const DEFAULT_STATE = {
    levels: [[null],[null,null],[null,null,null],[null,null,null,null]],
    ranking: [],
    challanges: [],
};
const STORAGE_KEY = "tennis-ladder-v1";

const elPyramid = document.getElementById('pyramid');
const elRanking = document.getElementById('ranking');
const elChallanges = document.getElementById('challanges');


function getRankingIdx(row, col) {
  return (row * (row + 1)) / 2 + col;
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
  renderChallanges();
}

function renderPyramid() {
  elPyramid.innerHTML = '';
  state.levels.forEach((row, rowIdx) => {
    const level = document.createElement('section');
    level.className = 'level';
    level.dataset.size = row.length;
    level.setAttribute('aria-label', `Level ${rowIdx + 1}`);
    elPyramid.appendChild(level);

    row.forEach((name, colIdx) => {
      const card = document.createElement('div');
      card.className = 'player';
      card.dataset.level = rowIdx;
      card.dataset.rank = colIdx;
      card.dataset.name = name;
      const label = document.createElement('span');
      label.innerHTML = name ? `<span class="gridlabel">${name}</span>` : `<span class="slot">[frei]</span>`;
      card.onclick = () => {
        document.querySelectorAll(".playable").forEach(el => {
          el.classList.remove("playable");
        });
        document.querySelectorAll("button.challange").forEach(btn => {
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
          el.querySelectorAll("button.challange").forEach(btn => {
            btn.hidden = false;
          });
        });
      };
      card.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'actions';
      if (name) {
        /*const upBtn = document.createElement('button');
        upBtn.textContent = '↑';
        upBtn.title = 'Platz mit direktem Vordermann tauschen (vereinfachte Regel)';
        upBtn.onclick = () => {
          if(colIdx > 0){
            [state.levels[rowIdx][colIdx-1], state.levels[rowIdx][colIdx]] = [state.levels[rowIdx][colIdx], state.levels[rowIdx][colIdx-1]];
          } else if (rowIdx > 0 && levels[rowIdx-1][levels[rowIdx-1].length-1] !== null) {
            [state.levels[rowIdx-1][state.levels[rowIdx-1].length-1], state.levels[rowIdx][colIdx]] = [state.levels[rowIdx][colIdx], state.levels[rowIdx-1][levels[rowIdx-1].length-1]];
          }
          saveState(state); render();
        };
        actions.appendChild(upBtn);
        */
        const playBtn = document.createElement('button');
        playBtn.textContent = 'F';
        playBtn.title = 'Diesen Spieler fordern!';
        playBtn.className = 'challange';
        playBtn.dataset.player = name;
        playBtn.hidden = true;
        playBtn.onclick = function (event) {
          const challange = {
            challanger: state.player,
            challangee: playBtn.dataset.player,
            requestDate: new Date(),
            winner: null,
          };
          if (confirm(`Die Forderung von Spieler "${challange.challanger}" gegen Spieler "${challange.challangee}" eintragen?`)) {
            state.challanges.push(challange);
            saveState(state);
            renderAll();
          }
          event.stopPropagation();
        };
        actions.appendChild(playBtn);

        const rm = document.createElement('button');
        rm.textContent = '-';
        rm.title = 'Spielernamen entfernen';
        rm.onclick = function (event) {
          if (confirm(`Spieler "${name}" wirklich löschen?`)) {
            state.levels[rowIdx][colIdx] = null;
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
            state.levels[rowIdx][colIdx] = pname;
            state.ranking[getRankingIdx(rowIdx, colIdx)] = pname;
            saveState(state);
            renderAll();
          }
          event.stopPropagation();
        };
        actions.appendChild(add);
      }
      card.appendChild(actions);
      level.appendChild(card);
    });
  });
}

function renderRanking() {
  elRanking.innerHTML = '';
  state.ranking.forEach((name, rankIdx) => {
    const elRank = document.createElement('pre');
    elRank.innerHTML = `${rankIdx + 1}. ${name}`;
    elRanking.appendChild(elRank);
  });
}

function renderChallanges() {
  elChallanges.innerHTML = '';
  state.challanges.forEach((challange, _) => {
    const elChl = document.createElement('div');

    const elChlDetails = document.createElement('pre');
    elChlDetails.innerText = JSON.stringify(challange);
    elChl.appendChild(elChlDetails);

    const elChlEditBtn = document.createElement('button');
    elChlEditBtn.textContent = 'Ergebnis';
    elChlEditBtn.onclick = function (event) {
      const val = prompt('Wer hat gewonnen?');
      if (val) {
        challange.winner = val;
        saveState(state);
        renderAll();
      }
      event.stopPropagation();
    };
    elChl.appendChild(elChlEditBtn);

    elChallanges.appendChild(elChl);
  });
}


/* MAIN Loop */
let state = loadState()

/* Register onClick Events on Buttons */
document.getElementById('addLevelBtn').onclick = () => {
    const newLevel = new Array(state.levels.length+1).fill(null);
    state.levels.push(newLevel);
    saveState(state); 
    renderAll();
}

document.getElementById('delLevelBtn').onclick = () => {
    state.levels.pop();
    saveState(state); 
    renderAll();
}

document.getElementById('resetAllBtn').onclick = () => {
    if(confirm('Wirklich alles löschen?')) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState(state); 
        renderAll();
    }
};

document.getElementById('resetChlBtn').onclick = () => {
    if(confirm('Alle Challanges löschen?')) {
        state.challanges = [];
        saveState(state);
        renderAll();
    }
};

/* Render dynamic elements */
renderAll();
