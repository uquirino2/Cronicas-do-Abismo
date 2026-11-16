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
    saveTab: 'export',
    saveIncludeRun: true,
    saveStatus: null,
    magicPendingPkg: null,
    _openedSaveFromPause: false,
    _pendingReloadFromSave: false,
    dirty: true,
    _lastHudTick: 0,

    init(game) {
      this.game = game;
      this._applyVisualSettings();
      this._bindTitleEvents();
      this._bindHudEvents();
      this._renderTitleScreen();
      window.addEventListener('hashchange', () => this._checkMagicSaveUrl());
      this._checkMagicSaveUrl();
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
      document.body.classList.toggle('touch-on', !!s.touch);
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

      document.getElementById('btn-open-ach-title').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        this.openModal('achievements');
      });

      document.getElementById('btn-export-save-title').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        this.openSaveModal('export', false);
      });

      document.getElementById('btn-import-save-title').addEventListener('click', () => {
        G.AudioEngine.unlock();
        G.AudioEngine.playSFX('uiConfirm');
        this.openSaveModal('import', false);
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

      document.getElementById('btn-hud-touch').addEventListener('click', () => {
        const s = this.game.meta.settings;
        s.touch = !s.touch;
        this._applyVisualSettings();
        this.game.saveMeta();
        this._updateTouchBtn();
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

      // Joystick Analógico Virtual 360° (Multi-Touch com Pointer Capture)
      const joyZone = document.getElementById('joy-zone');
      const joyBase = document.getElementById('joy-base');
      const joyKnob = document.getElementById('joy-knob');
      if (joyZone && joyBase && joyKnob) {
        let joyPtr = null;
        const updateStick = (clientX, clientY) => {
          const rect = joyBase.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const maxR = Math.max(24, rect.width * 0.42);
          let dx = clientX - cx;
          let dy = clientY - cy;
          const dist = Math.hypot(dx, dy);
          if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
          }
          joyKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
          const norm = dist / maxR;
          if (norm < 0.14) {
            this.game.touchMove.x = 0;
            this.game.touchMove.y = 0;
          } else {
            // Normaliza mantendo direção exata em 360 graus
            this.game.touchMove.x = dx / dist;
            this.game.touchMove.y = dy / dist;
          }
        };
        const resetStick = (e) => {
          if (joyPtr !== null && e.pointerId !== undefined && e.pointerId !== joyPtr) return;
          joyPtr = null;
          joyKnob.style.transform = 'translate(0px, 0px)';
          this.game.touchMove.x = 0;
          this.game.touchMove.y = 0;
          joyBase.classList.remove('active');
        };
        joyZone.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          G.AudioEngine.unlock();
          if (joyPtr !== null) return;
          joyPtr = e.pointerId;
          if (joyZone.setPointerCapture) try { joyZone.setPointerCapture(e.pointerId); } catch (_) {}
          joyBase.classList.add('active');
          updateStick(e.clientX, e.clientY);
        });
        joyZone.addEventListener('pointermove', (e) => {
          if (e.pointerId !== joyPtr) return;
          e.preventDefault();
          updateStick(e.clientX, e.clientY);
        });
        joyZone.addEventListener('pointerup', resetStick);
        joyZone.addEventListener('pointercancel', resetStick);
        joyZone.addEventListener('lostpointercapture', resetStick);
      }

      document.querySelectorAll('[data-touch-act]').forEach(btn => {
        const act = btn.getAttribute('data-touch-act');
        let btnPtr = null;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          G.AudioEngine.unlock();
          btnPtr = e.pointerId;
          if (btn.setPointerCapture) try { btn.setPointerCapture(e.pointerId); } catch (_) {}
          btn.classList.add('pressed');
          if (this.game.state !== 'playing') return;
          if (act === 'atk') G.Combat.triggerAttack(this.game);
          else if (act === 'dash') G.Combat.triggerDash(this.game);
          else if (act === 'parry') G.Combat.triggerBlockStart(this.game);
          else if (act === 'skill') G.Combat.triggerSkill(this.game);
          else if (act === 'bomb') G.Combat.placeBomb(this.game);
          else if (act === 'use') this.game.interact();
        });
        const releaseBtn = (e) => {
          if (btnPtr !== null && e.pointerId !== undefined && e.pointerId !== btnPtr) return;
          btnPtr = null;
          btn.classList.remove('pressed');
          if (act === 'parry' && this.game.player) G.Combat.triggerBlockEnd(this.game);
        };
        btn.addEventListener('pointerup', releaseBtn);
        btn.addEventListener('pointercancel', releaseBtn);
        btn.addEventListener('lostpointercapture', releaseBtn);
      });
    },

    _renderTitleScreen() {
      document.getElementById('screen-title').classList.remove('hidden');
      document.getElementById('screen-game').classList.add('hidden');
      document.getElementById('title-souls-count').textContent = this.game.meta.souls;
      document.getElementById('title-best-floor').textContent = this.game.meta.bestFloor;
      document.getElementById('title-wins').textContent = this.game.meta.wins;
      const totalAch = G.GameData.ACHIEVEMENTS.length;
      const unlockedAch = Object.keys(this.game.meta.achievements || {}).length;
      const achEl = document.getElementById('title-ach-count');
      if (achEl) achEl.textContent = `${unlockedAch}/${totalAch}`;

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
        btn.className = 'pixel-btn-choice'
          + (diff.id === 'descomunal' ? ' diff-descomunal' : '')
          + (this.selectedDiff === diff.id ? ' selected' : '');
        btn.innerHTML = `<b>${diff.name} <span class="xp-tag">XP ${diff.xpMult}x</span></b><small>${diff.desc}</small>`;
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
      this._updateTouchBtn();
      this.dirty = true;
      this.updateHUD(true);
    },

    _updateMuteBtn() {
      const btn = document.getElementById('btn-hud-mute');
      if (btn) btn.textContent = this.game.meta.settings.muted ? 'SOM: OFF' : 'SOM: ON';
    },

    _updateTouchBtn() {
      const btn = document.getElementById('btn-hud-touch');
      if (btn) btn.textContent = this.game.meta.settings.touch ? 'TOUCH: ON' : 'TOUCH: OFF';
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
      const ohEl = document.getElementById('hud-onehit');
      if (ohEl) ohEl.classList.toggle('hidden', !this.game.difficulty.oneHitDeath);

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
      const cellW = 12;
      const cellH = 9;
      const cur = this.game.currentRoom;

      for (const r of Object.values(rooms)) {
        if (!r.revealed && !r.visited) continue;
        if (r.type === 'secret' && !r.revealed) continue;

        const rx = r.gx * 14 + 3;
        const ry = r.gy * 11 + 2;

        // Conexões
        ctx.fillStyle = P.gray;
        for (const [dk, nb] of Object.entries(r.neighbors)) {
          if (nb.lock === 'secret' && !rooms[nb.roomId]?.revealed) continue;
          if (dk === 'E') ctx.fillRect(rx + cellW, ry + 4, 2, 2);
          if (dk === 'S') ctx.fillRect(rx + 5, ry + cellH, 2, 2);
        }

        let fill = r.visited ? '#343854' : '#1b1d2c';
        if (r.id === cur.id) fill = P.cyan;
        else if (r.type === 'boss') fill = P.darkRed;
        else if (r.type === 'shop') fill = P.ochre;
        else if (r.type === 'forge') fill = P.blue;
        else if (r.type === 'treasure') fill = P.gold;
        else if (r.type === 'shrine') fill = P.purple;
        else if (r.type === 'puzzle') fill = r.puzzleSolved ? P.darkGreen : '#244858';
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
        else if (r.type === 'puzzle') { sym = '?'; col = P.cyan; }
        else if (r.hasBossKey && !this.game.player.hasBossKey && !r.cleared) { sym = 'K'; col = P.gold; }
        if (sym) G.drawPixelText(ctx, sym, rx + 6, ry + 2, col, P.black, 'center', 1);
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

    openSaveModal(tab = 'export', fromPause = false) {
      this.saveTab = tab;
      this.saveStatus = null;
      this._openedSaveFromPause = !!fromPause;
      this.openModal('save');
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
      } else if (name === 'achievements') {
        titleEl.textContent = 'CONQUISTAS DO ABISMO';
        this._renderAchievementsModal(bodyEl);
      } else if (name === 'pause') {
        titleEl.textContent = 'PAUSA & CONFIGURAÇÕES';
        this._renderPauseModal(bodyEl);
      } else if (name === 'save') {
        titleEl.textContent = 'EXPORTAR & IMPORTAR SAVE';
        this._renderSaveModal(bodyEl);
      }
    },

    closeAllModals() {
      const prevModal = this.activeModal;
      document.getElementById('modal-overlay').classList.add('hidden');
      this.activeModal = null;
      const shouldReloadImportedRun = prevModal === 'save' && this._pendingReloadFromSave;
      this._pendingReloadFromSave = false;
      this._openedSaveFromPause = false;

      if (shouldReloadImportedRun) {
        if (this.game.state === 'title') {
          this._renderTitleScreen();
        } else if (this.game.hasSavedRun() && this.game.loadActiveRun()) {
          return;
        } else {
          this.game.player = null;
          this.game.dungeon = null;
          this.game.state = 'title';
          G.AudioEngine.playMusic('title');
          this._renderTitleScreen();
        }
        return;
      }

      if (this.game.state === 'modal') this.game.state = 'playing';
      if (this.game.state === 'title') this._renderTitleScreen();
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
      const totAtk = (it.atk || 0) + (it.bonusAtk || 0);
      const totMag = (it.mag || 0) + (it.bonusMag || 0);
      if (totAtk) parts.push(`+${totAtk + (it.atk ? (it.upgrade || 0) * 3 : 0)} ATQ`);
      if (totMag) parts.push(`+${totMag + (it.mag ? (it.upgrade || 0) * 3 : 0)} MAG`);
      if (it.def) parts.push(`+${it.def + (it.upgrade || 0) * 2} DEF`);
      if (it.bonusHp) parts.push(`${it.bonusHp > 0 ? '+' : ''}${it.bonusHp} HP`);
      if (it.bonusMp) parts.push(`+${it.bonusMp} MP`);
      if (it.bonusCrit) parts.push(`+${Math.round(it.bonusCrit * 100)}% CRIT`);
      if (it.bonusSpeed) parts.push(`+${it.bonusSpeed} VEL`);
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
        this.game.recordStat('itemsForged', 1);
        G.AudioEngine.playSFX('craft');
        this.dirty = true;
        this._renderForgeModal(root);
      });

      document.getElementById('btn-up-armor').addEventListener('click', () => {
        if (!a || a.upgrade >= 5 || p.gold < aCostGold) return;
        p.gold -= aCostGold;
        a.upgrade += 1;
        this.game.recordStat('itemsForged', 1);
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
          this.game.recordStat('itemsForged', 1);
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
            if (it.rarity === 'lendario') this.game.unlockAchievement('collector');
          }
          this.game.recordStat('itemsForged', 1);
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

    // --- CÓDICE, HISTÓRIA & QUÍMICA ELEMENTAL ---
    _renderCodexModal(root) {
      const tabs = `
        <div class="tab-bar">
          <button type="button" class="pixel-btn ${this.codexTab === 'chemistry' ? 'primary' : ''}" data-ctab="chemistry">Química & Combate</button>
          <button type="button" class="pixel-btn ${this.codexTab === 'bestiary' ? 'primary' : ''}" data-ctab="bestiary">Bestiário</button>
          <button type="button" class="pixel-btn ${this.codexTab === 'story' ? 'primary' : ''}" data-ctab="story">Crônica & História</button>
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
      } else if (this.codexTab === 'story') {
        const bestFloor = this.game.meta.bestFloor || 1;
        const loreFound = this.game.meta.loreFound || {};
        const chHtml = G.GameData.STORY_CHAPTERS.map(ch => {
          const open = bestFloor >= ch.floor || this.game.meta.wins > 0;
          return `
            <div class="codex-card ${open ? '' : 'locked-entry'}" style="border-color:${open ? P.gold : 'var(--border)'}">
              <b style="color:${open ? P.gold : P.gray}">${open ? ch.title : `Capítulo ${ch.floor} — Bloqueado`}</b>
              <p>${open ? ch.text : `Alcance o Andar ${ch.floor} para desbloquear este capítulo da Crônica.`}</p>
            </div>`;
        }).join('');
        const fragHtml = G.GameData.LORE_FRAGMENTS.map(f => {
          const found = !!loreFound[f.id];
          return `
            <div class="codex-card ${found ? '' : 'locked-entry'}">
              <b style="color:${found ? P.cyan : P.gray}">${found ? `${f.title} (Andar ${f.floor})` : `Tábua Antiga #${f.id.replace('lore_', '')}`}</b>
              <p>${found ? f.text : 'Leia esta tábua rúnica nas salas do Andar ' + f.floor + '.'}</p>
            </div>`;
        }).join('');
        content = `<div class="story-subhead">CAPÍTULOS DA JORNADA (${Math.min(6, bestFloor)}/6)</div><div class="codex-grid">${chHtml}</div><div class="story-subhead">TÁBUAS ANTIGAS DECIFRADAS (${Object.keys(loreFound).length}/${G.GameData.LORE_FRAGMENTS.length})</div><div class="codex-grid">${fragHtml}</div>`;
      } else {
        content = `
          <div class="controls-list">
            <div><b>WASD / Setas (ou Joystick Touch):</b> Mover herói (e empurrar blocos em enigmas)</div>
            <div><b>J / Z / Clique Esquerdo:</b> Ataque Primário (Espada/Lança/Martelo/Foice/Grimório/Arco/Besta)</div>
            <div><b>Espaço / Botão PARRY:</b> Escudo — toque no instante do impacto para <b>PARRY!</b> (anula dano em Descomunal!)</div>
            <div><b>K / X / Shift:</b> Esquiva (Dash) com invulnerabilidade</div>
            <div><b>L / Q / Clique Direito:</b> Habilidade Especial da Classe</div>
            <div><b>B / V:</b> Colocar Bomba (explode inimigos e abre Paredes Rachadas!)</div>
            <div><b>E / Enter:</b> Interagir (Baús, Mercador, Forja, Fogueira, Santuário, Tábuas, Reset de Enigma)</div>
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

    // --- CONQUISTAS (ACHIEVEMENTS) ---
    _renderAchievementsModal(root) {
      const meta = this.game.meta;
      const achMap = meta.achievements || {};
      const st = meta.statsTotal || {};
      const all = G.GameData.ACHIEVEMENTS;
      const unlockedCount = all.filter(a => !!achMap[a.id]).length;

      const listHtml = all.map(a => {
        const done = !!achMap[a.id];
        const sp = G.SpriteBank.getIcon(a.icon);
        let progHtml = '';
        if (a.stat && a.target) {
          const cur = Math.min(a.target, st[a.stat] || 0);
          progHtml = `<small class="ach-prog">Progresso: ${done ? a.target : cur}/${a.target}</small>`;
        }
        return `
          <div class="codex-card ach-card ${done ? 'ach-done' : 'locked-entry'}">
            <div class="codex-head">
              <img src="${sp}" class="pixel-icon-md">
              <div>
                <b>${done ? '★ ' : ''}${a.name}</b>
                <small style="color:${done ? P.lime : P.gold}">Recompensa: +${a.reward} Almas</small>
              </div>
            </div>
            <p>${a.desc}</p>
            ${progHtml}
          </div>`;
      }).join('');

      root.innerHTML = `
        <div class="forge-header">Conquistas Desbloqueadas: <b style="color:${P.gold}">${unlockedCount} / ${all.length}</b> • Abates Totais: <b>${st.totalKills || 0}</b> • Parrys: <b>${st.totalParries || 0}</b></div>
        <div class="codex-grid">${listHtml}</div>
      `;
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
          <div class="pause-actions">
            <button type="button" id="btn-pause-export" class="pixel-btn sm">EXPORTAR SAVE</button>
            <button type="button" id="btn-pause-import" class="pixel-btn sm">IMPORTAR SAVE</button>
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
        this._updateTouchBtn();
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
      document.getElementById('btn-pause-export').addEventListener('click', () => {
        G.AudioEngine.playSFX('uiConfirm');
        this.openSaveModal('export', true);
      });
      document.getElementById('btn-pause-import').addEventListener('click', () => {
        G.AudioEngine.playSFX('uiConfirm');
        this.openSaveModal('import', true);
      });
    },

    // --- PORTABILIDADE DE SAVE (.JSON, CÓDIGO & LINK MÁGICO) ---
    _escHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch]));
    },

    _formatSaveSummary(pkg) {
      const m = pkg.meta || {};
      const run = pkg.activeRun;
      const clsName = run ? (G.GameData.CLASSES[run.player?.classId]?.name || run.player?.classId || 'Herói') : null;
      const runText = run
        ? `Sim (${this._escHtml(clsName)} • Andar ${Number(run.floor) || 1})`
        : 'Nenhuma';
      const dateStr = pkg.exportedAt ? new Date(pkg.exportedAt).toLocaleString('pt-BR') : 'Não informada';
      return {
        souls: Number(m.souls) || 0,
        bestFloor: Number(m.bestFloor) || 1,
        wins: Number(m.wins) || 0,
        runText,
        dateText: this._escHtml(dateStr)
      };
    },

    async _copyText(text, fallbackInputEl, btnEl, defaultLabel) {
      let copied = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (e) {}

      if (!copied && fallbackInputEl) {
        try {
          fallbackInputEl.focus();
          fallbackInputEl.select();
          if (typeof fallbackInputEl.setSelectionRange === 'function') {
            fallbackInputEl.setSelectionRange(0, text.length);
          }
          copied = document.execCommand('copy');
        } catch (e) {}
      }

      if (btnEl) {
        btnEl.textContent = copied ? 'COPIADO!' : 'SELECIONADO (CTRL+C)';
        setTimeout(() => {
          if (btnEl.isConnected) btnEl.textContent = defaultLabel;
        }, 1800);
      }
      return copied;
    },

    async _checkMagicSaveUrl() {
      const code = this.game.extractMagicHashCode();
      if (!code) return;
      try {
        const pkg = await this.game.decodeSaveInput(code);
        this.magicPendingPkg = pkg;
        this.saveTab = 'import';
        this.saveStatus = null;
        this._openedSaveFromPause = this.game.state !== 'title';
        this.openModal('save');
      } catch (err) {
        this.magicPendingPkg = null;
        this.saveTab = 'import';
        this.saveStatus = { type: 'err', msg: err.message || 'Link mágico inválido.' };
        this._openedSaveFromPause = this.game.state !== 'title';
        this.openModal('save');
      }
    },

    _applyImportedSave(pkg, sourceLabel) {
      const wasInRun = this.game.state !== 'title';
      const info = this.game.applySavePackage(pkg);
      this.magicPendingPkg = null;
      this._pendingReloadFromSave = wasInRun;
      if (this.game.state === 'title') {
        this._renderTitleScreen();
      }
      const runDesc = info.hasRun ? ` Partida salva: ${this._escHtml(info.runClass)} (Andar ${info.runFloor}).` : ' Sem partida em andamento.';
      this.saveStatus = {
        type: 'ok',
        msg: `Save importado via ${this._escHtml(sourceLabel)}! Almas: ${info.souls} | Melhor Andar: ${info.bestFloor} | Vitórias: ${info.wins}.${runDesc}`,
        hasRun: info.hasRun,
        showImportActions: true
      };
      G.AudioEngine.playSFX('levelUp');
      const bodyEl = document.getElementById('modal-body');
      if (this.activeModal === 'save' && bodyEl) {
        this._renderSaveModal(bodyEl);
      }
    },

    _renderSaveModal(root) {
      this._saveRenderSeq = (this._saveRenderSeq || 0) + 1;
      const renderSeq = this._saveRenderSeq;

      const meta = this.game.meta;
      const exportRun = this.game.getExportableRunSnapshot();
      const hasExportRun = !!exportRun;
      if (!hasExportRun) this.saveIncludeRun = false;

      const runLabel = hasExportRun
        ? `Incluir partida atual (${this._escHtml(G.GameData.CLASSES[exportRun.player.classId]?.name || exportRun.player.classId)} • Andar ${exportRun.floor})`
        : 'Nenhuma partida em andamento no momento';

      const statusHtml = this.saveStatus ? `
        <div class="save-status ${this.saveStatus.type}">
          <div>${this.saveStatus.msg}</div>
          ${this.saveStatus.showImportActions ? `
            <div class="save-row">
              ${this.saveStatus.hasRun ? '<button type="button" id="btn-save-play-now" class="pixel-btn primary sm">CONTINUAR PARTIDA AGORA</button>' : ''}
              ${this.game._lastImportBackup ? '<button type="button" id="btn-save-undo" class="pixel-btn warn sm">DESFAZER IMPORTAÇÃO</button>' : ''}
            </div>
          ` : ''}
        </div>
      ` : '';

      let previewHtml = '';
      if (this.magicPendingPkg) {
        const sum = this._formatSaveSummary(this.magicPendingPkg);
        previewHtml = `
          <div class="save-box save-preview">
            <h4>LINK MÁGICO DETECTADO — CONFIRMAR CARREGAMENTO?</h4>
            <div class="save-meta-line">
              <span>Almas Ancestrais: <b>${sum.souls}</b></span>
              <span>Melhor Andar: <b>${sum.bestFloor}</b></span>
              <span>Vitórias: <b>${sum.wins}</b></span>
            </div>
            <div class="save-meta-line">
              <span>Partida em andamento: <b>${sum.runText}</b></span>
              <span>Exportado em: <b>${sum.dateText}</b></span>
            </div>
            <p class="save-hint">Confirmar substituirá o save salvo neste navegador (você poderá desfazer enquanto esta janela estiver aberta).</p>
            <div class="save-row">
              <button type="button" id="btn-confirm-magic" class="pixel-btn primary">CONFIRMAR E CARREGAR SAVE</button>
              <button type="button" id="btn-discard-magic" class="pixel-btn">DESCARTAR LINK</button>
            </div>
          </div>
        `;
      }

      const tabHtml = this.saveTab === 'export' ? `
        <div class="save-box">
          <div class="save-meta-line">
            <span>Almas: <b>${meta.souls}</b></span>
            <span>Melhor Andar: <b>${meta.bestFloor}</b></span>
            <span>Vitórias: <b>${meta.wins}</b></span>
          </div>
          <label class="chk chk-inline ${hasExportRun ? '' : 'muted'}">
            <input type="checkbox" id="chk-export-run" ${this.saveIncludeRun && hasExportRun ? 'checked' : ''} ${hasExportRun ? '' : 'disabled'}>
            <span>${runLabel}</span>
          </label>
        </div>

        <div class="save-box">
          <h4>1. ARQUIVO DE BACKUP (.JSON)</h4>
          <p class="save-hint">Baixe um arquivo para guardar ou enviar para outro computador/celular.</p>
          <div class="save-row">
            <button type="button" id="btn-download-json" class="pixel-btn primary">BAIXAR ARQUIVO .JSON</button>
          </div>
        </div>

        <div class="save-box">
          <h4>2. CÓDIGO COPIÁVEL <small id="export-code-len" class="muted"></small></h4>
          <textarea id="export-code-box" class="save-textarea" rows="3" readonly>Gerando código...</textarea>
          <div class="save-row">
            <button type="button" id="btn-copy-code" class="pixel-btn">COPIAR CÓDIGO</button>
          </div>
        </div>

        <div class="save-box">
          <h4>3. LINK MÁGICO (ABRA EM OUTRO NAVEGADOR OU CELULAR)</h4>
          <input id="export-link-box" type="text" class="save-input" readonly value="Gerando link mágico...">
          <div class="save-row">
            <button type="button" id="btn-copy-link" class="pixel-btn">COPIAR LINK MÁGICO</button>
          </div>
        </div>
      ` : `
        ${previewHtml}
        <div class="save-box">
          <h4>1. IMPORTAR ARQUIVO .JSON</h4>
          <p class="save-hint">Selecione um arquivo .json exportado anteriormente do Crônicas do Abismo.</p>
          <div class="save-row">
            <input id="input-import-file" type="file" accept=".json,.txt,application/json" class="save-file-input">
          </div>
        </div>

        <div class="save-box">
          <h4>2. COLAR CÓDIGO, JSON OU LINK MÁGICO</h4>
          <textarea id="input-import-code" class="save-textarea" rows="4" placeholder="Cole aqui o código CA8Z1..., o conteúdo do JSON ou a URL com #save=..."></textarea>
          <div class="save-row">
            <button type="button" id="btn-apply-import-code" class="pixel-btn primary">IMPORTAR CÓDIGO / LINK</button>
          </div>
        </div>
      `;

      root.innerHTML = `
        <div class="save-modal">
          <div class="tab-bar">
            <button type="button" class="pixel-btn ${this.saveTab === 'export' ? 'selected' : ''}" data-savetab="export">EXPORTAR SAVE</button>
            <button type="button" class="pixel-btn ${this.saveTab === 'import' ? 'selected' : ''}" data-savetab="import">IMPORTAR SAVE</button>
            ${this._openedSaveFromPause && !this._pendingReloadFromSave ? '<button type="button" id="btn-save-back-pause" class="pixel-btn sm" style="margin-left:auto">VOLTAR À PAUSA</button>' : ''}
          </div>
          ${statusHtml}
          ${tabHtml}
        </div>
      `;

      root.querySelectorAll('[data-savetab]').forEach(btn => {
        btn.addEventListener('click', () => {
          G.AudioEngine.playSFX('uiMove');
          this.saveTab = btn.getAttribute('data-savetab');
          this._renderSaveModal(root);
        });
      });

      const backPauseBtn = document.getElementById('btn-save-back-pause');
      if (backPauseBtn) {
        backPauseBtn.addEventListener('click', () => this.openModal('pause'));
      }

      const playNowBtn = document.getElementById('btn-save-play-now');
      if (playNowBtn) {
        playNowBtn.addEventListener('click', () => {
          G.AudioEngine.unlock();
          G.AudioEngine.playSFX('uiConfirm');
          this._pendingReloadFromSave = false;
          this._openedSaveFromPause = false;
          if (!this.game.loadActiveRun()) {
            this.saveStatus = { type: 'err', msg: 'Não foi possível iniciar a partida importada.' };
            this._renderSaveModal(root);
          }
        });
      }

      const undoBtn = document.getElementById('btn-save-undo');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          G.AudioEngine.playSFX('uiMove');
          if (this.game.restoreLocalBackup()) {
            this._pendingReloadFromSave = false;
            if (this.game.state === 'title') this._renderTitleScreen();
            this.saveStatus = { type: 'ok', msg: 'Importação desfeita. Progresso anterior restaurado!' };
            this._renderSaveModal(root);
          }
        });
      }

      if (this.saveTab === 'export') {
        const chkRun = document.getElementById('chk-export-run');
        const codeBox = document.getElementById('export-code-box');
        const linkBox = document.getElementById('export-link-box');
        const lenEl = document.getElementById('export-code-len');

        const refreshExportStrings = async () => {
          const includeRun = !!(chkRun && !chkRun.disabled && chkRun.checked);
          this.saveIncludeRun = includeRun;
          const code = await this.game.encodeSaveCode(includeRun);
          const link = await this.game.buildMagicSaveUrl(includeRun);
          if (!codeBox.isConnected || this._saveRenderSeq !== renderSeq) return;
          codeBox.value = code;
          linkBox.value = link;
          if (lenEl) lenEl.textContent = `(${code.length} caracteres)`;
        };

        if (chkRun) {
          chkRun.addEventListener('change', () => {
            G.AudioEngine.playSFX('uiMove');
            refreshExportStrings();
          });
        }
        refreshExportStrings();

        document.getElementById('btn-download-json').addEventListener('click', () => {
          G.AudioEngine.playSFX('uiConfirm');
          const includeRun = !!(chkRun && !chkRun.disabled && chkRun.checked);
          const pkg = this.game.buildSavePackage(includeRun);
          const json = JSON.stringify(pkg, null, 2);
          const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cronicas-abismo-save-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.saveStatus = { type: 'ok', msg: 'Arquivo .json gerado e baixado!' };
          this._renderSaveModal(root);
        });

        const copyCodeBtn = document.getElementById('btn-copy-code');
        copyCodeBtn.addEventListener('click', () => {
          G.AudioEngine.playSFX('uiConfirm');
          this._copyText(codeBox.value, codeBox, copyCodeBtn, 'COPIAR CÓDIGO');
        });

        const copyLinkBtn = document.getElementById('btn-copy-link');
        copyLinkBtn.addEventListener('click', () => {
          G.AudioEngine.playSFX('uiConfirm');
          this._copyText(linkBox.value, linkBox, copyLinkBtn, 'COPIAR LINK MÁGICO');
        });
      } else {
        const confirmMagicBtn = document.getElementById('btn-confirm-magic');
        if (confirmMagicBtn && this.magicPendingPkg) {
          confirmMagicBtn.addEventListener('click', () => {
            G.AudioEngine.unlock();
            this._applyImportedSave(this.magicPendingPkg, 'Link Mágico');
          });
        }

        const discardMagicBtn = document.getElementById('btn-discard-magic');
        if (discardMagicBtn) {
          discardMagicBtn.addEventListener('click', () => {
            G.AudioEngine.playSFX('uiMove');
            this.magicPendingPkg = null;
            this.game.clearMagicSaveHash();
            this.saveStatus = { type: 'ok', msg: 'Link mágico descartado. Seu save local foi mantido.' };
            this._renderSaveModal(root);
          });
        }

        const fileInput = document.getElementById('input-import-file');
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            const content = await file.text();
            const pkg = await this.game.decodeSaveInput(content);
            G.AudioEngine.unlock();
            this._applyImportedSave(pkg, 'Arquivo .json');
          } catch (err) {
            this.saveStatus = { type: 'err', msg: err.message || 'Erro ao ler o arquivo.' };
            G.AudioEngine.playSFX('locked');
            this._renderSaveModal(root);
          }
        });

        document.getElementById('btn-apply-import-code').addEventListener('click', async () => {
          const raw = document.getElementById('input-import-code').value;
          try {
            const pkg = await this.game.decodeSaveInput(raw);
            G.AudioEngine.unlock();
            this._applyImportedSave(pkg, 'Código / Link');
          } catch (err) {
            this.saveStatus = { type: 'err', msg: err.message || 'Código ou link inválido.' };
            G.AudioEngine.playSFX('locked');
            this._renderSaveModal(root);
          }
        });
      }
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
          <p class="end-sub">Você conquistou os 6 Andares da Cidadela e purificou a Coroa Partida!</p>
          <div class="stats-table">
            <div>Classe: <b>${this.game.player.classDef.name}</b></div>
            <div>Dificuldade: <b>${this.game.difficulty.name}</b></div>
            <div>Inimigos Derrotados: <b>${st.kills}</b></div>
            <div>Tempo Total: <b>${Math.floor(st.time)}s</b></div>
          </div>
          <div class="soul-reward">+${souls} Almas Ancestrais Conquistadas!</div>
          <div class="insp-actions">
            <button type="button" id="btn-endless" class="pixel-btn warn">ABISMO INFINITO (ANDAR 7+)</button>
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
