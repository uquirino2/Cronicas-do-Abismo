// ============================================================================
// CRÔNICAS DO ABISMO 8-BIT — Controlador de Interface, Inventário, Forja & HUD
// ============================================================================

window.Game8Bit = window.Game8Bit || {};

(function (G) {
  'use strict';

  const P = G.PAL;

  const UI = {
    game: null,
    selectedClass: 'knight',
    selectedDiff: 'normal',
    activeModal: null,
    selectedInvIdx: 0,
    blessingChoices: [],
    blessingCallback: null,
    blessingTitle: 'BÊNÇÃO ANCESTRAL',
    codexTab: 'chemistry',
    dirty: true,
    _lastHudTick: 0,

    init(game) {
      this.game = game;
      this._applyVisualSettings();
      this._bindTitleEvents();
      this._bindHudEvents();
      this._renderTitleScreen();
    },

    _applyVisualSettings() {
      const s = this.game.meta.settings;
      const stage = document.getElementById('canvas-stage');
      if (stage) {
        stage.classList.toggle('crt-on', !!s.crt);
        stage.classList.toggle('grid-on', !!s.pixelGrid);
      }
      const touchEl = document.getElementById('touch-controls');
      if (touchEl) touchEl.classList.toggle('hidden', !s.touch);
    },

    _bindTitleEvents() {
      document.getElementById('btn-start-run').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        const seedVal = document.getElementById('input-seed').value.trim();
        this.game.startNewRun(this.selectedClass, this.selectedDiff, seedVal);
      });

      document.getElementById('btn-continue-run').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        if (!this.game.loadActiveRun()) {
          this._renderTitleScreen();
        }
      });

      document.getElementById('btn-rand-seed').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiMove');
        document.getElementById('input-seed').value = G.randomSeedString();
      });

      document.getElementById('btn-open-altar').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        this.openModal('altar');
      });

      document.getElementById('btn-open-codex-title').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        this.openModal('codex');
      });
    },

    _bindHudEvents() {
      document.getElementById('btn-hud-inv').addEventListener('click', () => this.toggleModal('inventory'));
      document.getElementById('btn-hud-codex').addEventListener('click', () => this.toggleModal('codex'));
      document.getElementById('btn-hud-pause').addEventListener('click', () => this.togglePause());
      document.getElementById('btn-hud-mute').addEventListener('click', () => {
        const s = this.game.meta.settings;
        s.muted = !s.muted;
        G.AudioEngine.setSettings(s);
        this.game.saveMeta();
        this._updateMuteBtn();
      });

      document.getElementById('modal-close-btn').addEventListener('click', () => this.closeAllModals());

      // Hotbar cliques rápidos
      [1, 2, 3, 4].forEach(slotNum => {
        const el = document.getElementById(`hotbar-${slotNum}`);
        if (!el) return;
        el.addEventListener('click', () => {
          if (this.game.state !== 'playing') return;
          if (slotNum === 1) this.game.useConsumable('cons_hp_pot');
          else if (slotNum === 2) this.game.useConsumable('cons_mp_pot');
          else if (slotNum === 3) this.game.useConsumable('cons_elixir');
          else if (slotNum === 4) {
            const idx = this.game.player.inventory.findIndex(it => it.slot === 'consumable' && it.spell);
            if (idx !== -1) this.game.useConsumable(idx);
          }
        });
      });

      // Skill & Bomb botões na hotbar
      const skillBtn = document.getElementById('hotbar-skill');
      if (skillBtn) skillBtn.addEventListener('click', () => this.game.state === 'playing' && G.Combat.triggerSkill(this.game));
      const bombBtn = document.getElementById('hotbar-bomb');
      if (bombBtn) bombBtn.addEventListener('click', () => this.game.state === 'playing' && G.Combat.placeBomb(this.game));

      // Controles Touch D-Pad
      document.querySelectorAll('[data-touch-dir]').forEach(btn => {
        const dir = btn.getAttribute('data-touch-dir');
        const setDir = (on) => {
          const t = this.game.touchMove;
          if (dir === 'up') t.y = on ? -1 : 0;
          if (dir === 'down') t.y = on ? 1 : 0;
          if (dir === 'left') t.x = on ? -1 : 0;
          if (dir === 'right') t.x = on ? 1 : 0;
        };
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); setDir(true); });
        btn.addEventListener('pointerup', () => setDir(false));
        btn.addEventListener('pointerleave', () => setDir(false));
      });

      document.querySelectorAll('[data-touch-act]').forEach(btn => {
        const act = btn.getAttribute('data-touch-act');
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          G.AudioEngine.unlock();
          if (this.game.state !== 'playing') return;
          if (act === 'atk') G.Combat.triggerAttack(this.game);
          else if (act === 'dash') G.Combat.triggerDash(this.game);
          else if (act === 'parry') G.Combat.triggerBlockStart(this.game);
          else if (act === 'skill') G.Combat.triggerSkill(this.game);
          else if (act === 'bomb') G.Combat.placeBomb(this.game);
          else if (act === 'use') this.game.interact();
        });
        btn.addEventListener('pointerup', () => {
          if (act === 'parry') G.Combat.triggerBlockEnd(this.game);
        });
      });
    },

    _renderTitleScreen() {
      document.getElementById('screen-title').classList.remove('hidden');
      document.getElementById('screen-game').classList.add('hidden');
      document.getElementById('title-souls-count').textContent = this.game.meta.souls;
      document.getElementById('title-best-floor').textContent = this.game.meta.bestFloor;
      document.getElementById('title-wins').textContent = this.game.meta.wins;

      const contBtn = document.getElementById('btn-continue-run');
      contBtn.classList.toggle('hidden', !this.game.hasSavedRun());

      const seedInput = document.getElementById('input-seed');
      if (!seedInput.value) seedInput.value = G.randomSeedString();

      // Cartões de Classe
      const classGrid = document.getElementById('class-cards');
      classGrid.innerHTML = '';
      for (const cls of Object.values(G.GameData.CLASSES)) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pixel-card class-card' + (this.selectedClass === cls.id ? ' selected' : '');
        const iconUrl = G.SpriteBank.getIcon(cls.spritePrefix + '_0');
        card.innerHTML = `
          <div class="class-head">
            <img src="${iconUrl}" class="pixel-icon-lg" alt="${cls.name}">
            <div>
              <div class="card-title">${cls.name}</div>
              <div class="card-sub">${cls.title}</div>
            </div>
          </div>
          <p class="card-desc">${cls.desc}</p>
          <div class="stat-chips">
            <span>HP ${cls.stats.maxHp}</span>
            <span>MP ${cls.stats.maxMp}</span>
            <span>ATQ ${cls.stats.atk}</span>
            <span>MAG ${cls.stats.mag}</span>
            <span>VEL ${cls.stats.speed}</span>
          </div>
          <div class="skill-pill">Habilidade: <b>${cls.skill.name}</b> — ${cls.skill.desc}</div>
        `;
        card.addEventListener('click', () => {
          G.AudioEngine.unlock();
          G.AudioEngine.playSFX('uiMove');
          this.selectedClass = cls.id;
          this._renderTitleScreen();
        });
        classGrid.appendChild(card);
      }

      // Cartões de Dificuldade
      const diffGrid = document.getElementById('diff-cards');
      diffGrid.innerHTML = '';
      for (const diff of Object.values(G.GameData.DIFFICULTIES)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pixel-btn-choice' + (this.selectedDiff === diff.id ? ' selected' : '');
        btn.innerHTML = `<b>${diff.name}</b><small>${diff.desc}</small>`;
        btn.addEventListener('click', () => {
          G.AudioEngine.unlock();
          G.AudioEngine.playSFX('uiMove');
          this.selectedDiff = diff.id;
          this._renderTitleScreen();
        });
        diffGrid.appendChild(btn);
      }
    },

    onRunStart() {
      document.getElementById('screen-title').classList.add('hidden');
      document.getElementById('screen-game').classList.remove('hidden');
      this.closeAllModals();
      this._updateMuteBtn();
      this.dirty = true;
      this.updateHUD(true);
    },

    _updateMuteBtn() {
      const btn = document.getElementById('btn-hud-mute');
      if (btn) btn.textContent = this.game.meta.settings.muted ? 'SOM: OFF' : 'SOM: ON';
    },

    updateHUD(force = false) {
      const p = this.game.player;
      if (!p) return;
      const now = performance.now();
      if (!force && !this.dirty && now - this._lastHudTick < 80) return;
      this._lastHudTick = now;
      this.dirty = false;

      const maxHp = p.getMaxHp();
      const maxMp = p.getMaxMp();
      const maxSt = p.getMaxStamina();

      document.getElementById('hud-hero-icon').src = G.SpriteBank.getIcon(p.classDef.spritePrefix + '_0');
      document.getElementById('hud-hero-lvl').textContent = `Nv.${p.level}`;
      document.getElementById('hud-floor').textContent = `Andar ${this.game.floor} — ${this.game.currentRoom.biome.name}`;

      document.getElementById('hud-hp-text').textContent = `${Math.ceil(p.hp)}/${maxHp}`;
      document.getElementById('hud-hp-fill').style.width = `${Math.max(0, Math.min(100, (p.hp / maxHp) * 100))}%`;

      document.getElementById('hud-mp-text').textContent = `${Math.floor(p.mp)}/${maxMp}`;
      document.getElementById('hud-mp-fill').style.width = `${Math.max(0, Math.min(100, (p.mp / maxMp) * 100))}%`;

      document.getElementById('hud-stam-fill').style.width = `${Math.max(0, Math.min(100, (p.stamina / maxSt) * 100))}%`;
      document.getElementById('hud-xp-fill').style.width = `${Math.min(100, (p.xp / p.xpNext) * 100)}%`;

      document.getElementById('hud-gold').textContent = p.gold;
      document.getElementById('hud-keys').textContent = p.keys;
      document.getElementById('hud-bombs').textContent = p.bombs;
      document.getElementById('hud-bosskey').classList.toggle('hidden', !p.hasBossKey);

      // Hotbar
      const countOf = (id) => p.inventory.filter(it => it.id === id).reduce((s, it) => s + (it.qty || 1), 0);
      document.getElementById('hb-1-cnt').textContent = countOf('cons_hp_pot');
      document.getElementById('hb-2-cnt').textContent = countOf('cons_mp_pot');
      document.getElementById('hb-3-cnt').textContent = countOf('cons_elixir');
      const scrollCnt = p.inventory.filter(it => it.slot === 'consumable' && it.spell).reduce((s, it) => s + (it.qty || 1), 0);
      document.getElementById('hb-4-cnt').textContent = scrollCnt;

      const w = p.equip.weapon;
      const wElem = w ? G.ELEMENT_META[w.element] : G.ELEMENT_META.physical;
      document.getElementById('hb-weapon-icon').src = G.SpriteBank.getIcon(w ? w.icon : 'item_sword');
      document.getElementById('hb-weapon-name').textContent = (w ? w.name : 'Punhos') + (w && w.upgrade ? ` +${w.upgrade}` : '');
      document.getElementById('hb-weapon-elem').textContent = wElem.name;
      document.getElementById('hb-weapon-elem').style.color = wElem.color;

      const skEl = document.getElementById('hb-skill-cd');
      skEl.textContent = p.skillCd > 0 ? `${p.skillCd.toFixed(1)}s` : `${p.classDef.skill.cost} MP`;
      document.getElementById('hb-bomb-cnt').textContent = p.bombs;

      this._renderMinimap();
    },

    _renderMinimap() {
      const cv = document.getElementById('minimap-canvas');
      if (!cv || !this.game.dungeon) return;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = P.black;
      ctx.fillRect(0, 0, cv.width, cv.height);

      const rooms = this.game.dungeon.rooms;
      const cellW = 14;
      const cellH = 10;
      const cur = this.game.currentRoom;

      for (const r of Object.values(rooms)) {
        if (!r.revealed && !r.visited) continue;
        if (r.type === 'secret' && !r.revealed) continue;

        const rx = r.gx * 16 + 4;
        const ry = r.gy * 12 + 4;

        // Conexões
        ctx.fillStyle = P.gray;
        for (const [dk, nb] of Object.entries(r.neighbors)) {
          if (nb.lock === 'secret' && !rooms[nb.roomId]?.revealed) continue;
          if (dk === 'E') ctx.fillRect(rx + cellW, ry + 4, 2, 2);
          if (dk === 'S') ctx.fillRect(rx + 6, ry + cellH, 2, 2);
        }

        let fill = r.visited ? '#343854' : '#1b1d2c';
        if (r.id === cur.id) fill = P.cyan;
        else if (r.type === 'boss') fill = P.darkRed;
        else if (r.type === 'shop') fill = P.ochre;
        else if (r.type === 'forge') fill = P.blue;
        else if (r.type === 'treasure') fill = P.gold;
        else if (r.type === 'shrine') fill = P.purple;
        else if (r.type === 'secret') fill = P.violet;

        ctx.fillStyle = fill;
        ctx.fillRect(rx, ry, cellW, cellH);
        ctx.strokeStyle = r.id === cur.id ? P.white : P.lightGray;
        ctx.strokeRect(rx + 0.5, ry + 0.5, cellW - 1, cellH - 1);

        // Símbolo marcador
        let sym = '';
        let col = P.white;
        if (r.type === 'boss') { sym = 'X'; col = P.red; }
        else if (r.type === 'shop') { sym = '$'; col = P.yellow; }
        else if (r.type === 'forge') { sym = 'F'; col = P.cyan; }
        else if (r.type === 'treasure') { sym = 'T'; col = P.gold; }
        else if (r.type === 'shrine') { sym = 'S'; col = P.violet; }
        else if (r.hasBossKey && !this.game.player.hasBossKey && !r.cleared) { sym = 'K'; col = P.gold; }
        if (sym) G.drawPixelText(ctx, sym, rx + 7, ry + 3, col, P.black, 'center', 1);
      }
    },

    // ========================================================================
    // MODAIS INTERATIVOS
    // ========================================================================
    toggleModal(name) {
      if (this.activeModal === name) this.closeAllModals();
      else this.openModal(name);
    },

    togglePause() {
      if (this.activeModal) {
        if (['blessing', 'gameover', 'victory'].includes(this.activeModal)) return;
        this.closeAllModals();
      } else if (this.game.state === 'playing') {
        this.openModal('pause');
      }
    },

    openModal(name) {
      this.activeModal = name;
      if (this.game.state === 'playing') this.game.state = 'modal';
      const overlay = document.getElementById('modal-overlay');
      const closeBtn = document.getElementById('modal-close-btn');
      overlay.classList.remove('hidden');
      closeBtn.classList.toggle('hidden', name === 'blessing' || name === 'gameover' || name === 'victory');

      const titleEl = document.getElementById('modal-title');
      const bodyEl = document.getElementById('modal-body');

      if (name === 'inventory') {
        titleEl.textContent = 'MOCHILA, EQUIPAMENTO & ATRIBUTOS';
        this._renderInventoryModal(bodyEl);
      } else if (name === 'forge') {
        titleEl.textContent = 'FORJA RÚNICA & ALQUIMIA';
        this._renderForgeModal(bodyEl);
      } else if (name === 'shop') {
        titleEl.textContent = 'MERCADOR DA MASMORRA';
        this._renderShopModal(bodyEl);
      } else if (name === 'codex') {
        titleEl.textContent = 'CÓDICE, QUÍMICA ELEMENTAL & BESTIÁRIO';
        this._renderCodexModal(bodyEl);
      } else if (name === 'altar') {
        titleEl.textContent = 'ALTAR DAS ALMAS ANCESTRAIS';
        this._renderAltarModal(bodyEl);
      } else if (name === 'pause') {
        titleEl.textContent = 'PAUSA & CONFIGURAÇÕES';
        this._renderPauseModal(bodyEl);
      }
    },

    closeAllModals() {
      document.getElementById('modal-overlay').classList.add('hidden');
      this.activeModal = null;
      if (this.game.state === 'modal') this.game.state = 'playing';
      this.dirty = true;
    },

    // --- INVENTÁRIO ---
    _renderInventoryModal(root) {
      const p = this.game.player;
      if (!p) return;

      const slots = [
        { key: 'weapon', label: 'Arma' },
        { key: 'armor', label: 'Armadura' },
        { key: 'relic1', label: 'Relíquia I' },
        { key: 'relic2', label: 'Relíquia II' }
      ];

      const shardsHtml = Object.values(G.GameData.SHARDS).map(s => `
        <div class="shard-pill" style="border-color:${s.color}">
          <img src="${G.SpriteBank.getIcon(s.icon)}" class="pixel-icon-sm">
          <span>${p.shards[s.element] || 0}</span>
        </div>
      `).join('');

      const eqHtml = slots.map(sl => {
        const it = p.equip[sl.key];
        const col = it ? (it.rarityColor || '#a4a2b8') : '#5c5a6e';
        const up = it && it.upgrade ? ` +${it.upgrade}` : '';
        return `
          <div class="equip-slot" style="border-color:${col}">
            <span class="eq-label">${sl.label}</span>
            ${it ? `<img src="${G.SpriteBank.getIcon(it.icon)}" class="pixel-icon-md">
              <div class="eq-info">
                <b style="color:${col}">${it.name}${up}</b>
                <small>${this._itemSummary(it)}</small>
              </div>` : `<div class="eq-empty">Vazio</div>`}
          </div>`;
      }).join('');

      const invGridHtml = p.inventory.map((it, idx) => {
        const sel = idx === this.selectedInvIdx ? ' selected' : '';
        const col = it.rarityColor || '#5c5a6e';
        return `
          <button type="button" class="inv-cell${sel}" data-inv-idx="${idx}" style="border-color:${col}" title="${it.name}">
            <img src="${G.SpriteBank.getIcon(it.icon)}" class="pixel-icon-md">
            ${it.qty > 1 ? `<span class="inv-qty">${it.qty}</span>` : ''}
            ${it.upgrade ? `<span class="inv-up">+${it.upgrade}</span>` : ''}
          </button>`;
      }).join('');

      const selItem = p.inventory[this.selectedInvIdx] || null;
      const inspectorHtml = selItem ? this._renderItemInspector(selItem, p) : '<div class="muted">Selecione um item da mochila para inspecionar.</div>';

      const blessHtml = p.blessings.length
        ? p.blessings.map(b => `<span class="bless-tag" title="${b.desc}">${b.name}</span>`).join('')
        : '<span class="muted">Nenhuma bênção ativa ainda.</span>';

      root.innerHTML = `
        <div class="modal-two-col">
          <div class="panel-box">
            <h4>ATRIBUTOS DO HERÓI (Nv.${p.level})</h4>
            <div class="stats-table">
              <div>ATQ Físico: <b>${p.getAtk()}</b></div>
              <div>Poder Mágico: <b>${p.getMag()}</b></div>
              <div>Defesa: <b>${p.getDef()}</b></div>
              <div>Velocidade: <b>${p.getSpeed()}</b></div>
              <div>Crítico: <b>${Math.round(p.getCritChance() * 100)}%</b></div>
              <div>Roubo Vida: <b>${Math.round(p.getLifesteal() * 100)}%</b></div>
            </div>
            <h4>EQUIPAMENTO ATUAL</h4>
            <div class="equip-list">${eqHtml}</div>
            <h4>FRAGMENTOS ELEMENTAIS</h4>
            <div class="shard-row">${shardsHtml}</div>
            <h4>BÊNÇÃOS (${p.blessings.length})</h4>
            <div class="bless-row">${blessHtml}</div>
          </div>
          <div class="panel-box">
            <h4>MOCHILA (${p.inventory.length}/20)</h4>
            <div class="inv-grid">${invGridHtml || '<p class="muted">Mochila vazia.</p>'}</div>
            <div class="inspector-box">${inspectorHtml}</div>
          </div>
        </div>
      `;

      root.querySelectorAll('[data-inv-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedInvIdx = parseInt(btn.getAttribute('data-inv-idx'), 10);
          G.AudioEngine.playSFX('uiMove');
          this._renderInventoryModal(root);
        });
      });

      const eqBtn = document.getElementById('btn-inv-equip');
      if (eqBtn) eqBtn.addEventListener('click', () => {
        const it = p.inventory[this.selectedInvIdx];
        if (!it) return;
        if (it.slot === 'consumable') this.game.useConsumable(this.selectedInvIdx);
        else this.game.equipItem(this.selectedInvIdx);
        this.selectedInvIdx = Math.max(0, Math.min(this.selectedInvIdx, p.inventory.length - 1));
        this._renderInventoryModal(root);
      });

      const salvBtn = document.getElementById('btn-inv-salvage');
      if (salvBtn) salvBtn.addEventListener('click', () => {
        this.game.salvageItem(this.selectedInvIdx);
        this.selectedInvIdx = Math.max(0, Math.min(this.selectedInvIdx, p.inventory.length - 1));
        this._renderInventoryModal(root);
      });
    },

    _itemSummary(it) {
      if (it.slot === 'consumable') return it.desc || 'Consumível';
      const parts = [];
      if (it.atk) parts.push(`+${it.atk + (it.upgrade || 0) * 3} ATQ`);
      if (it.mag) parts.push(`+${it.mag + (it.upgrade || 0) * 3} MAG`);
      if (it.def) parts.push(`+${it.def + (it.upgrade || 0) * 2} DEF`);
      if (it.bonusHp) parts.push(`+${it.bonusHp} HP`);
      if (it.bonusMp) parts.push(`+${it.bonusMp} MP`);
      if (it.element && it.element !== 'physical') parts.push(G.ELEMENT_META[it.element].name);
      return parts.join(' | ') || it.desc || 'Equipamento';
    },

    _renderItemInspector(it, p) {
      const col = it.rarityColor || P.white;
      let diffHtml = '';
      if (it.slot !== 'consumable') {
        const cur = it.slot === 'relic' ? p.equip.relic1 : p.equip[it.slot];
        if (cur) {
          const dAtk = (it.atk || 0) - (cur.atk || 0);
          const dMag = (it.mag || 0) - (cur.mag || 0);
          const dDef = (it.def || 0) - (cur.def || 0);
          const fmt = (n, lbl) => n === 0 ? '' : `<span style="color:${n > 0 ? P.lime : P.red}">${n > 0 ? '+' : ''}${n} ${lbl}</span>`;
          diffHtml = `<div class="diff-line">Comparado ao atual: ${fmt(dAtk, 'ATQ')} ${fmt(dMag, 'MAG')} ${fmt(dDef, 'DEF') || ''}</div>`;
        }
      }
      const actionTxt = it.slot === 'consumable' ? 'USAR AGORA' : 'EQUIPAR';
      const salvTxt = it.slot === 'consumable' ? 'VENDER POR OURO' : 'DESMONTAR (OURO + FRAGMENTO)';
      return `
        <div class="insp-head">
          <img src="${G.SpriteBank.getIcon(it.icon)}" class="pixel-icon-lg">
          <div>
            <div style="color:${col}"><b>${it.name}${it.upgrade ? ` +${it.upgrade}` : ''}</b></div>
            <small>${it.rarityName || 'Consumível'} • ${this._itemSummary(it)}</small>
          </div>
        </div>
        ${it.desc ? `<p class="insp-desc">${it.desc}</p>` : ''}
        ${diffHtml}
        <div class="insp-actions">
          <button type="button" id="btn-inv-equip" class="pixel-btn primary">${actionTxt}</button>
          <button type="button" id="btn-inv-salvage" class="pixel-btn warn">${salvTxt}</button>
        </div>
      `;
    },

    // --- FORJA RÚNICA ---
    _renderForgeModal(root) {
      const p = this.game.player;
      const w = p.equip.weapon;
      const a = p.equip.armor;
      const wCostGold = w ? 22 + w.upgrade * 16 : 999;
      const aCostGold = a ? 20 + a.upgrade * 14 : 999;

      const infElements = ['fire', 'ice', 'lightning', 'poison', 'arcane'];
      const infHtml = infElements.map(el => {
        const meta = G.ELEMENT_META[el];
        const has = p.shards[el] || 0;
        const can = w && has >= 2 && p.gold >= 20;
        return `
          <button type="button" class="pixel-btn-choice ${can ? '' : 'disabled'}" data-infuse="${el}">
            <b style="color:${meta.color}">Imbuir ${meta.name}</b>
            <small>Custo: 20 Ouro + 2 Frag. ${meta.name} (Você tem ${has})</small>
          </button>`;
      }).join('');

      const recHtml = G.GameData.FORGE_RECIPES.map(r => {
        const canShards = Object.entries(r.shards).every(([k, v]) => (p.shards[k] || 0) >= v);
        const can = p.gold >= r.gold && canShards;
        const costStr = `${r.gold}G + ` + Object.entries(r.shards).map(([k, v]) => `${v} ${G.ELEMENT_META[k].name}`).join(', ');
        return `
          <div class="shop-row">
            <img src="${G.SpriteBank.getIcon(r.icon)}" class="pixel-icon-md">
            <div class="shop-info">
              <b>${r.name}</b>
              <small>${r.desc}</small>
              <small class="cost-txt">Custo: ${costStr}</small>
            </div>
            <button type="button" class="pixel-btn ${can ? 'primary' : 'disabled'}" data-recipe="${r.id}">FORJAR</button>
          </div>`;
      }).join('');

      root.innerHTML = `
        <div class="forge-header">Ouro: <b style="color:${P.gold}">${p.gold}G</b> | Frag. Arcano: <b>${p.shards.arcane}</b> | Fogo: <b>${p.shards.fire}</b> | Gelo: <b>${p.shards.ice}</b> | Raio: <b>${p.shards.lightning}</b> | Veneno: <b>${p.shards.poison}</b></div>
        <div class="modal-two-col">
          <div class="panel-box">
            <h4>APRIMORAR EQUIPAMENTO</h4>
            <div class="upgrade-box">
              <div><b>Arma:</b> ${w ? `${w.name} +${w.upgrade}/5` : 'Nenhuma'}</div>
              <small>+3 ATQ e +3 MAG por nível</small>
              <button type="button" id="btn-up-weapon" class="pixel-btn ${w && w.upgrade < 5 && p.gold >= wCostGold ? 'primary' : 'disabled'}">
                ${w && w.upgrade >= 5 ? 'MÁXIMO' : `REFORJAR (${wCostGold}G)`}
              </button>
            </div>
            <div class="upgrade-box">
              <div><b>Armadura:</b> ${a ? `${a.name} +${a.upgrade}/5` : 'Nenhuma'}</div>
              <small>+2 DEF por nível</small>
              <button type="button" id="btn-up-armor" class="pixel-btn ${a && a.upgrade < 5 && p.gold >= aCostGold ? 'primary' : 'disabled'}">
                ${a && a.upgrade >= 5 ? 'MÁXIMO' : `REFORJAR (${aCostGold}G)`}
              </button>
            </div>
            <h4>IMBUIR ELEMENTO NA ARMA</h4>
            <div class="infuse-grid">${infHtml}</div>
          </div>
          <div class="panel-box">
            <h4>ALQUIMIA & CRIAÇÃO RÚNICA</h4>
            <div class="shop-list">${recHtml}</div>
          </div>
        </div>
      `;

      document.getElementById('btn-up-weapon').addEventListener('click', () => {
        if (!w || w.upgrade >= 5 || p.gold < wCostGold) return;
        p.gold -= wCostGold;
        w.upgrade += 1;
        G.AudioEngine.playSFX('craft');
        this.dirty = true;
        this._renderForgeModal(root);
      });

      document.getElementById('btn-up-armor').addEventListener('click', () => {
        if (!a || a.upgrade >= 5 || p.gold < aCostGold) return;
        p.gold -= aCostGold;
        a.upgrade += 1;
        G.AudioEngine.playSFX('craft');
        this.dirty = true;
        this._renderForgeModal(root);
      });

      root.querySelectorAll('[data-infuse]').forEach(btn => {
        btn.addEventListener('click', () => {
          const el = btn.getAttribute('data-infuse');
          if (!w || (p.shards[el] || 0) < 2 || p.gold < 20) return;
          p.gold -= 20;
          p.shards[el] -= 2;
          w.element = el;
          G.AudioEngine.playSFX('craft');
          this.dirty = true;
          this._renderForgeModal(root);
        });
      });

      root.querySelectorAll('[data-recipe]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-recipe');
          const r = G.GameData.FORGE_RECIPES.find(x => x.id === id);
          if (!r || p.gold < r.gold) return;
          if (!Object.entries(r.shards).every(([k, v]) => (p.shards[k] || 0) >= v)) return;

          p.gold -= r.gold;
          for (const [k, v] of Object.entries(r.shards)) p.shards[k] -= v;

          if (r.type === 'bombs') p.bombs += r.qty;
          else if (r.type === 'keys') p.keys += r.qty;
          else if (r.type === 'consumable') this.game._addStackItemRaw(p, G.GameData.makeTemplateItem(r.resultTpl));
          else if (r.type === 'loot') {
            const it = G.GameData.generateProceduralLoot(this.game.rng, this.game.floor, r.slot, r.minRarity);
            this.game._addStackItemRaw(p, it);
          }
          G.AudioEngine.playSFX('craft');
          this.dirty = true;
          this._renderForgeModal(root);
        });
      });
    },

    // --- MERCADOR ---
    _renderShopModal(root) {
      const p = this.game.player;
      const room = this.game.currentRoom;
      const stockHtml = room.shopItems.map((entry, idx) => {
        const icon = entry.item ? entry.item.icon : entry.icon;
        const name = entry.item ? entry.item.name : entry.name;
        const desc = entry.item ? this._itemSummary(entry.item) : entry.desc;
        const col = entry.item?.rarityColor || P.white;
        const can = !entry.bought && p.gold >= entry.price;
        return `
          <div class="shop-row">
            <img src="${G.SpriteBank.getIcon(icon)}" class="pixel-icon-md">
            <div class="shop-info">
              <b style="color:${col}">${name}</b>
              <small>${desc}</small>
            </div>
            <button type="button" class="pixel-btn ${entry.bought ? 'disabled' : (can ? 'primary' : 'disabled')}" data-buy-idx="${idx}">
              ${entry.bought ? 'ESGOTADO' : `${entry.price}G`}
            </button>
          </div>`;
      }).join('');

      root.innerHTML = `
        <div class="forge-header">Seu Ouro: <b style="color:${P.gold}">${p.gold}G</b> • Mochila: ${p.inventory.length}/20</div>
        <div class="shop-list">${stockHtml}</div>
      `;

      root.querySelectorAll('[data-buy-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-buy-idx'), 10);
          const entry = room.shopItems[idx];
          if (!entry || entry.bought || p.gold < entry.price) return;
          if (entry.item && p.inventory.length >= 20 && !entry.item.stackable) return;

          p.gold -= entry.price;
          entry.bought = true;
          if (entry.type === 'bomb_pack') p.bombs += 2;
          else if (entry.type === 'key') p.keys += 1;
          else if (entry.item) this.game._addStackItemRaw(p, entry.item);

          G.AudioEngine.playSFX('coin');
          this.dirty = true;
          this._renderShopModal(root);
        });
      });
    },

    // --- BÊNÇÃOS ---
    openBlessingModal(onDone = null, title = 'SANTUÁRIO DAS BÊNÇÃOS') {
      const p = this.game.player;
      const owned = new Set(p.blessings.map(b => b.id));
      const pool = G.GameData.BLESSINGS.filter(b => !owned.has(b.id));
      const picks = (pool.length >= 3 ? pool : G.GameData.BLESSINGS).slice().sort(() => Math.random() - 0.5).slice(0, 3);

      this.blessingChoices = picks;
      this.blessingCallback = onDone;
      this.blessingTitle = title;

      this.activeModal = 'blessing';
      this.game.state = 'modal';
      document.getElementById('modal-overlay').classList.remove('hidden');
      document.getElementById('modal-close-btn').classList.add('hidden');
      document.getElementById('modal-title').textContent = title;

      const body = document.getElementById('modal-body');
      body.innerHTML = `
        <p class="center-msg">Escolha uma Bênção Rúnica para fortalecer sua jornada:</p>
        <div class="blessing-grid">
          ${picks.map((b, i) => `
            <button type="button" class="pixel-card bless-card" data-bless-idx="${i}">
              <img src="${G.SpriteBank.getIcon(b.icon)}" class="pixel-icon-lg">
              <b>${b.name}</b>
              <p>${b.desc}</p>
            </button>
          `).join('')}
        </div>
      `;

      body.querySelectorAll('[data-bless-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const b = this.blessingChoices[parseInt(btn.getAttribute('data-bless-idx'), 10)];
          if (!b) return;
          b.apply(p);
          p.blessings.push(b);
          G.AudioEngine.playSFX('levelUp');
          if (this.blessingCallback) this.blessingCallback();
          this.closeAllModals();
        });
      });
    },

    // --- CÓDICE & QUÍMICA ELEMENTAL ---
    _renderCodexModal(root) {
      const tabs = `
        <div class="tab-bar">
          <button type="button" class="pixel-btn ${this.codexTab === 'chemistry' ? 'primary' : ''}" data-ctab="chemistry">Química & Combate</button>
          <button type="button" class="pixel-btn ${this.codexTab === 'bestiary' ? 'primary' : ''}" data-ctab="bestiary">Bestiário</button>
          <button type="button" class="pixel-btn ${this.codexTab === 'controls' ? 'primary' : ''}" data-ctab="controls">Controles</button>
        </div>`;

      let content = '';
      if (this.codexTab === 'chemistry') {
        content = `<div class="codex-grid">` + G.GameData.CHEMISTRY_GUIDE.map(c => `
          <div class="codex-card" style="border-color:${c.color}">
            <b style="color:${c.color}">${c.title}</b>
            <p>${c.desc}</p>
          </div>`).join('') + `</div>`;
      } else if (this.codexTab === 'bestiary') {
        const allFoes = [...Object.values(G.GameData.ENEMIES), ...Object.values(G.GameData.BOSSES)];
        content = `<div class="codex-grid">` + allFoes.map(f => {
          const kills = this.game.meta.codexEnemies[f.id] || 0;
          const sp = G.SpriteBank.getIcon(f.sprite + '_0');
          const weakTxt = f.weak ? G.ELEMENT_META[f.weak].name : 'Nenhuma';
          return `
            <div class="codex-card ${kills > 0 ? '' : 'locked-entry'}">
              <div class="codex-head">
                <img src="${sp}" class="pixel-icon-md">
                <div>
                  <b>${kills > 0 ? f.name : '??? (Desconhecido)'}</b>
                  <small>${kills > 0 ? `Derrotados: ${kills} • Fraqueza: ${weakTxt}` : 'Derrote na masmorra para revelar'}</small>
                </div>
              </div>
              <p>${kills > 0 ? f.lore : 'Criatura ainda não catalogada.'}</p>
            </div>`;
        }).join('') + `</div>`;
      } else {
        content = `
          <div class="controls-list">
            <div><b>WASD / Setas:</b> Mover herói (e empurrar blocos em enigmas)</div>
            <div><b>J / Z / Clique Esquerdo:</b> Ataque Primário (Espada/Cajado/Arco/Adagas)</div>
            <div><b>Espaço (segurar/tocar):</b> Escudo — toque no instante do impacto para <b>PARRY!</b></div>
            <div><b>K / X / Shift:</b> Esquiva (Dash) com invulnerabilidade</div>
            <div><b>L / Q / Clique Direito:</b> Habilidade Especial da Classe</div>
            <div><b>B / V:</b> Colocar Bomba (explode inimigos e abre Paredes Rachadas!)</div>
            <div><b>E / Enter:</b> Interagir (Baús, Mercador, Forja, Fogueira, Santuário, Tábuas)</div>
            <div><b>1, 2, 3, 4:</b> Poção de Vida, Éter, Elixir, Pergaminho Mágico</div>
            <div><b>I / Tab:</b> Mochila & Equipamento | <b>C:</b> Códice | <b>Esc:</b> Pausa</div>
          </div>`;
      }

      root.innerHTML = tabs + content;
      root.querySelectorAll('[data-ctab]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.codexTab = btn.getAttribute('data-ctab');
          G.AudioEngine.playSFX('uiMove');
          this._renderCodexModal(root);
        });
      });
    },

    // --- ALTAR ANCESTRAL (META-PROGRESSÃO) ---
    _renderAltarModal(root) {
      const meta = this.game.meta;
      const listHtml = G.GameData.META_UPGRADES.map(u => {
        const rank = meta.upgrades[u.id] || 0;
        const cost = u.baseCost + rank * 10;
        const maxed = rank >= u.maxRank;
        const can = !maxed && meta.souls >= cost;
        return `
          <div class="shop-row">
            <img src="${G.SpriteBank.getIcon('item_soul')}" class="pixel-icon-md">
            <div class="shop-info">
              <b>${u.name} (Nível ${rank}/${u.maxRank})</b>
              <small>${u.desc} • Bônus: ${u.perRank}</small>
            </div>
            <button type="button" class="pixel-btn ${maxed ? 'disabled' : (can ? 'primary' : 'disabled')}" data-meta-up="${u.id}">
              ${maxed ? 'MAX' : `${cost} Almas`}
            </button>
          </div>`;
      }).join('');

      root.innerHTML = `
        <div class="forge-header">Almas Ancestrais Disponíveis: <b style="color:${P.cyan}">${meta.souls}</b></div>
        <div class="shop-list">${listHtml}</div>
      `;

      root.querySelectorAll('[data-meta-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-meta-up');
          const u = G.GameData.META_UPGRADES.find(x => x.id === id);
          const rank = meta.upgrades[id] || 0;
          const cost = u.baseCost + rank * 10;
          if (!u || rank >= u.maxRank || meta.souls < cost) return;
          meta.souls -= cost;
          meta.upgrades[id] = rank + 1;
          this.game.saveMeta();
          G.AudioEngine.playSFX('levelUp');
          this._renderAltarModal(root);
          document.getElementById('title-souls-count').textContent = meta.souls;
        });
      });
    },

    // --- PAUSA & OPÇÕES ---
    _renderPauseModal(root) {
      const s = this.game.meta.settings;
      root.innerHTML = `
        <div class="pause-grid">
          <label>Volume Música (Chiptune): <input id="opt-mus" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}"></label>
          <label>Volume Efeitos (SFX): <input id="opt-sfx" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}"></label>
          <label class="chk"><input id="opt-crt" type="checkbox" ${s.crt ? 'checked' : ''}> Filtro CRT Scanlines 8-bit</label>
          <label class="chk"><input id="opt-grid" type="checkbox" ${s.pixelGrid ? 'checked' : ''}> Grade de Pixels</label>
          <label class="chk"><input id="opt-touch" type="checkbox" ${s.touch ? 'checked' : ''}> Controles Virtuais na Tela</label>
          <div class="pause-actions">
            <button type="button" id="btn-pause-resume" class="pixel-btn primary">CONTINUAR</button>
            <button type="button" id="btn-pause-savequit" class="pixel-btn">SALVAR E SAIR AO TÍTULO</button>
          </div>
        </div>
      `;

      document.getElementById('opt-mus').addEventListener('input', (e) => {
        s.musicVolume = parseFloat(e.target.value);
        G.AudioEngine.setSettings(s);
        this.game.saveMeta();
      });
      document.getElementById('opt-sfx').addEventListener('input', (e) => {
        s.sfxVolume = parseFloat(e.target.value);
        G.AudioEngine.setSettings(s);
        this.game.saveMeta();
      });
      document.getElementById('opt-crt').addEventListener('change', (e) => {
        s.crt = e.target.checked;
        this._applyVisualSettings();
        this.game.saveMeta();
      });
      document.getElementById('opt-grid').addEventListener('change', (e) => {
        s.pixelGrid = e.target.checked;
        this._applyVisualSettings();
        this.game.saveMeta();
      });
      document.getElementById('opt-touch').addEventListener('change', (e) => {
        s.touch = e.target.checked;
        this._applyVisualSettings();
        this.game.saveMeta();
      });
      document.getElementById('btn-pause-resume').addEventListener('click', () => this.closeAllModals());
      document.getElementById('btn-pause-savequit').addEventListener('click', () => {
        this.game.saveActiveRun();
        this.closeAllModals();
        this.game.state = 'title';
        G.AudioEngine.playMusic('title');
        this._renderTitleScreen();
      });
    },

    // --- FIM DE JOGO & VITÓRIA ---
    showGameOverModal(souls) {
      this.activeModal = 'gameover';
      document.getElementById('modal-overlay').classList.remove('hidden');
      document.getElementById('modal-close-btn').classList.add('hidden');
      document.getElementById('modal-title').textContent = 'VOCÊ CAIU NO ABISMO';

      const st = this.game.stats;
      document.getElementById('modal-body').innerHTML = `
        <div class="end-summary">
          <p class="end-sub">Sua jornada terminou no <b>Andar ${this.game.floor}</b> (${this.game.currentRoom.biome.name}).</p>
          <div class="stats-table">
            <div>Inimigos Derrotados: <b>${st.kills}</b></div>
            <div>Chefes Vencidos: <b>${st.bosses}</b></div>
            <div>Itens Coletados: <b>${st.itemsFound}</b></div>
            <div>Tempo de Corrida: <b>${Math.floor(st.time)}s</b></div>
          </div>
          <div class="soul-reward">+${souls} Almas Ancestrais Obtidas!</div>
          <div class="insp-actions">
            <button type="button" id="btn-go-title" class="pixel-btn primary">VOLTAR AO TÍTULO & ALTAR</button>
          </div>
        </div>
      `;
      document.getElementById('btn-go-title').addEventListener('click', () => {
        this.closeAllModals();
        this.game.state = 'title';
        this._renderTitleScreen();
      });
    },

    showVictoryModal(souls) {
      this.activeModal = 'victory';
      document.getElementById('modal-overlay').classList.remove('hidden');
      document.getElementById('modal-close-btn').classList.add('hidden');
      document.getElementById('modal-title').textContent = 'VITÓRIA! MALAKOR DERROTADO!';

      const st = this.game.stats;
      document.getElementById('modal-body').innerHTML = `
        <div class="end-summary">
          <p class="end-sub">Você conquistou os 4 Andares da Cidadela e purificou a Coroa Partida!</p>
          <div class="stats-table">
            <div>Classe: <b>${this.game.player.classDef.name}</b></div>
            <div>Dificuldade: <b>${this.game.difficulty.name}</b></div>
            <div>Inimigos Derrotados: <b>${st.kills}</b></div>
            <div>Tempo Total: <b>${Math.floor(st.time)}s</b></div>
          </div>
          <div class="soul-reward">+${souls} Almas Ancestrais Conquistadas!</div>
          <div class="insp-actions">
            <button type="button" id="btn-endless" class="pixel-btn warn">ABISMO INFINITO (ANDAR 5+)</button>
            <button type="button" id="btn-vic-title" class="pixel-btn primary">ENCERRAR COM HONRA</button>
          </div>
        </div>
      `;
      document.getElementById('btn-endless').addEventListener('click', () => {
        this.game.continueEndlessAbyss();
      });
      document.getElementById('btn-vic-title').addEventListener('click', () => {
        this.closeAllModals();
        this.game.state = 'title';
        this._renderTitleScreen();
      });
    }
  };

  G.UI = UI;
})(window.Game8Bit);
