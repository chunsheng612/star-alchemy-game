// app.js

class ParticleEngine {
    constructor() {
        this.container = document.getElementById('particles-container');
        this.colors = ['#ffb703', '#8ecae6', '#ff8fab', '#06d6a0'];
        this.sceneTimer = null;
        this.currentScene = 'hub';
        this.maxAmbientParticles = 26;
        this.setScene('hub');
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    createParticle({
        x,
        y,
        variant = 'burst',
        colors = this.colors,
        minSize = 4,
        maxSize = 10,
        duration = 1100,
        distance = [30, 100],
        driftX = null,
        driftY = null,
        opacity = [0.75, 1],
        rotate = true
    }) {
        if (!this.container) return;
        const p = document.createElement('div');
        const size = this.random(minSize, maxSize);
        p.className = `particle particle-${variant}`;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.opacity = this.random(opacity[0], opacity[1]).toFixed(2);
        p.style.setProperty('--particle-duration', `${duration}ms`);
        p.style.setProperty('--particle-scale', this.random(1.05, 1.7).toFixed(2));
        p.style.setProperty('--rot', rotate ? `${this.random(0, 360)}deg` : '0deg');

        if (driftX === null || driftY === null) {
            const angle = this.random(0, Math.PI * 2);
            const velocity = this.random(distance[0], distance[1]);
            driftX = Math.cos(angle) * velocity;
            driftY = Math.sin(angle) * velocity;
        }
        p.style.setProperty('--tx', `${driftX}px`);
        p.style.setProperty('--ty', `${driftY}px`);

        this.container.appendChild(p);
        setTimeout(() => {
            if (p.parentNode) p.parentNode.removeChild(p);
        }, duration + 60);
    }

    createExplosion(x, y, count = 20, options = {}) {
        for (let i = 0; i < count; i++) {
            this.createParticle({
                x,
                y,
                variant: options.variant || (i % 5 === 0 ? 'rune' : 'burst'),
                duration: options.duration || this.random(850, 1250),
                minSize: options.minSize || 4,
                maxSize: options.maxSize || 10,
                distance: options.distance || [35, 110],
                colors: options.colors || this.colors
            });
        }
    }

    createCelebration(x, y) {
        this.createExplosion(x, y, 24, { variant: 'burst', colors: ['#ffd166', '#ff8fab', '#8ecae6', '#caffbf'], distance: [40, 120], duration: 1300 });
        this.createExplosion(x, y, 16, { variant: 'spark', colors: ['#fff4bf', '#ffffff', '#a9def9'], distance: [25, 85], minSize: 3, maxSize: 7, duration: 900 });
    }

    createCauldronPulse(x, y) {
        this.createExplosion(x, y, 14, { variant: 'mist', colors: ['#b8f2e6', '#cddafd', '#e4c1f9'], distance: [20, 65], minSize: 6, maxSize: 14, duration: 1600 });
    }

    setScene(scene = 'hub') {
        this.currentScene = scene;
        if (this.sceneTimer) clearInterval(this.sceneTimer);

        const interval = scene === 'game' ? 520 : scene === 'shop' ? 860 : 980;
        this.sceneTimer = setInterval(() => this.spawnAmbient(scene), interval);
    }

    spawnAmbient(scene = this.currentScene) {
        if (!this.container) return;
        if (this.container.querySelectorAll('.particle-ambient, .particle-mist').length > this.maxAmbientParticles) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const palettes = {
            hub: ['#fff0a8', '#ffd6e0', '#c7f0ff'],
            map: ['#ffe08c', '#d0c1ff', '#a4f5df'],
            shop: ['#ffd6a5', '#f9f0c1', '#bde0fe'],
            game: ['#a9def9', '#d0f4de', '#e4c1f9']
        };
        const variant = scene === 'game' && Math.random() > 0.55 ? 'mist' : 'ambient';
        this.createParticle({
            x: this.random(vw * 0.08, vw * 0.92),
            y: vh + this.random(12, 40),
            variant,
            colors: palettes[scene] || palettes.hub,
            minSize: variant === 'mist' ? 10 : 4,
            maxSize: variant === 'mist' ? 18 : 8,
            duration: this.random(2400, 4200),
            driftX: this.random(-32, 32),
            driftY: this.random(-220, -120),
            opacity: variant === 'mist' ? [0.2, 0.38] : [0.32, 0.65],
            rotate: false
        });
    }
}

class DialogueManager {
    constructor(appContext) {
        this.app = appContext;
        this.overlay = document.getElementById('dialogue-overlay');
        this.dialogueBox = document.querySelector('.dialogue-box');
        this.textArea = document.getElementById('dialogue-text');
        this.nameArea = document.getElementById('dialogue-name');
        this.portrait = document.getElementById('dialogue-character-image');

        this.scriptQueue = [];
        this.isPlaying = false;

        this.dialogueBox.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.next();
        });
    }

    play(lines, onComplete) {
        if (!lines || lines.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        this.scriptQueue = [...lines];
        this.onComplete = onComplete;
        this.overlay.classList.add('show');
        this.isPlaying = true;
        this.next();
    }

    next() {
        if (this.scriptQueue.length > 0) {
            const line = this.scriptQueue.shift();
            this.applySpeaker(line);
            this.typeWriter(typeof line === 'string' ? line : line.text || '');
        } else {
            this.finish();
        }
    }

    applySpeaker(line) {
        const fallback = this.app.getCharacterProfile('iris');
        const speakerName = typeof line === 'object' && line?.speaker
            ? line.speaker
            : fallback.name;
        const portraitClass = typeof line === 'object' && line?.portrait
            ? line.portrait
            : fallback.portraitClass;
        const portraitImage = typeof line === 'object' && line?.image
            ? line.image
            : this.app.getCharacterImageForPortrait(portraitClass);

        if (this.nameArea) this.nameArea.textContent = speakerName;
        if (this.portrait) {
            this.portrait.className = portraitClass;
            this.portrait.alt = speakerName;
            this.portrait.src = portraitImage;
        }
    }

    typeWriter(text) {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.textArea.innerHTML = '';
        let i = 0;
        this.typingInterval = setInterval(() => {
            this.textArea.innerHTML += text.charAt(i);
            i++;
            if (i >= text.length) clearInterval(this.typingInterval);
        }, 30);
    }

    finish() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.overlay.classList.remove('show');
        this.isPlaying = false;
        if (this.onComplete) this.onComplete();
    }

    abort() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.overlay.classList.remove('show');
        this.isPlaying = false;
        this.scriptQueue = [];
    }
}

class QuestManager {
    constructor(appContext) {
        this.app = appContext;
        this.widget = document.getElementById('quest-widget');
        this.descEl = document.getElementById('quest-desc');
        this.claimBtn = document.getElementById('btn-quest-claim');

        this.quests = [
            { id: 'q1', text: '通關 1 次', rule: (data) => data.stats.wins >= 1, reward: 50 },
            { id: 'q2', text: '通關 5 次', rule: (data) => data.stats.wins >= 5, reward: 100 },
            { id: 'q3', text: '消耗 100 點精神力', rule: (data) => data.stats.manaSpent >= 100, reward: 150 },
            { id: 'q4', text: '累積獲得 15 顆星', rule: (data) => data.stats.stars >= 15, reward: 200 },
            { id: 'q5', text: '通過第 10 關', rule: (data) => data.highestLevel >= 11, reward: 400 },
            { id: 'q6', text: '解鎖任一稱號', rule: (data) => (data.player?.unlockedTitles?.length || 1) >= 2, reward: 250 },
            { id: 'q7', text: '通過第 30 關', rule: (data) => data.highestLevel >= 31, reward: 1000 },
            { id: 'q_max', text: '所有考核皆已通過', rule: () => false, reward: 0 }
        ];

        this.claimBtn.addEventListener('click', (e) => {
            if (!this.claimBtn.classList.contains('disabled')) {
                const rect = e.target.getBoundingClientRect();
                this.app.particles.createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
                this.claimCurrent();
            }
        });
    }

    getCurrentQuest() {
        const id = this.app.data.activeQuestId;
        return this.quests.find(q => q.id === id) || this.quests[this.quests.length - 1];
    }

    check() {
        const q = this.getCurrentQuest();
        if (q.id === 'q_max') {
            this.widget.classList.remove('show');
            return;
        }

        this.descEl.textContent = `${q.text} (獎勵: ${q.reward})`;
        if (q.rule(this.app.data)) {
            this.widget.classList.add('show');
            this.claimBtn.classList.remove('disabled');
            this.claimBtn.textContent = '領取';
        } else {
            this.widget.classList.add('show');
            this.claimBtn.classList.add('disabled');
            this.claimBtn.textContent = '進行中';
        }
    }

    claimCurrent() {
        const q = this.getCurrentQuest();
        if (q.rule(this.app.data)) {
            if (window.audio) window.audio.playLoot ? window.audio.playLoot() : window.audio.playSuccess();
            this.app.data.coins += q.reward;
            this.app.showMessage(`任務達成！獲得 ${q.reward} 星幣`);

            const idx = this.quests.findIndex(x => x.id === q.id);
            if (idx < this.quests.length - 1) {
                this.app.data.activeQuestId = this.quests[idx + 1].id;
            }
            this.app.saveData();
            this.check();
        }
    }
}


class MagicAlchemyLab {
    constructor() {
        this.sessionStarted = false;
        // Essential DOM setup
        this.els = {
            appContainer: document.getElementById('app-container'),
            bootOverlay: document.getElementById('boot-overlay'),
            bootLoader: document.getElementById('boot-loader'),
            bootStatus: document.getElementById('boot-status'),
            authCard: document.getElementById('auth-card'),
            homeSaveNote: document.getElementById('home-save-note'),
            greetingOverlay: document.getElementById('greeting-overlay'),
            greetingImage: document.getElementById('greeting-image'),
            greetingName: document.getElementById('greeting-name'),
            greetingText: document.getElementById('greeting-text'),
            views: document.querySelectorAll('.view-section'),
            viewGame: document.getElementById('view-game'),
            globalHeader: document.getElementById('global-header'),
            headerTitle: document.getElementById('header-title'),
            globalCoins: document.getElementById('global-coins'),
            btnGlobalBack: document.getElementById('btn-global-back'),
            saveToast: document.getElementById('save-toast'),
            hubTip: document.getElementById('hub-stamina-tip'),
            hubTipText: document.getElementById('hub-tip-text'),
            btnHubTipShop: document.getElementById('btn-hub-tip-shop'),
            btnGuestStart: document.getElementById('btn-guest-start'),
            btnHubHome: document.getElementById('btn-hub-home'),
            btnDailyStart: document.getElementById('btn-daily-start'),
            btnEndlessStart: document.getElementById('btn-endless-start'),
            hubPanels: Array.from(document.querySelectorAll('.hub-panel')),
            hubBottomNav: document.getElementById('hub-bottom-nav'),
            storyProgressBadge: document.getElementById('story-progress-badge'),
            storyNextTitle: document.getElementById('story-next-title'),
            storyNextDesc: document.getElementById('story-next-desc'),
            homeStoryCopy: document.getElementById('home-story-copy'),
            dailyTitle: document.getElementById('daily-title'),
            dailyDesc: document.getElementById('daily-desc'),
            dailyRuleLabel: document.getElementById('daily-rule-label'),
            dailyRewardStatus: document.getElementById('daily-reward-status'),
            weeklyCalendar: document.getElementById('weekly-calendar'),
            weeklyProgressText: document.getElementById('weekly-progress-text'),
            weeklyRewardText: document.getElementById('weekly-reward-text'),
            inventoryGrid: document.getElementById('inventory-grid'),
            btnToggleAudio: document.getElementById('btn-toggle-audio'),
            levelGrid: document.getElementById('level-grid'),
            btnMapShop: document.getElementById('btn-map-shop'),
            btnMapDaily: document.getElementById('btn-map-daily'),
            shopItems: document.getElementById('shop-items'),
            gameTitle: document.getElementById('game-title'),
            gameDesc: document.getElementById('game-desc'),
            manaVal: document.getElementById('mana-val'),
            manaFill: document.getElementById('mana-fill'),
            history: document.getElementById('history-display'),
            slots: Array.from(document.querySelectorAll('.slot')),
            palette: document.getElementById('palette-container'),
            btnSubmit: document.getElementById('btn-submit'),
            btnHint: document.getElementById('btn-hint'),
            msg: document.getElementById('game-message'),
            modal: document.getElementById('result-modal'),
            resultPanel: document.getElementById('result-panel'),
            modalTopline: document.getElementById('modal-topline'),
            modalTitle: document.getElementById('modal-title'),
            modalDesc: document.getElementById('modal-desc'),
            modalStory: document.getElementById('modal-story'),
            modalStars: document.getElementById('modal-stars'),
            modalStats: document.getElementById('modal-stats'),
            modalCoinReward: document.getElementById('modal-coin-reward'),
            modalNext: document.getElementById('modal-next'),
            btnModalAction: document.getElementById('btn-modal-action'),
            btnQuit: document.getElementById('btn-quit-game'),
            gameHeader: document.querySelector('.game-header'),
            leaderboardBox: document.getElementById('leaderboard-box'),
            hubTaskText: document.getElementById('hub-task-text'),
            heroGuideMeta: document.getElementById('hero-guide-meta'),
            storyProgressText: document.getElementById('story-progress-text'),
            dailyStatusText: document.getElementById('daily-status-text'),
            btnHeroInteract: document.getElementById('btn-hero-interact'),
            heroBubble: document.getElementById('hero-bubble'),
            hubHeroImage: document.getElementById('hub-hero-image'),
            globalStamina: document.getElementById('global-stamina'),
            confirmModal: document.getElementById('confirm-modal'),
            confirmTitle: document.getElementById('confirm-title'),
            confirmDesc: document.getElementById('confirm-desc'),
            btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
            btnConfirmOk: document.getElementById('btn-confirm-ok'),
            characterModal: document.getElementById('character-modal'),
            characterModalDesc: document.getElementById('character-modal-desc'),
            btnCharacterClose: document.getElementById('btn-character-close'),
            titleModal: document.getElementById('title-modal'),
            titleModalDesc: document.getElementById('title-modal-desc'),
            btnTitleClose: document.getElementById('btn-title-close'),
            settingsCloudTitle: document.getElementById('settings-cloud-title'),
            settingsCloudCopy: document.getElementById('settings-cloud-copy'),
            btnCloudSync: document.getElementById('btn-cloud-sync'),
            btnDeleteData: document.getElementById('btn-delete-data'),
            settingsAuthCard: document.getElementById('settings-auth-card'),
            inputConsole: document.getElementById('input-console'),
            slotsContainer: document.getElementById('slots-container'),
            questWidget: document.getElementById('quest-widget'),
            combatStage: document.getElementById('combat-stage'),
            gamePlayerImage: document.getElementById('game-player-image'),
            gamePlayerName: document.getElementById('game-player-name'),
            gamePlayerTitle: document.getElementById('game-player-title'),
            combatModeTag: document.getElementById('combat-mode-tag'),
            combatTimer: document.getElementById('combat-timer'),
            combatTimerLabelText: document.getElementById('combat-timer-label-text'),
            combatTimerValue: document.getElementById('combat-timer-value'),
            combatTimerFill: document.getElementById('combat-timer-fill'),
            combatHp: document.getElementById('combat-hp'),
            combatHpValue: document.getElementById('combat-hp-value'),
            combatHpFill: document.getElementById('combat-hp-fill'),
            combatEnemy: document.getElementById('combat-enemy'),
            combatEnemyImage: document.getElementById('combat-enemy-image'),
            combatEnemyName: document.getElementById('combat-enemy-name'),
            combatEnemyCount: document.getElementById('combat-enemy-count'),
            petInventoryGrid: document.getElementById('pet-inventory-grid'),
            btnGachaDraw: document.getElementById('btn-gacha-draw'),
            gachaOverlay: document.getElementById('gacha-overlay'),
            gachaResultImg: document.getElementById('gacha-result-img'),
            gachaResultName: document.getElementById('gacha-result-name'),
            btnGachaClose: document.getElementById('btn-gacha-close'),
            hubPetCompanion: document.getElementById('hub-pet-companion'),
            gamePetCompanion: document.getElementById('game-pet-companion')
        };

        // Greeting quotes for each character (used in boot greeting)
        this.greetingQuotes = {
            iris: [
                '早安！今天的大釜已經預熱好了，準備開工吧。',
                '歡迎回來！我整理好了待處理的委託清單。',
                '精神力充沛！今天要挑戰新的配方嗎？',
                '邊境的空氣很好，正適合煉金。'
            ],
            mentor: [
                '你來了。今天的委託難度有所提升，做好準備。',
                '別急著翻開配方，先觀察素材的排列規律。',
                '穩定比速度更重要，這是煉金的基礎。'
            ],
            scout: [
                '前線剛送來新情報，今天的委託很有趣。',
                '嗨！邊境最近很平靜，正好多練練手。',
                '我在周圍偵查了一圈，今天應該能順利。'
            ],
            broker: [
                '商品剛補貨完畢，要不要先看看有沒有需要的？',
                '今天有個不錯的交易機會，別錯過了。',
                '歡迎光臨！我這裡什麼都有。'
            ],
            rival: [
                '喲，又來了。今天打算挑戰幾關？',
                '希望你的表現能讓我提起興趣。',
                '別讓我等太久，實習生。'
            ],
            client: [
                '太好了你來了！我有個急件要拜託。',
                '今天的委託品質要求可不低哦。',
                '期待你的成品！上次那瓶非常棒。'
            ]
        };

        this.symbols = [
            { id: 'red', img: 'assets/icons/potion_red.png', name: '草莓精華' },
            { id: 'blue', img: 'assets/icons/potion_blue.png', name: '星空水滴' },
            { id: 'green', img: 'assets/icons/potion_green.png', name: '四葉草汁' },
            { id: 'yellow', img: 'assets/icons/potion_yellow.png', name: '陽光碎片' },
            { id: 'purple', img: 'assets/icons/potion_purple.png', name: '月影粉末' }
        ];

        this.levels = this.generateLevels();
        this.characters = this.getCharacterRoster();

        // ALWAYS USE V4 to prevent crashes from old save data missing objects.
        this.storageKey = 'star_alchemy_save_v7';

        // Auto-clear all old save versions to prevent stale data conflicts
        Object.keys(localStorage)
            .filter(k => k.startsWith('star_alchemy_') && k !== this.storageKey)
            .forEach(k => localStorage.removeItem(k));

        this.data = this.loadData();

        this.viewState = 'hub';
        this.previousView = 'hub';
        this.gameMode = null;
        this.currentLevel = 1;
        this.gameState = {};
        this.lastHighestLevel = this.data.highestLevel;
        this.pendingConfirmAction = null;
        this.pendingConfirmCancelAction = null;
        this.currentUser = null;
        this.activeHubPanel = 'home';
        this.bootFinished = false;
        this.bootTimers = [];
        this.combatTimerId = null;
        this.dailyChallenge = this.generateDailyChallenge();
        this.auditPuzzleCatalog();
        this.currentHubGreeter = 'iris';
        this._hubGreetingSeed = '';

        this.particles = new ParticleEngine();
        this.dialogue = new DialogueManager(this);
        this.quests = new QuestManager(this);

        this.init();
    }

    generateLevels() {
        const chapters = [
            {
                key: 'workshop',
                title: '學徒工坊',
                mentor: '伊蓮導師把規格寫在木板上。',
                orders: [
                    { title: '晨露校準', client: '藥草學助教 米菈', request: '晨課前要用的提神晨露，不能讓素材互相干擾。', rule: 'unique', ruleLabel: '純度分離', clue: '四格素材皆不可重複。', intro: '第一批校內委託終於送到我桌上。', perfect: '米菈一聞就笑了：「這批晨露比示範樣品還要乾淨。」', good: '米菈把試管收下了，但提醒我尾韻還能更俐落。', rough: '米菈勉強點頭，這瓶能用，但遠不到驚艷。', fail: '連最基礎的晨露都失手，導師只把新的空白紀錄卡默默遞給我。' },
                    { title: '暖爐回火', client: '宿舍管理員 布蘭', request: '夜裡的暖爐忽冷忽熱，要一瓶穩火補劑。', rule: 'repeat-one', ruleLabel: '回火疊加', clue: '四格中會有一種素材重複兩次。', intro: '第二張委託不是更大，而是更講究穩定。', perfect: '布蘭拍了拍暖爐外殼：「這下半夜總算不用再被冷醒。」', good: '布蘭說火勢穩了不少，只是轉熱的速度還能再俐落。', rough: '暖爐撐得住，但我自己都知道這瓶有點笨重。', fail: '火勢一度衝得太快，我差點把試驗台也一起點著。' },
                    { title: '書頁護封', client: '圖書館抄寫員 琳塔', request: '要給古書用的護封液，首尾氣味必須一致。', rule: 'bookend', ruleLabel: '首尾鎖定', clue: '最前與最後的素材會相同。', intro: '圖書館開始把真正珍貴的藏書交給我處理。', perfect: '琳塔翻了幾頁就放心了：「這層護封很安靜，正是我想要的。」', good: '琳塔說質地合格，只是起筆和收尾還不夠像同一瓶。', rough: '成品能用，但離藏書級別還差一口氣。', fail: '紙頁邊緣浮出一圈霧白，我連忙把整瓶封存起來。' },
                    { title: '貓尾安神', client: '門房 太太瑪', request: '夜班小獸一直躁動，配方裡只許留下三種氣味。', rule: 'three-types', ruleLabel: '三材濃縮', clue: '全配方只會用到三種素材。', intro: '委託人開始直接描述感受，而不再只給我數字。', perfect: '太太瑪抱著睡著的小獸，語氣終於鬆了下來。', good: '小獸安靜了些，但我知道這瓶還不夠柔順。', rough: '效果有出現，可躁氣退得太慢。', fail: '小獸聞了一下就炸毛，我只好把樣品鎖回箱底。' },
                    { title: '雙燈補劑', client: '街角燈匠 納柏', request: '兩盞魔燈要同步亮起，配方需要成對共鳴。', rule: 'twin-pairs', ruleLabel: '雙對共鳴', clue: '四格會形成兩組成對素材。', intro: '我開始接到需要節拍感的委託，而不只是單純堆數值。', perfect: '納柏把兩盞燈同時點亮，光色乾淨得像一口氣被擦亮。', good: '雙燈能同步亮起，只是亮度爬升還有些微差。', rough: '燈是亮了，但共鳴感還不夠漂亮。', fail: '兩盞燈一亮一滅，我自己都替委託人捏了把冷汗。' },
                    { title: '蜜火濃縮', client: '甜點坊 老闆 娜羅', request: '要讓烤糖火候更集中，主香得明顯壓住其他材料。', rule: 'weighted', ruleLabel: '主材主導', clue: '會有一種素材佔到一半以上。', intro: '商鋪開始找上門，代表我至少已經不是新手笑話。', perfect: '娜羅嘗了口糖漿，直接追加了一整週的份量。', good: '主香有站住，但尾段還少了那種一槌定音的厚度。', rough: '味道到了，可線條太散，像沒收好的火。', fail: '糖香剛冒頭就被雜味吞掉，整鍋只剩焦躁。' },
                    { title: '回廊節拍', client: '樂團排練員 修文', request: '回廊要用節拍霧做引導，素材得有規律交錯。', rule: 'alternating', ruleLabel: '交錯節拍', clue: '素材會以交替節奏出現。', intro: '有些委託聽上去像音樂，配方卻比節拍器還嚴格。', perfect: '修文敲了兩下指揮棒：「就是這個拍點，整條走廊都順了。」', good: '節奏有了，但轉拍時還能更俐落。', rough: '拍子沒散，只是少了讓人安心跟上的穩定感。', fail: '節拍一亂，連我自己都想把試管塞回袖口。' },
                    { title: '玻璃溫差', client: '溫室工匠 索恩', request: '新玻璃怕炸裂，相鄰材料不能互撞過熱。', rule: 'no-adjacent', ruleLabel: '避鄰穩相', clue: '相鄰位置不會放相同素材。', intro: '我開始感覺得到，自己在讀配方而不是只在猜。', perfect: '索恩摸著冷卻後的玻璃邊，滿意得幾乎要吹口哨。', good: '玻璃撐住了，但溫差曲線還不夠柔滑。', rough: '沒有炸裂已經算過關，只是這不是我想交出去的成品。', fail: '玻璃表面裂出細紋，我只能承認自己沒控穩相鄰反應。' },
                    { title: '鏡面抄寫', client: '抄本學徒 芙羅', request: '雙面抄寫液要前後對稱，否則背光會露餡。', rule: 'palindrome', ruleLabel: '鏡面回文', clue: '配方前後會互成鏡像。', intro: '第九張單子已經不只是考驗手感，而是考驗我能不能看見結構。', perfect: '芙羅把稿紙對著燈一照，滿意得眼睛都亮了。', good: '鏡像對上了，只是中段的光感還能再細。', rough: '能抄，但背光時仍有些粗糙。', fail: '背光一照就露底，這瓶抄寫液根本撐不住檢查。' },
                    { title: '五芒總驗', client: '公會考核官 維克', request: '正式升格考核，必須完整覆蓋五種素材。', rule: 'spectrum', ruleLabel: '滿星譜系', clue: '五格各自代表一種不同素材。', intro: '前九張練習單才剛結束，公會立刻把規格提升到五格。', perfect: '維克收起評分板時，表情終於露出一絲真正的認可。', good: '考核通過了，但維克提醒我五格只是下一段路的門票。', rough: '我撐過了升格線，卻也看見自己和真正熟手的差距。', fail: '五芒考核直接把我的破綻全部照亮，沒有任何藉口能躲。' }
                ]
            },
            {
                key: 'district',
                title: '街區專案',
                mentor: '伊蓮導師不再逐步提示，只留下短短的備註。',
                orders: [
                    { title: '巷口香霧', client: '香料商 艾苒', request: '夜市入口要一瓶會停留卻不刺鼻的招客霧。', rule: 'repeat-one', ruleLabel: '香核疊留', clue: '五格裡會有一種素材重複兩次。', intro: '我剛升到五格，街區商人就開始把真正要賺錢的活交給我。', perfect: '艾苒把霧瓶舉到燈下，當場說要把名字寫進長約。', good: '香氣有留住人，但層次還差最後一個轉折。', rough: '能吸引人停一下，可不夠讓人回頭。', fail: '香霧太厚，差點把整條巷子變成悶人的糖罐。' },
                    { title: '巡街訊號', client: '巡守隊副官 洛提', request: '巡街標記只能留下三種明確信號，避免誤判。', rule: 'three-types', ruleLabel: '三訊編列', clue: '五格只會使用三種素材。', intro: '現在的委託不只漂亮，還牽涉到街區運作。', perfect: '洛提只看一眼就說：「這套訊號夜巡也看得懂。」', good: '辨識度足夠，但還沒到隊伍能完全放心的程度。', rough: '訊號能辨認，只是看久了容易混。', fail: '標記混成一團，巡守隊絕對不會拿這種東西上街。' },
                    { title: '爐心續明', client: '鍛冶鋪 店主 哈維', request: '夜班鍛台需要長時間續燃，主材必須撐得住。', rule: 'weighted', ruleLabel: '主核續燃', clue: '一種素材會明顯佔據配方主體。', intro: '五格的難不只在多一格，而是每個失誤都會被放大。', perfect: '哈維看火色一穩，直接把晚班工單全推回工作台。', good: '火夠穩，但還不到讓老鍛匠完全放心的程度。', rough: '能燒，可我知道那個爐心不夠扎實。', fail: '續燃沒撐住，鍛台只留下一聲比我還失望的悶響。' },
                    { title: '封印信箋', client: '使者公會 書記 莫妮', request: '邊境信箋要首尾吻合，才能啟動封印印記。', rule: 'bookend', ruleLabel: '封印首尾', clue: '最前與最後的素材會互相呼應。', intro: '文字類委託最麻煩，因為一旦露餡就沒有模糊空間。', perfect: '莫妮把印記一壓就亮，語氣也難得柔和了些。', good: '封印能啟動，但收尾還不夠乾淨。', rough: '能用，不過還稱不上公會標準。', fail: '印記只亮了一半，信箋上的失敗兩個字簡直像在嘲笑我。' },
                    { title: '斷續霓粉', client: '舞台設計師 斐恩', request: '場燈霓粉不能在相鄰段落重複，不然會顯得笨。', rule: 'no-adjacent', ruleLabel: '避鄰折光', clue: '相鄰位置不會放相同素材。', intro: '有些需求聽起來像審美問題，實際上卻是精度問題。', perfect: '斐恩看著光階轉場，笑得像剛拿到一場大秀。', good: '過場順了，但還不到令人屏息的程度。', rough: '燈光能跑完流程，只是缺少那一下漂亮的呼吸。', fail: '霓粉在轉場時黏成一團，我自己都不忍心再多看一眼。' },
                    { title: '雙生徽印', client: '裁縫師 瑟雅', request: '兩套家徽要成雙出現，不能一邊鮮明一邊疲弱。', rule: 'split-pairs', ruleLabel: '雙對列印', clue: '五格中會形成兩組成對素材與一個獨立點。', intro: '委託變得越來越像在排版，每一格都得有位置感。', perfect: '瑟雅把兩枚徽印排在一起，滿意得立刻決定加價。', good: '徽印有成雙的味道，但平衡還不夠優雅。', rough: '徽印看得出一對，可不夠讓人一眼記住。', fail: '兩枚徽印像是硬湊在一起，完全談不上成套。' },
                    { title: '節拍快遞', client: '快遞行腳 亞可', request: '路線標記要有節拍感，讓新手也能順著跑。', rule: 'alternating', ruleLabel: '五格節奏', clue: '素材會交替排列，形成穩定節拍。', intro: '街區把我當成解決問題的人，這份信任很重。', perfect: '亞可沿著地圖走了一圈，回來時只丟下一句「快多了」。', good: '節奏是順的，只是轉折還少了些俐落。', rough: '路還看得懂，但還不到可以放心交接給新人。', fail: '標記一亂，快遞路線就像被我親手打結。' },
                    { title: '彩譜封樣', client: '寶石商 克蕾', request: '展示瓶要完整覆蓋五種色相，缺一色都不行。', rule: 'spectrum', ruleLabel: '全彩封樣', clue: '五格必須完整覆蓋五種素材。', intro: '當每一種素材都得上場時，任何偏心都會被看穿。', perfect: '克蕾把展示瓶放進櫥窗時，整條街都像被點亮。', good: '色相齊了，但亮點還沒真正站起來。', rough: '能上櫥窗，只是離吸睛還差一小段。', fail: '少一點完整感，整瓶就像被抽走了骨架。' },
                    { title: '鏡井回聲', client: '水文師 賽羅', request: '井口回聲要前後對映，讓探測值穩定回來。', rule: 'palindrome', ruleLabel: '五格回文', clue: '配方前後會呈鏡像結構。', intro: '我越來越習慣先看結構，再看顏色。這算是進步。', perfect: '賽羅聽完回聲就抬頭看我，那一眼比稱讚更有分量。', good: '回聲有回來，只是鏡像還不夠乾淨。', rough: '探測值能讀，但波形還有毛邊。', fail: '井口回聲整個歪掉，像是在把我的慌張原樣放大。' },
                    { title: '六環升格', client: '公會審核使 諾曼', request: '升格前的最後審核，正式進入六格陣列。', rule: 'crown', ruleLabel: '六環冠式', clue: '首尾相同，且整體只會出現四種素材。', intro: '五格才剛熟，審核使就把六格考題推到了我眼前。', perfect: '諾曼收卷時寫得很慢，像是在故意讓我看見「升格通過」四個字。', good: '六格你撐住了，但諾曼要我別把這當終點。', rough: '我勉強站上六格的門檻，手心卻比第一次考核還濕。', fail: '六格一展開，我才知道自己還有多少地方只是碰巧沒出錯。' }
                ]
            },
            {
                key: 'frontier',
                title: '邊境危機',
                mentor: '這一段開始，伊蓮導師只在紙角留下極短的提醒。',
                orders: [
                    { title: '三組對位', client: '前線調配官 瑪歐', request: '補給包要分成三組對位，方便夜間快速辨識。', rule: 'twin-pairs', ruleLabel: '三對列陣', clue: '六格會形成三組成對素材。', intro: '升到六格後，送來的委託已經全是邊境真工單。', perfect: '瑪歐把補給包一字排開，滿意得直接叫人開始裝車。', good: '辨識度夠，但我知道自己還能再快一點。', rough: '能交，但離前線要求的利落還差半步。', fail: '連補給標記都做不穩，前線根本不可能拿去冒風險。' },
                    { title: '邊境抑霧', client: '偵查隊員 芮娜', request: '抑霧劑只允許三種主味，避免干擾追蹤犬。', rule: 'three-types', ruleLabel: '三材抑霧', clue: '六格全程只會使用三種素材。', intro: '邊境的需求沒有模糊地帶，能用和不能用差的是命。', perfect: '芮娜把抑霧瓶別回腰側，語氣比誰都直接：「這瓶能救人。」', good: '能壓住霧，但追蹤用的乾淨度還能再高。', rough: '效果在，可現場餘味還是太重。', fail: '霧氣沒壓下去，反倒把追蹤路徑全攪亂了。' },
                    { title: '爐潮壓艙', client: '船塢技師 賈德', request: '巡防艇的壓艙爐要靠單一主核撐住整晚。', rule: 'weighted', ruleLabel: '主核壓艙', clue: '會有一種素材明顯主導整體。', intro: '我現在做的每一瓶，背後都已經連著真正的機械與人手。', perfect: '賈德把手套往肩上一甩：「這下船可以直接出港。」', good: '壓艙夠穩，只是我還沒把效率推到最好。', rough: '能撐住，但不是我理想中的前線品質。', fail: '主核一散，整座壓艙爐像在用聲音質問我。' },
                    { title: '風切穩相', client: '塔樓觀測員 伊雯', request: '高塔風切太亂，相鄰反應不能撞出重複震盪。', rule: 'no-adjacent', ruleLabel: '避鄰抗擾', clue: '相鄰位置不會出現相同素材。', intro: '邊境越往上，容錯就越薄，連相鄰的抖動都不能放過。', perfect: '伊雯看著指針穩住後，只輕輕說了一句「很好」。', good: '觀測值回穩了，但抗擾餘裕還能再拉高。', rough: '塔樓撐住了，可數據還不夠漂亮。', fail: '指針在塔頂亂抖，像把我剛才的每一步猶豫都記了下來。' },
                    { title: '返航封環', client: '前哨醫官 洛西', request: '返航病歷要用首尾一致的封環液，不然會被污染。', rule: 'bookend', ruleLabel: '封環首尾', clue: '最前與最後的素材會完全呼應。', intro: '我越來越能感受到，穩定這件事本身就是一種溫柔。', perfect: '洛西蓋章時總算鬆了口氣，那一刻我也跟著安靜下來。', good: '封環成功，但我還想把那條收尾線磨得更乾淨。', rough: '能封住，可還不夠讓醫官完全放心。', fail: '封環一斷，整份病歷都像被我親手撕開。' },
                    { title: '雙軌脈衝', client: '通訊技師 赫伯', request: '雙軌信標要規律交錯，讓遠端塔樓能鎖得住。', rule: 'alternating', ruleLabel: '雙軌節拍', clue: '六格會依固定節奏交替排列。', intro: '這一段的難，不是看懂規則，而是每次都得準時做到。', perfect: '赫伯一聽到雙塔同時回應，就把工單直接簽滿。', good: '脈衝有同步，但還不夠像真正的軍規品。', rough: '訊號能通，穩定度卻還差一口氣。', fail: '雙軌一錯拍，整個信標網路都像在嫌我不夠專注。' },
                    { title: '全譜護壁', client: '壁壘隊長 塔絲', request: '護壁劑要完整覆蓋五種素材，再補上一層強化核。', rule: 'spectrum', ruleLabel: '全譜護壁', clue: '六格會先覆蓋五種素材，再讓其中一種重複一次。', intro: '我已經不再只是過關，而是在學怎麼讓整個據點更難被擊穿。', perfect: '塔絲敲了敲已固化的護壁，語氣像終於願意把背後交給我。', good: '護壁站起來了，但還能更像一面真正的牆。', rough: '能擋，可我自己知道它撐不住最壞的那一晚。', fail: '護壁的亮紋斷成數截，我連抬頭都覺得費力。' },
                    { title: '星鏡回文', client: '占測師 莉歐', request: '占測盤的反射必須前後對映，才讀得出真正結果。', rule: 'palindrome', ruleLabel: '星鏡回文', clue: '六格會形成完整鏡像。', intro: '到了這裡，我終於懂了導師一直說的那句「先看形，再看色」。', perfect: '莉歐看著星盤回光，少見地露出真正佩服的神情。', good: '鏡像建立起來了，但我還能把中心再壓得更穩。', rough: '讀得出結果，只是星盤回光還不夠乾淨。', fail: '回光一歪，星盤就把我的不穩全部照了回來。' },
                    { title: '雙對列陣', client: '後勤總管 佩卓', request: '裝箱標記要兩組成對、兩格單點，方便戰時快速拆箱。', rule: 'split-pairs', ruleLabel: '雙對拆列', clue: '六格中會形成兩組成對素材與兩個獨立點。', intro: '我開始喜歡這種高壓感，因為它證明我真的走到了最後一段。', perfect: '佩卓看著標記流程順到不必多問，直接蓋下了優先供應章。', good: '拆列順了，但還不到我想像中那種一眼就懂。', rough: '能辨識，可不夠俐落，戰時還是嫌慢。', fail: '標記一旦不直觀，後勤現場就會先亂掉。' },
                    { title: '邊境總驗', client: '總督察 伊瑟爾', request: '最後考核：六格、冠式結構、不能讓任何一格拖後腿。', rule: 'crown', ruleLabel: '總驗冠式', clue: '首尾相同，整體只會出現四種素材，且中段會形成重心。', intro: '這是邊境實習的最後一張正式委託，也是我最不能失手的一張。', perfect: '伊瑟爾把卷宗闔上時只說了兩個字：「列名。」那比任何稱讚都重。', good: '我過了，但也清楚知道自己距離頂尖還有多遠。', rough: '我踩著邊線通過了最終考核，胸口卻還在發燙。', fail: '最終考核沒有替我留台階，它只把每個猶豫都放大給我看。' }
                ]
            }
        ];

        const baseLevels = chapters.flatMap((chapter, chapterIndex) =>
            chapter.orders.map((order, orderIndex) => {
                const id = chapterIndex * 10 + orderIndex + 1;
                const slotCount = id >= 20 ? 6 : id >= 10 ? 5 : 4;
                return this.normalizePuzzleDefinition({
                    ...order,
                    storyClue: order.clue,
                    id,
                    chapter: chapter.title,
                    chapterKey: chapter.key,
                    chapterIndex,
                    mentor: chapter.mentor,
                    slotCount,
                    name: `委託 #${id.toString().padStart(2, '0')}：${order.title}`
                });
            })
        );

        return baseLevels.concat(this.generateExtendedStoryLevels(baseLevels.length));
    }

    generateExtendedStoryLevels(baseCount = 30) {
        const chapterBlueprints = [
            {
                key: 'harbor_lockdown',
                title: '霧港封鎖',
                mentor: '霧港的來單開始夾帶航道、封鎖與調度的壓力。',
                intro: '霧港一封，整個邊境物流都會慢下來。',
                scene: '霧港航道',
                prefix: '霧港',
                clientOrg: '霧港調度署'
            },
            {
                key: 'prism_spire',
                title: '稜鏡高塔',
                mentor: '高塔觀測鏈要求的不只是正確，還要能立刻上線。',
                intro: '觀測塔一旦失真，整片防區的判讀都會跟著偏掉。',
                scene: '高塔觀測鏈',
                prefix: '稜塔',
                clientOrg: '高塔觀測局'
            },
            {
                key: 'rift_supply',
                title: '裂谷補給',
                mentor: '裂谷補給線上的每一瓶藥劑，都得能在顛簸裡保持穩定。',
                intro: '裂谷路線太長，失誤一旦進了車隊就來不及追回。',
                scene: '裂谷輸送線',
                prefix: '裂谷',
                clientOrg: '裂谷補給隊'
            },
            {
                key: 'obsidian_trace',
                title: '黑曜追跡',
                mentor: '黑曜邊線的委託更狠，規格通常只給一次。',
                intro: '追跡線需要的是乾淨、快，還有不允許重來的穩定。',
                scene: '黑曜邊線',
                prefix: '黑曜',
                clientOrg: '黑曜巡跡班'
            },
            {
                key: 'winter_watch',
                title: '冬境長夜',
                mentor: '進入冬境後，配方要能扛住的不只是規格，還有長夜。',
                intro: '冬境的長夜會放大每一次遲疑，慢半拍就可能整線斷掉。',
                scene: '冬境哨站',
                prefix: '冬境',
                clientOrg: '冬境哨站'
            },
            {
                key: 'eclipse_corridor',
                title: '星蝕迴廊',
                mentor: '七格委託正式開放，任何一格都不再只是陪襯。',
                intro: '星蝕迴廊的題目開始逼我同時顧全節奏、結構和收尾。',
                scene: '星蝕迴廊',
                prefix: '星蝕',
                clientOrg: '迴廊演算室'
            },
            {
                key: 'royal_exam',
                title: '王城總驗',
                mentor: '王城總驗只看結果，沒有任何多餘的解釋空間。',
                intro: '最終階段的委託全都直指王城防線，我得把每一步都壓到最穩。',
                scene: '王城防衛圈',
                prefix: '王城',
                clientOrg: '王城審核廳'
            }
        ];

        return chapterBlueprints.flatMap((chapter, chapterIndex) => {
            const slotCount = chapterIndex >= 5 ? 7 : 6;
            const templates = this.getAdvancedStoryTemplates(slotCount);
            const orderTitles = this.getAdvancedStoryOrderTitles(chapter.prefix);
            const names = ['瑪婕', '拓伊', '賽娜', '赫嵐', '法洛', '伊玟', '諾亞', '璃莎', '佩洛', '席安'];
            const roles = ['調度官', '觀測員', '封存師', '通訊員', '護運手', '醫官', '守塔員', '檔案官', '技師', '審核員'];

            return Array.from({ length: 10 }, (_, orderIndex) => {
                const id = baseCount + chapterIndex * 10 + orderIndex + 1;
                const template = templates[(orderIndex + chapterIndex) % templates.length];
                const timeLimit = this.getGeneratedStoryTimeLimit(id, slotCount, orderIndex);
                const client = `${chapter.clientOrg} ${roles[orderIndex % roles.length]} ${names[(orderIndex + chapterIndex) % names.length]}`;
                const title = orderTitles[orderIndex];
                const clue = `${template.storyHint(slotCount)}${timeLimit ? ` 需在 ${timeLimit} 秒內完成並提交。` : ''}`;
                const clientName = names[(orderIndex + chapterIndex) % names.length];

                return this.normalizePuzzleDefinition({
                    id,
                    chapter: chapter.title,
                    chapterKey: chapter.key,
                    chapterIndex: 3 + chapterIndex,
                    mentor: chapter.mentor,
                    slotCount,
                    name: `委託 #${id.toString().padStart(2, '0')}：${title}`,
                    title,
                    client,
                    request: `${template.request}${timeLimit ? ' 本次還附帶限時提交要求。' : ''}`,
                    rule: template.rule,
                    ruleLabel: template.ruleLabel,
                    storyClue: clue,
                    intro: `${chapter.intro}${timeLimit ? ` 這次委託還要求我每次嘗試都得在 ${timeLimit} 秒內完成。` : ''}`,
                    perfect: `${clientName} 看過成品後只點了一次頭，這瓶已能直接送進 ${chapter.scene} 的正式流程。`,
                    good: `${clientName} 收下了成品，表示規格有過，但下一批還得再更穩一點。`,
                    rough: `${clientName} 勉強接受這份成品，提醒我別把邊境流程建立在僥倖上。`,
                    fail: `${clientName} 把失敗樣品退回來，${chapter.scene} 的流程只能先停在這一步。`,
                    timeLimit
                });
            });
        });
    }

    getAdvancedStoryOrderTitles(prefix = '邊境') {
        return [
            `${prefix}封鎖列印`,
            `${prefix}巡燈導流`,
            `${prefix}倉印校正`,
            `${prefix}回聲封條`,
            `${prefix}脈衝護欄`,
            `${prefix}夜航節拍`,
            `${prefix}抑霧封箱`,
            `${prefix}觀測回環`,
            `${prefix}補給轉譜`,
            `${prefix}總驗存檔`
        ];
    }

    getAdvancedStoryTemplates(slotCount = 6) {
        const templates = [
            { rule: 'three-types', ruleLabel: '三材編列', storyHint: () => '全配方只會使用 3 種素材，而且這 3 種都一定會出現。', request: '這批調配只能留下三種明確訊號，避免現場誤判。' },
            { rule: 'weighted', ruleLabel: '主核重壓', storyHint: (count) => `會有 1 種素材明顯主導整體，至少會佔到 ${Math.floor(count / 2) + 1} 格。`, request: '委託要求有一個夠穩的主核，把整批藥劑壓住。' },
            { rule: 'no-adjacent', ruleLabel: '避鄰抗擾', storyHint: () => '任何相鄰兩格都不會出現相同素材。', request: '相鄰反應不能互撞，整體節奏要乾淨分開。' },
            { rule: 'alternating', ruleLabel: '交錯節拍', storyHint: () => '只會出現 2 種素材，並且會固定交錯排列。', request: '這份配方要有穩定拍點，讓後續流程能直接跟上。' },
            { rule: 'palindrome', ruleLabel: '鏡面回文', storyHint: () => '整體會以前後鏡像的方式排列。', request: '前後結構必須完全對映，否則校準值會整段偏掉。' },
            { rule: 'split-pairs', ruleLabel: '雙對拆列', storyHint: (count) => `會形成 2 組成對素材，外加 ${count - 4} 個單點素材。`, request: '要先把成對訊號架起來，再留單點去做尾段修正。' },
            { rule: 'triplet', ruleLabel: '三重主核', storyHint: () => '其中 1 種素材會剛好出現 3 次，其餘素材各 1 次。', request: '這批需要三重主核去穩住主反應，其他位置只做陪襯。' }
        ];

        if (slotCount === 6) {
            templates.push(
                { rule: 'twin-pairs', ruleLabel: '三對列陣', storyHint: () => '整體會形成 3 組成對素材。', request: '委託要把整批訊號拆成三組對位，方便前線快速辨識。' },
                { rule: 'spectrum', ruleLabel: '全譜護壁', storyHint: () => '五種素材都會出現，並且其中 1 種會再重複 1 次。', request: '這次需要全譜覆蓋，再額外補上一層強化核。' },
                { rule: 'crown', ruleLabel: '冠式重心', storyHint: () => '第 1、6 格相同，第 2、5 格相同，整體會形成明確重心。', request: '整體結構必須鎖出明確重心，首尾不能有任何漂移。' },
                { rule: 'bookend', ruleLabel: '封環首尾', storyHint: () => '第 1 格與最後 1 格必定相同，中間每格都要和首尾不同。', request: '這批封環液要求首尾完全呼應，中段則必須各自獨立。' }
            );
            return templates;
        }

        return templates.concat([
            { rule: 'bookend-pair', ruleLabel: '首尾雙鎖', storyHint: () => '首尾會相同，另外還會有 1 種素材剛好成對出現 2 次。', request: '委託要先鎖住首尾，再用一組成對素材把中段壓穩。' },
            { rule: 'spectrum-plus', ruleLabel: '全譜雙補', storyHint: () => '五種素材都會出現，並且其中 2 種會各再多出現 1 次。', request: '這批藥劑要先覆蓋全譜，再額外補兩段強化訊號。' }
        ]);
    }

    getGeneratedStoryTimeLimit(levelId, slotCount, orderIndex) {
        const cycleIndex = (levelId - 1) % 10;
        if (![1, 4, 7].includes(cycleIndex)) return 0;
        const chapterDepth = Math.floor((levelId - 31) / 10);
        const base = slotCount >= 7 ? 25 : 30;
        return Math.max(slotCount >= 7 ? 18 : 22, base - chapterDepth * 2 - (orderIndex % 2));
    }

    getCharacterRoster() {
        return {
            iris: {
                id: 'iris',
                name: '艾莉絲',
                role: '邊境實習煉金師',
                portraitClass: 'portrait-iris',
                image: 'assets/char_alchemist.png',
                summary: '剛從學苑被派往邊境據點，擅長把混亂委託整理成可執行的配方。'
            },
            mentor: {
                id: 'mentor',
                name: '伊蓮導師',
                role: '工坊導師',
                portraitClass: 'portrait-mentor',
                image: 'assets/char_mentor.png',
                summary: '負責審核委託規格與升格考核，說話簡短，但每句都指向重點。'
            },
            scout: {
                id: 'scout',
                name: '洛提',
                role: '巡守副官',
                portraitClass: 'portrait-scout',
                image: 'assets/char_scout.png',
                summary: '前線與街區之間的聯絡人，總把危險與時限一起帶進工坊。'
            },
            broker: {
                id: 'broker',
                name: '瑟芙琳',
                role: '商會聯絡員',
                portraitClass: 'portrait-broker',
                image: 'assets/char_broker.png',
                summary: '負責供應、商店與黑市消息，對報價和效率都異常敏感。'
            },
            rival: {
                id: 'rival',
                name: '賽希莉亞',
                role: '黑曜石學苑見習官',
                portraitClass: 'portrait-rival',
                image: 'assets/char_rival.png',
                summary: '帶著些微笑意，專注於挖掘公會隱藏配方的競爭對手。'
            },
            client: {
                id: 'client',
                name: '凱文',
                role: '冒險者',
                portraitClass: 'portrait-client',
                image: 'assets/char_client.png',
                summary: '雖然只是委託人，但他對藥劑的品質非常挑剔。'
            }
        };
    }

    getPetCatalog() {
        return [
            { id: 'p1', name: '星光貓頭鷹', image: 'assets/pets/pet_starry_owl.png' },
            { id: 'p2', name: '懸浮魔法書', image: 'assets/pets/pet_floating_book.png' },
            { id: 'p3', name: '寶石小飛龍', image: 'assets/pets/pet_tiny_dragon.png' },
            { id: 'p4', name: '月光貓', image: 'assets/pets/1.png' },
            { id: 'p5', name: '太陽鳳凰', image: 'assets/pets/2.png' },
            { id: 'p6', name: '雲朵水母', image: 'assets/pets/3.png' },
            { id: 'p7', name: '水晶蜘蛛', image: 'assets/pets/4.png' },
            { id: 'm1', name: '星露史萊姆', image: 'assets/enemies/starry_slime.png' },
            { id: 'm2', name: '霧嵐水母', image: 'assets/enemies/mist_jellyfish.png' },
            { id: 'm3', name: '葉翼龍', image: 'assets/enemies/leafy_dragon.png' },
            { id: 'm4', name: '晶甲龜', image: 'assets/enemies/crystal_turtle.png' },
            { id: 'm5', name: '燼火狐', image: 'assets/enemies/cinder_fox.png' },
            { id: 'm6', name: '雲綿獸', image: 'assets/enemies/cloud_sheep.png' },
            { id: 'm7', name: '耀陽精靈', image: 'assets/enemies/solar_sprite.png' },
            { id: 'm8', name: '月光梟', image: 'assets/enemies/moonlight_owl.png' },
            { id: 'm9', name: '影貓', image: 'assets/enemies/shadow_cat.png' },
            { id: 'm10', name: '發條鳥', image: 'assets/enemies/clockwork_bird.png' },
            { id: 'v1', name: '黃金史萊姆', image: 'assets/enemies/starry_slime.png', filter: 'brightness(1.2) sepia(1) saturate(10) hue-rotate(-10deg)' },
            { id: 'v2', name: '虛空狐', image: 'assets/enemies/cinder_fox.png', filter: 'hue-rotate(180deg) brightness(0.8)' },
            { id: 'v3', name: '紅寶石龜', image: 'assets/enemies/crystal_turtle.png', filter: 'hue-rotate(-45deg) saturate(2)' }
        ];
    }

    getPlayableCharacters() {
        return [
            {
                id: 'female',
                name: '露米娜',
                gender: '女生',
                role: '星燄煉金術師',
                stages: [
                    { label: '學徒袍', unlockLevel: 1, image: 'assets/chars/female_stage1.png' },
                    { label: '街區調律裝', unlockLevel: 11, image: 'assets/chars/female_stage2.png' },
                    { label: '邊境星冠裝', unlockLevel: 21, image: 'assets/chars/female_stage3.png' },
                    { label: '傳奇賢者裝', unlockLevel: 31, image: 'assets/chars/female_stage4.png' }
                ]
            },
            {
                id: 'male',
                name: '亞斯特',
                gender: '男生',
                role: '月鋼煉金術師',
                stages: [
                    { label: '學徒袍', unlockLevel: 1, image: 'assets/chars/male_stage1.png' },
                    { label: '街區調律裝', unlockLevel: 11, image: 'assets/chars/male_stage2.png' },
                    { label: '邊境星冠裝', unlockLevel: 21, image: 'assets/chars/male_stage3.png' },
                    { label: '傳奇賢者裝', unlockLevel: 31, image: 'assets/chars/male_stage4.png' }
                ]
            }
        ];
    }

    getTitleCatalog() {
        return [
            {
                id: 'apprentice',
                name: '見習煉金師',
                cost: 0,
                maxLevel: 1,
                desc: '初始稱號，沒有額外加成。',
                levelDesc: () => '初始稱號，沒有額外加成。',
                effects: {},
                levelEffects: () => ({})
            },
            {
                id: 'frontier_focus',
                name: '邊境專注者',
                cost: 500,
                maxLevel: 10,
                desc: '故事委託精神力上限 +15。',
                levelDesc: (lv) => `故事委託精神力上限 +${15 + (lv - 1) * 5}。`,
                effects: { storyManaBonus: 15 },
                levelEffects: (lv) => ({ storyManaBonus: 15 + (lv - 1) * 5 })
            },
            {
                id: 'starlight_reader',
                name: '星圖解讀者',
                cost: 500,
                maxLevel: 10,
                desc: '每日挑戰精神力上限 +20。',
                levelDesc: (lv) => `每日挑戰精神力上限 +${20 + (lv - 1) * 5}。`,
                effects: { dailyManaBonus: 20 },
                levelEffects: (lv) => ({ dailyManaBonus: 20 + (lv - 1) * 5 })
            },
            {
                id: 'spell_duelist',
                name: '咒語決鬥者',
                cost: 500,
                maxLevel: 10,
                desc: '無盡討伐得分 +20%，HP +1。',
                levelDesc: (lv) => `無盡討伐得分 +${20 + (lv - 1) * 5}%，HP +${1 + Math.floor((lv - 1) / 3)}。`,
                effects: { endlessScoreBonus: 0.2, endlessHpBonus: 1 },
                levelEffects: (lv) => ({ endlessScoreBonus: 0.2 + (lv - 1) * 0.05, endlessHpBonus: 1 + Math.floor((lv - 1) / 3) })
            },
            {
                id: 'grand_alchemist',
                name: '星冠煉金術師',
                cost: 500,
                maxLevel: 10,
                desc: '故事與每日精神力 +10，無盡得分 +10%。',
                levelDesc: (lv) => `故事與每日精神力 +${10 + (lv - 1) * 3}，無盡得分 +${10 + (lv - 1) * 3}%。`,
                effects: { storyManaBonus: 10, dailyManaBonus: 10, endlessScoreBonus: 0.1 },
                levelEffects: (lv) => ({ storyManaBonus: 10 + (lv - 1) * 3, dailyManaBonus: 10 + (lv - 1) * 3, endlessScoreBonus: 0.1 + (lv - 1) * 0.03 })
            }
        ];
    }

    getPlayableCharacter(id = this.data?.player?.selectedCharacter) {
        const roster = this.getPlayableCharacters();
        return roster.find((character) => character.id === id) || roster[0];
    }

    getPlayerStageIndex() {
        if ((this.data?.highestLevel || 1) >= 31) return 3;
        if ((this.data?.highestLevel || 1) >= 21) return 2;
        if ((this.data?.highestLevel || 1) >= 11) return 1;
        return 0;
    }

    getPlayerStage(character = this.getPlayableCharacter()) {
        const stageIndex = this.getPlayerStageIndex();
        return character.stages[stageIndex] || character.stages[0];
    }

    getActiveTitle() {
        const catalog = this.getTitleCatalog();
        const title = catalog.find((t) => t.id === this.data?.player?.activeTitle) || catalog[0];
        return title;
    }

    getActiveTitleLevel() {
        return (this.data?.player?.titleLevels?.[this.data?.player?.activeTitle]) || 1;
    }

    getTitleLevel(titleId) {
        return (this.data?.player?.titleLevels?.[titleId]) || 1;
    }

    getTitleUpgradeCost(titleId) {
        const title = this.getTitleCatalog().find(t => t.id === titleId);
        if (!title) return Infinity;
        const currentLevel = this.getTitleLevel(titleId);
        if (currentLevel >= (title.maxLevel || 10)) return Infinity;
        // Level 1→2: 500*2^0=500, Level 2→3: 500*2^1=1000, Level 3→4: 500*2^2=2000 ...
        return Math.floor(title.cost * Math.pow(2, currentLevel - 1));
    }

    getModeMaxMana(mode = this.gameMode) {
        const title = this.getActiveTitle();
        const level = this.getActiveTitleLevel();
        const effects = title.levelEffects ? title.levelEffects(level) : (title.effects || {});
        if (mode === 'story') return this.data.maxMana + (effects.storyManaBonus || 0);
        if (mode === 'daily') return this.data.maxMana + (effects.dailyManaBonus || 0);
        return this.data.maxMana;
    }

    getEndlessScoreMultiplier() {
        const title = this.getActiveTitle();
        const level = this.getActiveTitleLevel();
        const effects = title.levelEffects ? title.levelEffects(level) : (title.effects || {});
        return 1 + (effects.endlessScoreBonus || 0);
    }

    getEndlessMaxHp() {
        const title = this.getActiveTitle();
        const level = this.getActiveTitleLevel();
        const effects = title.levelEffects ? title.levelEffects(level) : (title.effects || {});
        return 3 + (effects.endlessHpBonus || 0);
    }

    getEndlessTimeLimit(slotCount = this.gameState.slotCount || 3) {
        return Math.max(10, 23 - slotCount * 2);
    }

    getEnemyRoster() {
        return [
            { id: 'starry_slime', name: '星露史萊姆', image: 'assets/enemies/starry_slime.png' },
            { id: 'cinder_fox', name: '燼火狐影', image: 'assets/enemies/cinder_fox.png' },
            { id: 'leafy_dragon', name: '葉冠小龍', image: 'assets/enemies/leafy_dragon.png' },
            { id: 'moonlight_owl', name: '月光梟', image: 'assets/enemies/moonlight_owl.png' },
            { id: 'solar_sprite', name: '日曜精靈', image: 'assets/enemies/solar_sprite.png' },
            { id: 'mist_jellyfish', name: '霧海水母', image: 'assets/enemies/mist_jellyfish.png' },
            { id: 'crystal_turtle', name: '晶甲龜', image: 'assets/enemies/crystal_turtle.png' },
            { id: 'shadow_cat', name: '影尾貓', image: 'assets/enemies/shadow_cat.png' },
            { id: 'clockwork_bird', name: '齒輪鳥', image: 'assets/enemies/clockwork_bird.png' },
            { id: 'cloud_sheep', name: '雲綿獸', image: 'assets/enemies/cloud_sheep.png' }
        ];
    }

    getEnemyForOrder(orderCount = 1) {
        const roster = this.getEnemyRoster();
        return roster[(orderCount - 1) % roster.length];
    }

    getCharacterProfile(id = 'iris') {
        return this.characters[id] || this.characters.iris;
    }

    getCharacterImageForPortrait(portraitClass = 'portrait-iris') {
        const profile = Object.values(this.characters).find(character => character.portraitClass === portraitClass);
        return profile?.image || this.getCharacterProfile('iris').image;
    }

    getRandomCharacterId(excludeId = '') {
        const ids = Object.keys(this.characters);
        const pool = excludeId && ids.length > 1 ? ids.filter((id) => id !== excludeId) : ids;
        return pool[Math.floor(Math.random() * pool.length)] || 'iris';
    }

    getHubGuideMeta(panelId = this.activeHubPanel) {
        const nextLevel = this.getStoryProgressLevel();
        const todayRewardReady = this.canClaimDailyReward();
        const remainingWeekly = Math.max(0, 7 - this.data.weekly.stamps.length);

        switch (panelId) {
            case 'missions':
                return nextLevel
                    ? `任務清單已打開，下一張是第 ${nextLevel.id} 關「${nextLevel.title}」。`
                    : '主線已全數結案，仍可重刷已解鎖委託。';
            case 'daily':
                return todayRewardReady
                    ? `先打每日挑戰可拿今日 500 星幣；無盡討伐會消耗 30 體力並累積得分。`
                    : `今日 500 星幣已領取，仍可練每日或打無盡討伐；本週再完成 ${remainingWeekly} 天可多拿 500。`;
            case 'inventory':
                return this.data.stamina >= 10
                    ? `人物、稱號與背包強化都在這裡，稱號會直接影響故事、每日與無盡討伐。`
                    : `目前體力 ${this.data.stamina}/100，可以先配置稱號，再補給或挑戰每日。`;
            case 'settings':
                return this.currentUser
                    ? `已登入 ${this.currentUser.displayName || '玩家'}，進度會先保存在裝置，再自動同步雲端；需要時可手動上傳。`
                    : '目前是本機存檔模式；登入 Google 後，金幣、體力與關卡進度都會自動同步到雲端。';
            case 'home':
            default:
                return nextLevel
                    ? `底部中央「任務」會打開選關，下一張是第 ${nextLevel.id} 關「${nextLevel.title}」。`
                    : '主線已全數結案，現在可以重刷任務、每日與無盡討伐。';
        }
    }

    refreshHubGuide({ rerollCharacter = false, panelId = this.activeHubPanel } = {}) {
        if (rerollCharacter || !this.characters[this.currentHubGreeter]) {
            this.currentHubGreeter = this.getRandomCharacterId(this.currentHubGreeter);
            this._hubGreetingSeed = '';
        }

        const character = this.getCharacterProfile(this.currentHubGreeter);
        const quotes = this.greetingQuotes[this.currentHubGreeter] || this.greetingQuotes.iris;
        let quote = this._hubGreetingSeed;
        if (!quote) {
            quote = quotes[Math.floor(Math.random() * quotes.length)] || '準備好就開始吧。';
            this._hubGreetingSeed = quote;
        }

        if (this.els.hubHeroImage) {
            this.els.hubHeroImage.src = character.image;
            this.els.hubHeroImage.alt = character.name;
        }
        if (this.els.hubTaskText) {
            this.els.hubTaskText.textContent = quote;
        }
        if (this.els.heroGuideMeta) {
            this.els.heroGuideMeta.textContent = this.getHubGuideMeta(panelId);
        }
    }

    getPortraitForLevel(level) {
        if (!level) return this.getCharacterProfile('iris').portraitClass;
        // Logic to pick a portrait based on chapter or client name
        const clientName = level.client || '';
        if (clientName.includes('洛西') || clientName.includes('斥侯')) return 'portrait-scout';
        if (clientName.includes('莫妮') || clientName.includes('書記')) return 'portrait-broker';
        if (clientName.includes('琳塔') || clientName.includes('抄寫員')) return 'portrait-mentor';
        if (clientName.includes('賽希莉亞')) return 'portrait-rival';
        return 'portrait-client';
    }

    getClientSpeakerName(level) {
        if (!level?.client) return '委託人';
        const parts = level.client.trim().split(/\s+/);
        return parts[parts.length - 1] || level.client;
    }

    getStoryProgressLevel() {
        if (this.data.highestLevel > this.levels.length) return null;
        const nextId = Math.min(this.data.highestLevel, this.levels.length);
        return this.levels.find(level => level.id === nextId) || this.levels[this.levels.length - 1];
    }

    buildLevelIntro(level) {
        const previousStars = level.id > 1 ? (this.data.levelStars[level.id - 1] || 0) : 0;
        let progressLine = level.intro;

        if (level.id === 1) {
            progressLine = '實習第一天，我終於拿到屬於自己的正式委託。';
        } else if (level.id === 10) {
            progressLine = '前九張單子才讓我站穩腳步，公會立刻把規格提升到五格。';
        } else if (level.id === 20) {
            progressLine = '五格才剛熟，考核就正式升到六格，沒有緩衝。';
        } else if (previousStars >= 3) {
            progressLine = `上一單的評價很漂亮，所以這次送來的是更挑人的 ${level.title}。`;
        } else if (previousStars === 2) {
            progressLine = `上一單算是穩住了，但這張 ${level.title} 顯然不打算讓我輕鬆過關。`;
        } else if (previousStars === 1) {
            progressLine = `上一單只拿到勉強及格，這次我不能再讓 ${level.client} 等著看我修正。`;
        }

        const lines = [
            {
                speaker: this.getCharacterProfile('iris').name,
                portrait: this.getCharacterProfile('iris').portraitClass,
                text: progressLine
            },
            {
                speaker: this.getClientSpeakerName(level),
                portrait: this.getPortraitForLevel(level),
                text: `${level.client} 的需求是：「${level.request}」`
            }
        ];

        if (level.id % 5 === 0) {
            lines.push({
                speaker: this.getCharacterProfile('rival').name,
                portrait: this.getCharacterProfile('rival').portraitClass,
                text: `居然能接到這種單子？可別把它搞砸了，實習生。`
            });
        } else if (level.id % 3 === 0) {
            lines.push({
                speaker: this.getCharacterProfile('scout').name,
                portrait: this.getCharacterProfile('scout').portraitClass,
                text: `邊境的動靜有些異常，這次提煉請務必謹慎。`
            });
        }

        lines.push({
            speaker: this.getCharacterProfile('mentor').name,
            portrait: this.getCharacterProfile('mentor').portraitClass,
            text: `提示：本次屬於「${level.ruleLabel}」規格，${level.clue}`
        });

        return lines;
    }

    buildVictoryDialogue(level, stars) {
        const milestone = this.getMilestoneLine(level.id, stars);
        let opener = level.rough;
        if (stars === 3) opener = level.perfect;
        else if (stars === 2) opener = level.good;

        const lines = [
            {
                speaker: this.getClientSpeakerName(level),
                portrait: this.getPortraitForLevel(level),
                text: opener
            }
        ];

        if (stars === 3 && level.id % 4 === 0) {
            lines.push({
                speaker: this.getCharacterProfile('rival').name,
                portrait: this.getCharacterProfile('rival').portraitClass,
                text: `哼...算你運氣好，這次的成品連我都挑不出毛病。但下次就沒這麼簡單了。`
            });
        }

        if (milestone) {
            lines.push({
                speaker: this.getCharacterProfile('mentor').name,
                portrait: this.getCharacterProfile('mentor').portraitClass,
                text: `做得好。我一直都知道你可以順利處理這種級別的難題。`
            });
            lines.push({
                speaker: this.getCharacterProfile('iris').name,
                portrait: this.getCharacterProfile('iris').portraitClass,
                text: milestone
            });
        }
        return lines;
    }

    buildFailureDialogue(level) {
        const recovery = level.id >= 20
            ? '六格不是靠運氣能撐過去的，我得把每一次判斷都磨得更乾淨。'
            : level.id >= 10
                ? '五格開始，任何猶豫都會被放大。我得把節奏找回來。'
                : '這還只是前段委託，失誤可以記下來，但不能重演。';
        const lines = [
            {
                speaker: this.getClientSpeakerName(level),
                portrait: this.getPortraitForLevel(level),
                text: level.fail
            }
        ];

        if (level.id % 3 === 0) {
            lines.push({
                speaker: this.getCharacterProfile('rival').name,
                portrait: this.getCharacterProfile('rival').portraitClass,
                text: `就這點程度？看來公會的標準還要再提高才行啊。`
            });
        }

        lines.push({
            speaker: this.getCharacterProfile('iris').name,
            portrait: this.getCharacterProfile('iris').portraitClass,
            text: recovery
        });

        lines.push({
            speaker: this.getCharacterProfile('mentor').name,
            portrait: this.getCharacterProfile('mentor').portraitClass,
            text: `別氣餒，先去大廳休息一下，把剛才的失誤記錄下來，公會的卷宗隨時向你開放。`
        });

        return lines;
    }

    getMilestoneLine(levelId, stars) {
        if (levelId === 10) {
            return stars === 3
                ? '五格升格考核我不只過關，還拿到了能抬頭說話的成績。'
                : '五格的大門打開了，接下來就不是靠基本功能混過去的區域。';
        }
        if (levelId === 20) {
            return stars === 3
                ? '六格考核穩住了，代表我真的開始有資格碰邊境核心委託。'
                : '六格終於撐住，但這只證明我有資格繼續更難的部分。';
        }
        if (levelId === 30) {
            return stars === 3
                ? '最後考核拿到近乎滿分，這已經不是實習生會被給出的評價。'
                : '最終考核結束了。無論分數怎麼樣，我都知道自己已經走到另一個階段。';
        }
        if (levelId % 10 === 0) {
            return '這一段的收尾終於站穩了，下一批委託肯定會更難。';
        }
        if (levelId >= 21) return '邊境委託越來越重，但我也越來越像能扛起它的人。';
        if (levelId >= 11) return '五格之後，判斷開始比直覺更重要，而我確實有在進步。';
        return '每完成一張單子，我都更能分辨自己到底是哪裡變穩了。';
    }

    getDefaultData() {
        return {
            coins: 100,
            maxMana: 100,
            maxStamina: 100,
            highestLevel: 1,
            levelStars: {},
            stamina: 100,
            lastEnergyTime: Date.now(),
            updatedAt: Date.now(),
            activeQuestId: 'q1',
            upgrades: { shopLevels: {} },
            stats: { wins: 0, manaSpent: 0, stars: 0, endlessPlayed: 0, coinsSpent: 0, dailyWins: 0, endlessBestScore: 0, endlessBestDefeated: 0 },
            daily: { rewardDate: '', bestDate: '', bestTurns: 0, lastPlayedDate: '', playCount: 0 },
            weekly: { cycleStart: '', stamps: [], rewardClaimed: false },
            player: { selectedCharacter: 'female', unlockedTitles: ['apprentice'], activeTitle: 'apprentice', titleLevels: {}, ownedPets: [], activePet: null },
            settings: { bootSeen: false, guestStarted: false }
        };
    }

    normalizeData(rawData = null) {
        const defaultData = this.getDefaultData();
        const source = rawData && typeof rawData === 'object' ? rawData : {};
        const now = Date.now();
        const clampInt = (value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
            const numeric = Math.floor(Number(value));
            if (!Number.isFinite(numeric)) return fallback;
            return Math.min(max, Math.max(min, numeric));
        };

        const merged = {
            ...defaultData,
            ...source,
            levelStars: { ...defaultData.levelStars, ...(source.levelStars || {}) },
            upgrades: { ...defaultData.upgrades, ...(source.upgrades || {}) },
            stats: { ...defaultData.stats, ...(source.stats || {}) },
            daily: { ...defaultData.daily, ...(source.daily || {}) },
            weekly: { ...defaultData.weekly, ...(source.weekly || {}) },
            player: { ...defaultData.player, ...(source.player || {}) },
            settings: { ...defaultData.settings, ...(source.settings || {}) }
        };

        merged.coins = clampInt(merged.coins, defaultData.coins);
        merged.maxMana = clampInt(merged.maxMana, defaultData.maxMana, 20);
        merged.highestLevel = clampInt(merged.highestLevel, defaultData.highestLevel, 1);
        if (merged.maxStamina === undefined) merged.maxStamina = 100;
        merged.stamina = clampInt(merged.stamina, defaultData.stamina, 0, merged.maxStamina);
        merged.lastEnergyTime = clampInt(merged.lastEnergyTime, now, 0, now);
        merged.updatedAt = clampInt(merged.updatedAt, now, 0, now);
        merged.activeQuestId = typeof merged.activeQuestId === 'string' ? merged.activeQuestId : defaultData.activeQuestId;

        merged.upgrades = {
            shopLevels: (merged.upgrades && typeof merged.upgrades.shopLevels === 'object') ? merged.upgrades.shopLevels : {}
        };

        merged.stats = {
            wins: clampInt(merged.stats.wins, 0),
            manaSpent: clampInt(merged.stats.manaSpent, 0),
            stars: clampInt(merged.stats.stars, 0),
            endlessPlayed: clampInt(merged.stats.endlessPlayed, 0),
            coinsSpent: clampInt(merged.stats.coinsSpent, 0),
            dailyWins: clampInt(merged.stats.dailyWins, 0),
            endlessBestScore: clampInt(merged.stats.endlessBestScore, 0),
            endlessBestDefeated: clampInt(merged.stats.endlessBestDefeated, 0)
        };

        merged.daily = {
            rewardDate: typeof merged.daily.rewardDate === 'string' ? merged.daily.rewardDate : '',
            bestDate: typeof merged.daily.bestDate === 'string' ? merged.daily.bestDate : '',
            bestTurns: clampInt(merged.daily.bestTurns, 0),
            lastPlayedDate: typeof merged.daily.lastPlayedDate === 'string' ? merged.daily.lastPlayedDate : '',
            playCount: clampInt(merged.daily.playCount, 0)
        };

        merged.weekly = {
            cycleStart: typeof merged.weekly.cycleStart === 'string' ? merged.weekly.cycleStart : '',
            stamps: Array.isArray(merged.weekly.stamps)
                ? merged.weekly.stamps.filter((stamp) => typeof stamp === 'string')
                : [],
            rewardClaimed: Boolean(merged.weekly.rewardClaimed)
        };

        const playableIds = new Set(this.getPlayableCharacters().map((character) => character.id));
        const titleIds = new Set(this.getTitleCatalog().map((title) => title.id));
        const unlockedTitles = Array.isArray(merged.player.unlockedTitles)
            ? merged.player.unlockedTitles.filter((titleId) => titleIds.has(titleId))
            : [];
        if (!unlockedTitles.includes('apprentice')) unlockedTitles.unshift('apprentice');

        const titleLevels = (merged.player && typeof merged.player.titleLevels === 'object') ? merged.player.titleLevels : {};
        merged.player = {
            selectedCharacter: playableIds.has(merged.player.selectedCharacter) ? merged.player.selectedCharacter : defaultData.player.selectedCharacter,
            unlockedTitles,
            activeTitle: unlockedTitles.includes(merged.player.activeTitle) ? merged.player.activeTitle : 'apprentice',
            titleLevels,
            ownedPets: Array.isArray(merged.player.ownedPets) ? merged.player.ownedPets : [],
            activePet: merged.player.activePet || null
        };

        merged.settings = {
            bootSeen: Boolean(merged.settings.bootSeen),
            guestStarted: Boolean(merged.settings.guestStarted)
        };

        merged.levelStars = Object.fromEntries(
            Object.entries(merged.levelStars).map(([levelId, stars]) => [levelId, clampInt(stars, 0, 0, 3)])
        );

        if (merged.stamina < merged.maxStamina) {
            const elapsedMin = Math.floor((now - merged.lastEnergyTime) / 60000);
            if (elapsedMin > 0) {
                merged.stamina = Math.min(merged.maxStamina, merged.stamina + elapsedMin);
                merged.lastEnergyTime += elapsedMin * 60000;
            }
        } else {
            merged.lastEnergyTime = now;
        }

        return merged;
    }

    getSerializableData(data = this.data, { touchTimestamp = true } = {}) {
        const serialized = this.normalizeData(data);
        if (touchTimestamp) serialized.updatedAt = Date.now();
        return serialized;
    }

    getSaveProgressVector(data = null) {
        const save = data || this.getDefaultData();
        const totalStars = Object.values(save.levelStars || {}).reduce((sum, stars) => sum + (Number(stars) || 0), 0);
        const titleLevelTotal = Object.values(save.player?.titleLevels || {}).reduce((sum, level) => sum + (Number(level) || 0), 0);
        const shopLevelTotal = Object.values(save.upgrades?.shopLevels || {}).reduce((sum, level) => sum + (Number(level) || 0), 0);

        return [
            save.highestLevel || 1,
            totalStars,
            (save.player?.unlockedTitles || []).length,
            titleLevelTotal,
            save.maxMana || 0,
            save.maxStamina || 0,
            shopLevelTotal,
            save.stats?.wins || 0,
            save.stats?.dailyWins || 0,
            save.stats?.endlessBestDefeated || 0,
            save.stats?.endlessBestScore || 0,
            save.stats?.coinsSpent || 0
        ];
    }

    compareSaveProgress(firstData = null, secondData = null) {
        const firstVector = this.getSaveProgressVector(firstData);
        const secondVector = this.getSaveProgressVector(secondData);

        for (let i = 0; i < firstVector.length; i++) {
            if (firstVector[i] !== secondVector[i]) {
                return firstVector[i] > secondVector[i] ? 1 : -1;
            }
        }

        const firstTime = Number(firstData?.updatedAt) || 0;
        const secondTime = Number(secondData?.updatedAt) || 0;
        if (firstTime === secondTime) return 0;
        return firstTime > secondTime ? 1 : -1;
    }

    mergeSaveData(firstData = null, secondData = null) {
        const createEmptyState = () => {
            const empty = this.getDefaultData();
            empty.updatedAt = 0;
            return empty;
        };

        const left = firstData ? this.normalizeData(firstData) : createEmptyState();
        const right = secondData ? this.normalizeData(secondData) : createEmptyState();
        const preferred = this.compareSaveProgress(left, right) >= 0 ? left : right;
        const fallback = preferred === left ? right : left;
        const newer = left.updatedAt >= right.updatedAt ? left : right;
        const older = newer === left ? right : left;

        const merged = this.normalizeData(preferred);
        merged.maxMana = Math.max(left.maxMana, right.maxMana);
        merged.maxStamina = Math.max(left.maxStamina, right.maxStamina);
        merged.highestLevel = Math.max(left.highestLevel, right.highestLevel);
        merged.levelStars = {};

        const allStarLevels = new Set([
            ...Object.keys(left.levelStars || {}),
            ...Object.keys(right.levelStars || {})
        ]);
        allStarLevels.forEach((levelId) => {
            merged.levelStars[levelId] = Math.max(left.levelStars[levelId] || 0, right.levelStars[levelId] || 0);
        });

        const mergedShopLevels = { ...(right.upgrades?.shopLevels || {}), ...(left.upgrades?.shopLevels || {}) };
        Object.keys(mergedShopLevels).forEach(k => {
            mergedShopLevels[k] = Math.max(left.upgrades?.shopLevels?.[k] || 0, right.upgrades?.shopLevels?.[k] || 0);
        });
        merged.upgrades = {
            shopLevels: mergedShopLevels
        };

        merged.stats = {
            wins: Math.max(left.stats.wins, right.stats.wins),
            manaSpent: Math.max(left.stats.manaSpent, right.stats.manaSpent),
            stars: Math.max(left.stats.stars, right.stats.stars),
            endlessPlayed: Math.max(left.stats.endlessPlayed, right.stats.endlessPlayed),
            coinsSpent: Math.max(left.stats.coinsSpent, right.stats.coinsSpent),
            dailyWins: Math.max(left.stats.dailyWins, right.stats.dailyWins),
            endlessBestScore: Math.max(left.stats.endlessBestScore, right.stats.endlessBestScore),
            endlessBestDefeated: Math.max(left.stats.endlessBestDefeated, right.stats.endlessBestDefeated)
        };

        merged.daily = {
            rewardDate: newer.daily.rewardDate || older.daily.rewardDate || '',
            bestDate: newer.daily.bestDate || older.daily.bestDate || '',
            bestTurns: newer.daily.bestTurns && older.daily.bestTurns
                ? Math.min(newer.daily.bestTurns, older.daily.bestTurns)
                : Math.max(newer.daily.bestTurns || 0, older.daily.bestTurns || 0),
            lastPlayedDate: newer.daily.lastPlayedDate || older.daily.lastPlayedDate || '',
            playCount: Math.max(newer.daily.playCount || 0, older.daily.playCount || 0)
        };

        const weeklyCycle = newer.weekly.cycleStart || older.weekly.cycleStart || '';
        const weeklyStamps = new Set([
            ...(left.weekly.cycleStart === weeklyCycle ? left.weekly.stamps : []),
            ...(right.weekly.cycleStart === weeklyCycle ? right.weekly.stamps : [])
        ]);
        merged.weekly = {
            cycleStart: weeklyCycle,
            stamps: [...weeklyStamps].sort(),
            rewardClaimed:
                (left.weekly.cycleStart === weeklyCycle && left.weekly.rewardClaimed) ||
                (right.weekly.cycleStart === weeklyCycle && right.weekly.rewardClaimed)
        };

        const mergedTitles = new Set([
            ...(left.player.unlockedTitles || []),
            ...(right.player.unlockedTitles || [])
        ]);
        const mergedTitleLevels = { ...(right.player?.titleLevels || {}), ...(left.player?.titleLevels || {}) };
        Object.keys(mergedTitleLevels).forEach(k => {
            mergedTitleLevels[k] = Math.max(left.player?.titleLevels?.[k] || 0, right.player?.titleLevels?.[k] || 0);
        });
        const mergedPets = new Set([
            ...(left.player.ownedPets || []),
            ...(right.player.ownedPets || [])
        ]);
        merged.player = {
            selectedCharacter: preferred.player.selectedCharacter || fallback.player.selectedCharacter || 'female',
            unlockedTitles: [...mergedTitles],
            activeTitle: mergedTitles.has(preferred.player.activeTitle) ? preferred.player.activeTitle : 'apprentice',
            titleLevels: mergedTitleLevels,
            ownedPets: [...mergedPets],
            activePet: mergedPets.has(preferred.player.activePet) ? preferred.player.activePet : (mergedPets.has(fallback.player.activePet) ? fallback.player.activePet : null)
        };

        merged.settings = {
            bootSeen: left.settings.bootSeen || right.settings.bootSeen,
            guestStarted: left.settings.guestStarted || right.settings.guestStarted
        };

        merged.updatedAt = Math.max(newer.updatedAt, older.updatedAt);
        return this.normalizeData(merged);
    }

    getDateKey() {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    }

    createSeededRandom(seedInput) {
        let seed = 0;
        const seedText = String(seedInput);
        for (let i = 0; i < seedText.length; i++) {
            seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
        }
        return () => {
            seed += 0x6D2B79F5;
            let t = seed;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    getRuleClue(rule, slotCount) {
        const majority = Math.floor(slotCount / 2) + 1;
        switch (rule) {
            case 'unique':
                return `${slotCount} 格都要不同，任何素材都不能重複。`;
            case 'repeat-one':
                return `${slotCount} 格裡只有 1 種素材會出現 2 次，其餘素材都只出現 1 次。`;
            case 'triplet':
                return '會有 1 種素材剛好出現 3 次，其餘素材各出現 1 次。';
            case 'three-types':
                return `${slotCount} 格只會使用 3 種素材，而且這 3 種都一定會出現。`;
            case 'bookend':
                return `第 1 格與第 ${slotCount} 格必定相同，而且首尾素材只會出現這 2 次；中間每格都要和首尾不同。`;
            case 'bookend-pair':
                return '首尾素材會相同，另外還會有 1 種素材再成對出現 2 次，其餘位置各不相同。';
            case 'twin-pairs':
                return `${slotCount} 格會剛好形成 ${slotCount / 2} 組成對素材。`;
            case 'split-pairs':
                return `會形成 2 組成對素材，外加 ${slotCount - 4} 個單點素材。`;
            case 'weighted':
                return `會有 1 種素材佔到過半數，也就是至少 ${majority} 格。`;
            case 'alternating':
                return '只會出現 2 種素材，並且從頭到尾固定交錯排列。';
            case 'no-adjacent':
                return '任何相鄰兩格都不會出現相同素材。';
            case 'spectrum':
                return slotCount <= this.symbols.length
                    ? `${slotCount} 格必須全部不同。`
                    : `${this.symbols.length} 種素材都會出現，並且其中 1 種會再重複 1 次。`;
            case 'spectrum-plus':
                return `${this.symbols.length} 種素材都會出現，並且其中 2 種會各再重複 1 次。`;
            case 'palindrome':
                return '整體會以前後鏡像的方式排列。';
            case 'crown':
                return `第 1 格與第 ${slotCount} 格相同，第 2 格與第 ${slotCount - 1} 格相同，並且剛好出現 4 種素材（2 種各出現 2 次，另外 2 種各出現 1 次）。`;
            default:
                return '依照本次委託規格完成排列。';
        }
    }

    normalizePuzzleDefinition(puzzle) {
        if (!puzzle) return puzzle;
        const resolvedClue = puzzle.storyClue || puzzle.clue || this.getRuleClue(puzzle.rule, puzzle.slotCount);
        return {
            ...puzzle,
            storyClue: puzzle.storyClue || puzzle.clue || '',
            clue: resolvedClue,
            ruleClue: this.getRuleClue(puzzle.rule, puzzle.slotCount)
        };
    }

    auditPuzzleCatalog() {
        const dailyPool = this.getDailyChallengePool().map((entry) =>
            this.normalizePuzzleDefinition({ ...entry, slotCount: entry.slotCount || 5 })
        );
        const pools = [...this.levels, ...dailyPool];

        pools.forEach((puzzle, index) => {
            const rng = this.createSeededRandom(`${puzzle.rule}-${puzzle.slotCount}-${index}`);
            const secret = this.generateSecret(puzzle.rule, puzzle.slotCount, rng);
            if (!this.validatePattern(puzzle.rule, secret, puzzle.slotCount)) {
                console.error('Invalid puzzle rule detected', puzzle.rule, puzzle.slotCount, secret, puzzle);
            }
        });
    }

    getDailyChallengePool() {
        // All rules adapted for 5-slot daily challenges (fully random)
        // Note: 'unique' and 'spectrum' are identical at 5 slots, so only spectrum is kept
        // Note: 'twin-pairs' and 'crown' require even/6 slots, excluded from 5-slot pool
        return [
            { rule: 'repeat-one', ruleLabel: '回火疊加', title: '單元疊留' },
            { rule: 'three-types', ruleLabel: '三材濃縮', title: '三味合劑' },
            { rule: 'bookend', ruleLabel: '封印首尾', title: '書庫封印校準' },
            { rule: 'weighted', ruleLabel: '主核壓制', title: '熾核壓制' },
            { rule: 'split-pairs', ruleLabel: '雙對拆列', title: '雙塔拆列' },
            { rule: 'no-adjacent', ruleLabel: '避鄰穩相', title: '溫差穩相' },
            { rule: 'spectrum', ruleLabel: '全譜調和', title: '全譜試作' },
            { rule: 'palindrome', ruleLabel: '鏡面回文', title: '星鏡回文' },
            { rule: 'alternating', ruleLabel: '交錯節拍', title: '節拍廊道試驗' }
        ];
    }

    generateDailyChallenge() {
        const dateKey = this.getDateKey();
        const rng = this.createSeededRandom(`daily-${dateKey}`);
        const pool = this.getDailyChallengePool();
        const chosen = pool[Math.floor(rng() * pool.length)];
        const slotCount = 5; // Fixed 5 slots for daily
        const clue = this.getRuleClue(chosen.rule, slotCount);
        return this.normalizePuzzleDefinition({
            id: `daily-${dateKey}`,
            dateKey,
            name: `每日挑戰｜${chosen.title}`,
            title: chosen.title,
            client: '每日星象演算',
            request: '這是今日的公會校準題，全天可不限次數重試。',
            rule: chosen.rule,
            ruleLabel: chosen.ruleLabel,
            slotCount,
            storyClue: clue,
            chapter: '每日挑戰',
            chapterIndex: 1,
            intro: '今日的星圖已重新校準，這題不消耗體力，但一天只能領一次正式獎勵。',
            perfect: '公會今日演算已完成封存，你把今天的標準線直接拉高了。',
            good: '挑戰完成，校準結果已記錄。',
            rough: '今日題目算是過關，但還能再壓得更漂亮。',
            fail: '今日星象沒能穩住，不過每日挑戰仍可立刻重試。'
        });
    }

    getEndlessChallengePool(slotCount) {
        const rulesBySlot = {
            3: ['unique', 'repeat-one', 'three-types', 'weighted', 'alternating', 'no-adjacent', 'palindrome'],
            4: ['unique', 'repeat-one', 'bookend', 'three-types', 'twin-pairs', 'weighted', 'alternating', 'no-adjacent', 'palindrome'],
            5: ['repeat-one', 'three-types', 'bookend', 'weighted', 'split-pairs', 'no-adjacent', 'spectrum', 'palindrome', 'alternating']
        };
        const labels = {
            unique: '純度分離',
            'repeat-one': '回火疊加',
            'three-types': '三材濃縮',
            bookend: '首尾鎖定',
            'twin-pairs': '雙對共鳴',
            'split-pairs': '雙對拆列',
            weighted: '主材主導',
            alternating: '交錯節拍',
            'no-adjacent': '避鄰穩相',
            spectrum: '全譜調和',
            palindrome: '鏡面回文'
        };
        return (rulesBySlot[slotCount] || rulesBySlot[5]).map((rule) => ({
            rule,
            ruleLabel: this.levels.find((level) => level.rule === rule && level.slotCount === slotCount)?.ruleLabel || labels[rule] || rule
        }));
    }

    generateEndlessOrder(orderCount = 1) {
        const slotCount = orderCount <= 3 ? 3 : orderCount <= 6 ? 4 : 5;
        const rng = this.createSeededRandom(`endless-${this.getDateKey()}-${orderCount}-${this.data.stats.endlessPlayed}`);
        const pool = this.getEndlessChallengePool(slotCount);
        const chosen = pool[Math.floor(rng() * pool.length)] || { rule: 'repeat-one', ruleLabel: '回火疊加' };
        const enemy = this.getEnemyForOrder(orderCount);
        const isBoss = orderCount > 0 && orderCount % 10 === 0;
        const title = isBoss ? '星隕禁忌陣' : (slotCount >= 5 ? '五芒咒陣' : slotCount >= 4 ? '四象咒陣' : '三環咒陣');
        
        return this.normalizePuzzleDefinition({
            id: `endless-${orderCount}`,
            title: `${title} #${orderCount}`,
            name: isBoss ? `【BOSS】${enemy.name}` : `無盡討伐 #${orderCount}｜${enemy.name}`,
            chapter: '無盡討伐',
            client: enemy.name,
            request: isBoss ? `警告：遭遇強大魔物！請謹慎組合咒語。` : `在倒數歸零前組出正確咒語，命中後可直接擊敗 ${enemy.name}。`,
            rule: chosen.rule,
            ruleLabel: chosen.ruleLabel,
            slotCount,
            isBoss,
            intro: isBoss ? '空氣中瀰漫著危險的魔力...最強魔物現身！' : '討伐盤已展開，現在要把配方當成咒語來施放。',
            perfect: '咒語一擊命中，敵人還沒反應過來就被封回星砂。',
            good: '咒語完成，戰線保持穩定。',
            rough: '這一擊有些勉強，但敵人已經倒下。',
            fail: '咒語中斷，敵人的反擊打亂了節奏。',
            clue: this.getRuleClue(chosen.rule, slotCount)
        });
    }

    canClaimDailyReward() {
        return this.data.daily.rewardDate !== this.dailyChallenge.dateKey;
    }

    getMaxStamina() {
        return this.data.maxStamina || 100;
    }

    getMinutesUntilStaminaReady() {
        if (this.data.stamina >= 10) return 0;
        return 10 - this.data.stamina;
    }

    getWeekInfo() {
        const now = new Date();
        const weekdayFormatter = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei',
            weekday: 'short'
        });
        const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const anchor = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        const day = anchor.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const monday = new Date(anchor);
        monday.setDate(anchor.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const todayKey = dayKeyFormatter.format(anchor);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            const key = dayKeyFormatter.format(date);
            return {
                key,
                label: weekdayFormatter.format(date),
                dayNumber: key.slice(-2),
                isToday: key === todayKey
            };
        });
        return {
            cycleStart: days[0].key,
            todayKey,
            days
        };
    }

    syncWeeklyProgress() {
        const week = this.getWeekInfo();
        if (this.data.weekly.cycleStart !== week.cycleStart) {
            this.data.weekly = {
                cycleStart: week.cycleStart,
                stamps: [],
                rewardClaimed: false
            };
        } else {
            this.data.weekly.stamps = this.data.weekly.stamps.filter((stamp) => week.days.some((day) => day.key === stamp));
        }
        return week;
    }

    markWeeklyStamp(dateKey = this.getDateKey()) {
        const week = this.syncWeeklyProgress();
        if (week.days.some((day) => day.key === dateKey) && !this.data.weekly.stamps.includes(dateKey)) {
            this.data.weekly.stamps.push(dateKey);
            this.data.weekly.stamps.sort();
        }
        return week;
    }

    maybeClaimWeeklyReward() {
        const week = this.syncWeeklyProgress();
        if (this.data.weekly.stamps.length >= 7 && !this.data.weekly.rewardClaimed) {
            this.data.weekly.rewardClaimed = true;
            this.data.coins += 500;
            this.showMessage('本週全勤達成，額外獲得 500 星幣');
            return true;
        }
        return false;
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                return this.normalizeData(JSON.parse(raw));
            }
        } catch (e) {
            console.error("Save corrupted, using default");
        }
        return this.getDefaultData();
    }

    refreshPersistentUI({ showToast = false } = {}) {
        this.updateGlobalUI();
        this.quests.check();
        this.renderMap();
        this.renderShop();
        this.renderHubDashboard();

        if (showToast) this.showSaveToast();
        requestAnimationFrame(() => this.updateLayoutMetrics());
    }

    applyExternalData(nextData, { showToast = false, notice = '' } = {}) {
        this.data = this.normalizeData(nextData);
        this.lastHighestLevel = this.data.highestLevel;
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        this.refreshPersistentUI({ showToast });
        if (notice) this.showMessage(notice);
    }

    saveData({ skipCloud = false, showToast = true } = {}) {
        this.data = this.getSerializableData(this.data);
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        this.updateGlobalUI();
        this.quests.check();
        this.renderHubDashboard();
        if (showToast) this.showSaveToast();

        if (!skipCloud && window.cloudSave?.queueSave) {
            window.cloudSave.queueSave(this.data);
        }
    }

    showSaveToast() {
        this.els.saveToast.classList.add('show');
        setTimeout(() => this.els.saveToast.classList.remove('show'), 2000);
    }

    setModalActive(modal, active) {
        if (!modal) return;
        if (active) modal.hidden = false;
        modal.classList.toggle('active', active);
        modal.setAttribute('aria-hidden', active ? 'false' : 'true');
        modal.inert = !active;
        if (!active) modal.hidden = true;
    }

    closeResultModal() {
        this.setModalActive(this.els.modal, false);
        this.els.leaderboardBox?.classList.add('hidden');
    }

    openConfirmModal({
        title = '確認',
        description = '您確定要執行此操作？',
        cancelText = '取消',
        okText = '確定',
        okVariant = 'danger',
        onOk = null,
        onCancel = null
    } = {}) {
        this.pendingConfirmAction = onOk;
        this.pendingConfirmCancelAction = onCancel;
        this.els.confirmTitle.textContent = title;
        this.els.confirmDesc.textContent = description;
        this.els.btnConfirmCancel.textContent = cancelText;
        this.els.btnConfirmOk.textContent = okText;
        this.els.btnConfirmOk.className = `btn ${okVariant === 'danger' ? 'btn-primary' : 'btn-primary'}`;
        this.els.btnConfirmOk.style.background = okVariant === 'danger' ? 'var(--color-error)' : 'var(--color-secondary)';
        this.els.btnConfirmOk.style.borderColor = okVariant === 'danger' ? 'var(--color-error)' : 'var(--color-secondary)';
        this.setModalActive(this.els.confirmModal, true);
    }

    closeConfirmModal({ runCancel = false } = {}) {
        this.setModalActive(this.els.confirmModal, false);
        if (runCancel && this.pendingConfirmCancelAction) this.pendingConfirmCancelAction();
        this.pendingConfirmAction = null;
        this.pendingConfirmCancelAction = null;
    }

    showStaminaHelp(required = 10) {
        const missing = Math.max(0, required - this.data.stamina);
        const targetText = required >= 30 ? '無盡討伐' : '故事委託';
        const description = `開始${targetText}需要 ${required} 點體力，你目前只有 ${this.data.stamina}/${this.getMaxStamina()}。\n每分鐘會自然恢復 1 點體力，或到商店花 60 金幣購買公會補給糖，立即恢復 30 點。\n每日挑戰不消耗體力；無盡討伐會消耗 30 體力並累積分數。\n再補 ${missing} 點就能再次出發。`;
        this.openConfirmModal({
            title: '體力不足',
            description,
            cancelText: '稍後再說',
            okText: '前往商店',
            okVariant: 'primary',
            onOk: () => {
                this.closeConfirmModal();
                this.showLocation('shop');
            }
        });
    }

    requestFS() {
        const root = document.documentElement;
        const requestFullscreen = root.requestFullscreen
            || root.webkitRequestFullscreen
            || root.msRequestFullscreen;
        const fullscreenActive = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

        if (requestFullscreen && !fullscreenActive) {
            Promise.resolve(requestFullscreen.call(root)).catch(() => console.log('Full screen locked'));
        }
    }

    init() {
        // Sync with existing auth state if firebase-auth.js finished early
        if (window.currentUser) {
            this.currentUser = window.currentUser;
        }

        this.updateGlobalUI();
        this.renderMap();
        this.renderShop();
        this.renderPalette();
        this.renderHubDashboard();
        this.renderFamiliarPanel();
        this.updatePetDisplay();
        this.bindEvents();
        this.initCheats();
        this.quests.check();
        window.audio?.updateMuteButton?.();
        this.updateScene('hub');
        this.updateLayoutMetrics();
        this.startBootSequence();

        const syncLayout = () => this.updateLayoutMetrics();
        window.addEventListener('resize', syncLayout);
        window.addEventListener('orientationchange', syncLayout);
        window.addEventListener('load', syncLayout);
        window.visualViewport?.addEventListener('resize', syncLayout);
        window.visualViewport?.addEventListener('scroll', syncLayout);
        document.fonts?.ready.then(syncLayout);

        // Stamina auto-regen logic
        setInterval(() => {
            if (this.data.stamina < this.getMaxStamina()) {
                const elapsedMin = Math.floor((Date.now() - this.data.lastEnergyTime) / 60000);
                if (elapsedMin > 0) {
                    this.data.stamina = Math.min(this.getMaxStamina(), this.data.stamina + elapsedMin);
                    this.data.lastEnergyTime += elapsedMin * 60000;
                    this.saveData({ showToast: false });
                }
            } else {
                this.data.lastEnergyTime = Date.now();
            }
        }, 20000);
    }

    forceReturnHub() {
        this.clearCombatTimer();
        this.dialogue.abort();
        this.activeHubPanel = 'home';
        this.playTransitionOverlay(() => {
            this.showLocation('hub');
            this.renderMap();
        });
    }

    enterStoryMap() {
        if (!this.currentUser) {
            this.data.settings.guestStarted = true;
        }
        this.requestFS();
        if (this.els.bootOverlay?.classList.contains('active')) {
            this.completeBootSequence();
        }
        this.showLocation('hub');
        this.showHubPanel('missions');
        this.renderMap();
    }

    updateLayoutMetrics() {
        const readMetric = (name, fallback) => {
            const current = parseFloat(getComputedStyle(this.els.appContainer).getPropertyValue(name));
            return Number.isFinite(current) && current > 0 ? current : fallback;
        };
        const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 0);
        const viewportOffsetTop = Math.max(0, Math.round(window.visualViewport?.offsetTop || 0));
        const runtimeSafeBottom = Math.max(
            0,
            Math.round((window.innerHeight || viewportHeight) - viewportHeight - viewportOffsetTop)
        );
        const globalHeaderHeight = this.els.globalHeader && !this.els.globalHeader.classList.contains('hidden')
            ? this.els.globalHeader.offsetHeight
            : readMetric('--global-header-height', 112);
        const gameHeaderHeight = this.els.gameHeader?.offsetHeight || readMetric('--game-header-height', 152);
        const inputConsoleHeight = Math.ceil(this.els.inputConsole?.getBoundingClientRect().height || 0);
        if (viewportHeight > 0) {
            this.els.appContainer.style.setProperty('--app-visible-height', `${viewportHeight}px`);
        }
        this.els.appContainer.style.setProperty('--runtime-safe-bottom', `${runtimeSafeBottom}px`);
        this.els.appContainer.style.setProperty('--input-console-height', `${inputConsoleHeight}px`);
        this.els.appContainer.style.setProperty('--global-header-height', `${globalHeaderHeight}px`);
        this.els.appContainer.style.setProperty('--game-header-height', `${gameHeaderHeight}px`);
    }

    resolveSceneForView(viewId) {
        if (viewId === 'shop') return 'shop';
        if (viewId === 'game') {
            return this.gameMode === 'endless' || this.currentLevel >= 30 ? 'final' : 'puzzle';
        }
        return 'hub';
    }

    updateScene(viewId = this.viewState) {
        this.els.appContainer.dataset.view = viewId;
        const scene = this.resolveSceneForView(viewId);
        this.particles.setScene(viewId);
        if (window.audio?.setScene) window.audio.setScene(scene);
        else if (window.audio?.setMusicMode) window.audio.setMusicMode(scene);
    }

    resetViewportScroll(viewId = this.viewState) {
        const root = document.scrollingElement || document.documentElement;
        if (root) {
            root.scrollTop = 0;
            root.scrollLeft = 0;
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        const activeView = document.getElementById(`view-${viewId}`);
        if (activeView) {
            activeView.scrollTop = 0;
            activeView.scrollLeft = 0;
        }
    }

    showLocation(viewId) {
        if (viewId === 'map') {
            viewId = 'hub';
            this.activeHubPanel = 'missions';
        } else if (viewId === 'shop') {
            viewId = 'hub';
            this.activeHubPanel = 'shop';
        }
        if (this.viewState === 'game' && viewId !== 'game') this.clearCombatTimer();
        if (viewId !== 'game') this.els.viewGame?.classList.remove('endless-battle');
        this.previousView = this.viewState;
        const outgoing = document.querySelector('.view-section.active-view');
        const incoming = document.getElementById(`view-${viewId}`);
        if (!incoming) return;

        // Animate transition
        if (outgoing && outgoing !== incoming) {
            outgoing.classList.add('view-exit');
            incoming.classList.add('view-enter');
            incoming.classList.add('active-view');
            setTimeout(() => {
                outgoing.classList.remove('active-view', 'view-exit');
                incoming.classList.remove('view-enter');
            }, 350);
        } else {
            this.els.views.forEach(v => v.classList.remove('active-view'));
            incoming.classList.add('active-view');
        }

        this.viewState = viewId;
        this.updateScene(viewId);

        if (viewId === 'hub') {
            this.renderHubDashboard();
        } else if (viewId === 'game') {
            this.els.globalHeader.classList.add('hidden');
        }

        if (viewId === 'hub') {
            this.quests.check();
        } else {
            this.els.questWidget.classList.remove('show');
        }

        requestAnimationFrame(() => this.updateLayoutMetrics());
        requestAnimationFrame(() => this.resetViewportScroll(viewId));
    }

    updateGlobalUI() {
        this.els.globalCoins.textContent = this.data.coins;
        this.els.globalStamina.textContent = this.data.stamina;

        if (!this.els.hubTip || !this.els.hubTipText) return;

        if (this.data.stamina < 10) {
            const missing = 10 - this.data.stamina;
            this.els.hubTipText.textContent = `故事委託需要 10 體力。你目前 ${this.data.stamina}/${this.getMaxStamina()}，還差 ${missing} 點；約 ${this.getMinutesUntilStaminaReady()} 分鐘後可自然回到可出發狀態，也可去商店買補給糖立即回復 30 點。每日挑戰不耗體力，無盡討伐需要 30 體力。`;
            this.els.hubTip.classList.remove('hidden');
        } else {
            this.els.hubTip.classList.add('hidden');
        }
    }

    getRewardRangeText() {
        const rewards = [1, 2, 3].map(stars => 20 * stars);
        return `${Math.min(...rewards)}-${Math.max(...rewards)} 星幣`;
    }

    getLevelStatus(level, stars) {
        if (level.id === this.data.highestLevel) return { text: '最新委託', className: 'is-live' };
        if (stars >= 3) return { text: '完美封存', className: 'is-perfect' };
        if (stars > 0) return { text: '已評級', className: 'is-cleared' };
        return { text: '待補評級', className: 'is-ready' };
    }

    getLevelCardMarkup(level, stars) {
        const status = this.getLevelStatus(level, stars);
        const chapterStep = ((level.id - 1) % 10) + 1;
        return `
            <div class="level-card-top">
                <span class="level-tag">${level.chapter}</span>
                <span class="level-tag alt">${level.slotCount} 格</span>
            </div>
            <h3>委託 #${level.id.toString().padStart(2, '0')}：${level.title}</h3>
            <p class="level-client">委託人｜${level.client}</p>
            <p class="level-rule">${level.request}<br>${level.clue}</p>
            <p class="level-meta">${status.text}｜章節 ${chapterStep}/10｜報酬 ${this.getRewardRangeText()}</p>
            <div class="level-stars">
                ${[1, 2, 3].map(i => `<img src="assets/icons/star.png" class="${i <= stars ? 'earned' : ''}" alt="評級星星">`).join('')}
            </div>
        `;
    }

    getShopItemLevel(itemId) {
        return (this.data.upgrades.shopLevels?.[itemId]) || 0;
    }

    getShopItemCost(baseCost, itemId) {
        const level = this.getShopItemLevel(itemId);
        if (level >= 10) return Infinity;
        
        // Before Level 4, use exponential growth (doubling)
        // After Level 4, add a fixed 2000 coins per level as requested
        if (level <= 4) {
            return Math.floor(baseCost * Math.pow(2, level));
        } else {
            const costAtLv4 = baseCost * Math.pow(2, 4);
            return Math.floor(costAtLv4 + (level - 4) * 2000);
        }
    }

    getShopInventory() {
        const staminaLevel = this.getShopItemLevel('staminaPack');
        const manaUpLevel = this.getShopItemLevel('manaUp');
        const manaUpHLevel = this.getShopItemLevel('manaUpH');
        const maxStaminaUpLevel = this.getShopItemLevel('maxStaminaUp');
        return [
            {
                id: 'maxStaminaUp',
                icon: '❤️',
                name: '體魄鍛鍊',
                desc: '永久增加體力上限 +30',
                cost: this.getShopItemCost(1000, 'maxStaminaUp'),
                repeat: true,
                maxLevel: 10,
                currentLevel: maxStaminaUpLevel,
                category: '屬性',
                tier: `能力提升｜Lv.${maxStaminaUpLevel + 1}`,
                accent: 'premium',
                disabled: () => maxStaminaUpLevel >= 10,
                effectText: () => maxStaminaUpLevel >= 10 ? '已達最高等級' : `體力上限 ${this.getMaxStamina()} → ${this.getMaxStamina() + 30}`,
                statusText: () => maxStaminaUpLevel >= 10 ? '已達最高等級' : '可重複鍛鍊',
                action: () => {
                    this.data.maxStamina = this.getMaxStamina() + 30;
                    if (!this.data.upgrades.shopLevels) this.data.upgrades.shopLevels = {};
                    this.data.upgrades.shopLevels['maxStaminaUp'] = (this.data.upgrades.shopLevels['maxStaminaUp'] || 0) + 1;
                }
            },
            {
                id: 'staminaPack',
                icon: '🧃',
                name: '公會補給糖',
                desc: `立即恢復 30 點體力（目前 ${this.data.stamina}/${this.getMaxStamina()}）`,
                cost: 60,
                repeat: true,
                maxLevel: Infinity,
                currentLevel: 0,
                category: '補給品',
                tier: '即時回復｜一次性消耗品',
                accent: 'supply',
                disabled: () => this.data.stamina >= this.getMaxStamina(),
                effectText: () => `體力 ${this.data.stamina} → ${Math.min(this.getMaxStamina(), this.data.stamina + 30)}`,
                statusText: () => this.data.stamina >= this.getMaxStamina() ? '目前已滿體' : `還可補 ${this.getMaxStamina() - this.data.stamina} 點`,
                action: () => {
                    this.data.stamina = Math.min(this.getMaxStamina(), this.data.stamina + 30);
                }
            },
            {
                id: 'manaUp',
                icon: '🛠️',
                name: '大釜擴容',
                desc: '最大精神力上限 +20',
                cost: this.getShopItemCost(450, 'manaUp'),
                repeat: true,
                maxLevel: 10,
                currentLevel: manaUpLevel,
                category: '設備',
                tier: `常規升級｜Lv.${manaUpLevel + 1}`,
                accent: 'upgrade',
                disabled: () => manaUpLevel >= 10,
                effectText: () => manaUpLevel >= 10 ? '已達最高等級' : `精神力上限 ${this.data.maxMana} → ${this.data.maxMana + 20}`,
                statusText: () => manaUpLevel >= 10 ? '已達最高等級' : '可重複交涉',
                action: () => {
                    this.data.maxMana += 20;
                    if (!this.data.upgrades.shopLevels) this.data.upgrades.shopLevels = {};
                    this.data.upgrades.shopLevels['manaUp'] = (this.data.upgrades.shopLevels['manaUp'] || 0) + 1;
                }
            },
            {
                id: 'manaUpH',
                icon: '🏺',
                name: '頂級大釜組',
                desc: '最大精神力上限 +50',
                cost: this.getShopItemCost(1050, 'manaUpH'),
                repeat: true,
                maxLevel: 10,
                currentLevel: manaUpHLevel,
                category: '設備',
                tier: `高階套組｜Lv.${manaUpHLevel + 1}`,
                accent: 'premium',
                disabled: () => manaUpHLevel >= 10,
                effectText: () => manaUpHLevel >= 10 ? '已達最高等級' : `精神力上限 ${this.data.maxMana} → ${this.data.maxMana + 50}`,
                statusText: () => manaUpHLevel >= 10 ? '已達最高等級' : '適合中後段高壓委託',
                action: () => {
                    this.data.maxMana += 50;
                    if (!this.data.upgrades.shopLevels) this.data.upgrades.shopLevels = {};
                    this.data.upgrades.shopLevels['manaUpH'] = (this.data.upgrades.shopLevels['manaUpH'] || 0) + 1;
                }
            }
        ];
    }

    getResultTitle(stars = 0) {
        if (this.gameMode === 'daily') return '每日校準完成';
        if (this.gameState.hintPenalty) return '文獻保送';
        if (stars >= 3) return '完美提煉';
        if (stars === 2) return '穩定交付';
        if (stars === 1) return '勉強過線';
        return '委託結算';
    }

    getResultTopline(success, levelData = null) {
        if (!success) return this.gameMode === 'endless' ? '無盡討伐結算' : '委託失敗報告';
        if (this.gameMode === 'daily') return '每日挑戰結算';
        if (this.gameMode === 'endless') return '無盡討伐結算';
        if (levelData) return `${levelData.chapter}｜委託評級`;
        return '委託評級';
    }

    getResultStats({ success, stars = 0, levelData = null }) {
        if (this.gameMode === 'endless') {
            return [
                { label: '擊敗敵人', value: `${this.gameState.defeated || 0} 名` },
                { label: '本場得分', value: `${this.gameState.score || 0}`, accent: 'accent' },
                { label: '獲得星幣', value: `+${this.gameState.scoreCoins || 0}` },
                { label: '最佳紀錄', value: `${this.data.stats.endlessBestScore || 0} 分` }
            ];
        }

        if (this.gameMode === 'daily') {
            if (success) {
                return [
                    { label: '挑戰回合', value: `${this.gameState.turn} 回` },
                    { label: '剩餘精神力', value: `${this.gameState.mana}` },
                    { label: '今日獎勵', value: this.gameState.weeklyRewardGranted ? '每日 500 + 週結算 500' : this.gameState.dailyRewardGranted ? '500 星幣已入帳' : '今日已領過，不再重複發放', accent: (this.gameState.dailyRewardGranted || this.gameState.weeklyRewardGranted) ? 'accent' : '' },
                    { label: '規格重點', value: levelData ? levelData.ruleLabel : '每日校準' }
                ];
            }
            return [
                { label: '今日題目', value: levelData ? levelData.title : '每日挑戰' },
                { label: '停止原因', value: '精神力耗盡', accent: 'danger' },
                { label: '挑戰特性', value: '不限次數，可立即重試' },
                { label: '規格提示', value: levelData ? levelData.clue : '依規格重整排列後再試' }
            ];
        }

        if (success) {
            return [
                { label: '嘗試次數', value: `${this.gameState.turn} 回` },
                { label: '剩餘精神力', value: `${this.gameState.mana}` },
                { label: '配方規格', value: levelData ? levelData.ruleLabel : `${this.gameState.slotCount} 格委託` },
                { label: '公會註記', value: this.gameState.hintPenalty ? '文獻介入完成' : stars >= 3 ? '近乎滿分' : stars === 2 ? '穩定交付' : '低空過線', accent: this.gameState.hintPenalty ? 'warning' : stars >= 3 ? 'accent' : '' }
            ];
        }

        return [
            { label: this.gameMode === 'endless' ? '完成筆數' : '已投入回合', value: this.gameMode === 'endless' ? `${Math.max(0, this.gameState.orderCount - 1)} 筆` : `${this.gameState.turn} 回` },
            { label: '停止原因', value: '精神力耗盡', accent: 'danger' },
            { label: '配方規格', value: levelData ? levelData.ruleLabel : `${this.gameState.slotCount} 格委託` },
            { label: '修正提示', value: levelData ? levelData.clue : '先補體力與裝備，再重新出發' }
        ];
    }

    getResultNextText(success, levelData = null) {
        if (this.gameMode === 'daily') {
            if (!success) return '每日挑戰不限次數，可立刻重新整理節奏再試一次。';
            return this.gameState.weeklyRewardGranted
                ? '今日首通與本週七日結算都已完成，仍可重複挑戰練習。'
                : this.gameState.dailyRewardGranted
                    ? '今日首通獎勵已封存，仍可重複挑戰練習。'
                    : '今天的正式獎勵已領取過，仍可反覆挑戰今天的校準題。';
        }
        if (this.gameMode === 'endless') {
            return success ? '下一名敵人正在進場。' : '回到據點後可以調整人物與稱號，再重新挑戰無盡討伐。';
        }

        if (!success) {
            return levelData ? `建議重新對照規格：「${levelData.clue}」` : '先穩住節奏，再重新接單。';
        }

        const nextLevel = levelData ? this.levels.find(lv => lv.id === levelData.id + 1) : null;
        if (nextLevel) return `下一張委託：${nextLevel.title}｜${nextLevel.slotCount} 格｜${nextLevel.ruleLabel}`;
        if (this.data.highestLevel > 30) return '所有正式委託皆已結案，無盡討伐權限已開啟。';
        return '本段委託已結案，請回公會等待下一份指派。';
    }

    showResultModal({
        success = true,
        title = '委託結算',
        desc = '',
        story = '',
        stars = 0,
        reward = 0,
        actionText = '確認',
        levelData = null,
        leaderboardText = ''
    } = {}) {
        this.els.resultPanel.dataset.result = success ? 'success' : 'failure';
        this.els.modalTopline.textContent = this.getResultTopline(success, levelData);
        this.els.modalTitle.textContent = title;
        this.els.modalTitle.className = success ? '' : 'error-title';
        this.els.modalDesc.textContent = desc;
        this.els.modalStory.textContent = story;
        this.els.modalStars.innerHTML = stars > 0
            ? [1, 2, 3].map(i => `<img src="assets/icons/star.png" class="${i <= stars ? 'earned' : ''}">`).join('')
            : '';
        this.els.modalStats.innerHTML = this.getResultStats({ success, stars, levelData })
            .map(stat => `
                <div class="result-stat ${stat.accent ? `is-${stat.accent}` : ''}">
                    <span>${stat.label}</span>
                    <strong>${stat.value}</strong>
                </div>
            `).join('');
        this.els.modalCoinReward.textContent = reward > 0 ? `+${reward}` : '本次無額外星幣';
        this.els.modalNext.textContent = this.getResultNextText(success, levelData);
        this.els.modalNext.classList.remove('hidden');
        this.els.btnModalAction.textContent = actionText;

        if (leaderboardText) {
            this.els.leaderboardBox.classList.remove('hidden');
            this.els.leaderboardBox.textContent = leaderboardText;
        } else {
            this.els.leaderboardBox.classList.add('hidden');
        }

        this.setModalActive(this.els.modal, true);
    }

    startBootSequence() {
        if (!this.els.bootOverlay) return;

        this.bootFinished = false;
        this.bootTimers.forEach(timer => clearTimeout(timer));
        this.bootTimers = [];
        const statusFrames = [
            '正在校準邊境大釜...',
            '正在整理今日委託...',
            '正在載入煉金工坊...'
        ];

        this.els.bootOverlay.classList.add('active');
        if (this.els.bootLoader) this.els.bootLoader.classList.remove('hidden');
        if (this.els.bootStatus) this.els.bootStatus.textContent = statusFrames[0];

        statusFrames.slice(1).forEach((text, index) => {
            this.bootTimers.push(setTimeout(() => {
                if (this.els.bootStatus) this.els.bootStatus.textContent = text;
            }, 420 + index * 420));
        });

        this.bootTimers.push(setTimeout(() => {
            this.completeBootSequence();
        }, 1300));
    }

    completeBootSequence() {
        if (this.bootFinished || !this.els.bootOverlay) return;
        this.bootFinished = true;
        this.bootTimers.forEach(timer => clearTimeout(timer));
        this.bootTimers = [];
        this.els.bootOverlay.classList.remove('active');
        if (this.els.bootLoader) this.els.bootLoader.classList.add('hidden');
        if (this.els.authCard) this.els.authCard.classList.remove('hidden');
        this.data.settings.bootSeen = true;
        this.saveData({ showToast: false });
    }

    onAuthChanged(user) {
        this.currentUser = user || null;
        this.renderHomeSaveNote();
        this.renderSettingsPanel();
        this.refreshHubGuide({ panelId: this.activeHubPanel });
    }

    enterHub() {
        this.activeHubPanel = 'home';
        // Play transition overlay
        this.playTransitionOverlay(() => {
            this.showLocation('hub');
            this.refreshHubGuide({ rerollCharacter: true, panelId: this.activeHubPanel });
        });
    }

    playTransitionOverlay(callback, duration = 600) {
        let overlay = document.getElementById('transition-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'transition-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('transition-out');
        overlay.classList.add('transition-in');
        setTimeout(() => {
            if (callback) callback();
            overlay.classList.remove('transition-in');
            overlay.classList.add('transition-out');
            setTimeout(() => {
                overlay.classList.remove('transition-out');
            }, duration);
        }, duration / 2);
    }

    showHubPanel(panelId = 'home') {
        const target = ['home', 'missions', 'daily', 'inventory', 'settings', 'shop'].includes(panelId) ? panelId : 'home';
        const previousPanel = this.activeHubPanel;
        this.activeHubPanel = target;
        const hubNavButtons = this.els.hubBottomNav ? this.els.hubBottomNav.querySelectorAll('.hub-nav-btn') : [];

        const hubEl = document.querySelector('#view-hub .hub-content');
        if (hubEl) {
            hubEl.dataset.activePanel = target;
        }

        if (target === 'home') {
            this.els.globalHeader.classList.add('hidden');
        } else {
            this.els.globalHeader.classList.remove('hidden');
            const titles = { shop: '商店', missions: '任務', daily: '每日', inventory: '人物', settings: '設定' };
            this.els.headerTitle.textContent = titles[target] || '邊境據點';
        }

        // Animate panel transition
        const outgoingPanel = previousPanel !== target ? document.querySelector(`.hub-panel[data-panel="${previousPanel}"]`) : null;
        const incomingPanel = document.querySelector(`.hub-panel[data-panel="${target}"]`);

        this.els.hubPanels.forEach(panel => {
            if (panel !== outgoingPanel && panel !== incomingPanel) {
                panel.classList.remove('active', 'panel-exit', 'panel-enter');
            }
        });

        if (outgoingPanel && incomingPanel && outgoingPanel !== incomingPanel) {
            outgoingPanel.classList.add('panel-exit');
            incomingPanel.classList.remove('active');
            incomingPanel.classList.add('panel-enter', 'active');
            setTimeout(() => {
                outgoingPanel.classList.remove('active', 'panel-exit');
                incomingPanel.classList.remove('panel-enter');
            }, 300);
        } else {
            this.els.hubPanels.forEach(panel => {
                panel.classList.toggle('active', panel.dataset.panel === target);
            });
        }

        hubNavButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hubTarget === target);
        });

        if (this.els.btnHubHome) {
            this.els.btnHubHome.classList.toggle('hidden', target === 'home');
        }

        if (target === 'shop') {
            this.renderShop();
        }

        this.refreshHubGuide({ panelId: target });
    }

    renderHubCast() {
        // Cast grid removed from story panel; no longer needed
    }

    renderStoryFeed() {
        // Story feed removed from story panel; no longer needed
    }

    renderDailyPanel() {
        if (!this.els.dailyTitle) return;
        const dc = this.dailyChallenge;
        this.els.dailyTitle.textContent = `${dc.title}｜${dc.slotCount} 格`;
        this.els.dailyDesc.textContent = `${this.dailyChallenge.clue} 每次挑戰消耗 5 體力，過關獲得 10 金幣。`;
        this.els.dailyRuleLabel.textContent = `${this.dailyChallenge.ruleLabel}｜${this.dailyChallenge.dateKey}`;
        this.els.dailyRewardStatus.textContent = `每次過關 10 金幣｜無盡最佳 ${this.data.stats.endlessBestScore || 0} 分`;
    }

    renderWeeklyCalendar() {
        if (!this.els.weeklyCalendar) return;

        const week = this.syncWeeklyProgress();
        const stampSet = new Set(this.data.weekly.stamps);
        const claimed = this.data.weekly.rewardClaimed;

        this.els.weeklyCalendar.innerHTML = week.days.map((day, index) => `
            <div class="weekly-day ${stampSet.has(day.key) ? 'stamped' : ''} ${day.isToday ? 'today' : ''}">
                <span class="weekly-day-label">Day ${index + 1}</span>
                <strong>${day.label}</strong>
                <small>${day.dayNumber}</small>
                <em>${stampSet.has(day.key) ? '已蓋章' : '待完成'}</em>
            </div>
        `).join('');

        if (this.els.weeklyProgressText) {
            this.els.weeklyProgressText.textContent = `${this.data.weekly.stamps.length} / 7`;
        }
        if (this.els.weeklyRewardText) {
            if (claimed) {
                this.els.weeklyRewardText.textContent = '本週 500 星幣全勤獎勵已結算完成。';
            } else if (this.data.weekly.stamps.length >= 7) {
                this.els.weeklyRewardText.textContent = '本週七日蓋章已完成，500 星幣將於本次結算自動發放。';
            } else {
                this.els.weeklyRewardText.textContent = `再完成 ${7 - this.data.weekly.stamps.length} 天每日挑戰蓋章，可額外獲得 500 星幣。`;
            }
        }
    }

    renderInventoryPanel() {
        if (!this.els.inventoryGrid) return;
        const selectedCharacter = this.getPlayableCharacter();
        const selectedStage = this.getPlayerStage(selectedCharacter);
        const activeTitle = this.getActiveTitle();
        const activeTitleLevel = this.getActiveTitleLevel();

        const statItems = [
            {
                label: '名稱',
                title: `${selectedCharacter.name}`,
                text: `${selectedCharacter.role}`
            },
            {
                label: '體力儲量',
                title: `${this.data.stamina}/100`,
                text: this.data.stamina >= 30 ? '故事與無盡討伐都可出發。' : `無盡討伐需要 30 體力，目前還差 ${Math.max(0, 30 - this.data.stamina)} 點。`
            },
            {
                label: '大釜容量',
                title: `${this.data.maxMana}`,
                text: '精神力上限越高，容錯與嘗試次數就越多。'
            },
            {
                label: '稱號',
                title: `${activeTitle.name} Lv.${activeTitleLevel}`,
                text: activeTitle.levelDesc ? activeTitle.levelDesc(activeTitleLevel) : activeTitle.desc,
                isTitleStat: true
            }
        ];

        const statCards = statItems.map((item) => `
            <article class="inventory-card ${item.isTitleStat ? 'title-stat-card' : ''}" ${item.isTitleStat ? 'data-open-title-page="true"' : ''}>
                <span class="inventory-label">${item.label}</span>
                <div class="inventory-meta">
                    <h3 class="inventory-value">${item.title}</h3>
                    <p>${item.text}</p>
                </div>
                ${item.isTitleStat ? '<span class="title-tap-hint">點擊管理稱號 ▶</span>' : ''}
            </article>
        `).join('');

        this.els.inventoryGrid.innerHTML = `
            <div class="inv-split-layout">
                <div class="inv-left" data-open-character-select="true">
                    <img src="${selectedStage.image}" alt="${selectedCharacter.name}" class="inv-character-img">
                    <span class="inv-char-tap-hint">點擊切換角色</span>
                </div>
                <div class="inv-right">
                    ${statCards}
                </div>
            </div>
        `;
        this.renderFamiliarPanel();
    }

    openCharacterSelectModal() {
        const characters = this.getPlayableCharacters();
        const cards = characters.map((character) => {
            const stage = this.getPlayerStage(character);
            const isSelected = character.id === this.data.player.selectedCharacter;
            return `
                <div class="char-select-option ${isSelected ? 'selected' : ''}" data-pick-character="${character.id}">
                    <img src="${stage.image}" alt="${character.name}">
                    <strong>${character.name}</strong>
                    <span>${character.gender}｜${stage.label}</span>
                    ${isSelected ? '<em>使用中</em>' : ''}
                </div>
            `;
        }).join('');

        this.els.characterModalDesc.innerHTML = `<div class="char-select-grid">${cards}</div>`;
        this.setModalActive(this.els.characterModal, true);

        // Bind character selection
        this.els.characterModalDesc.querySelectorAll('[data-pick-character]').forEach(el => {
            el.addEventListener('click', () => {
                if (window.audio) window.audio.playClick();
                this.selectPlayableCharacter(el.dataset.pickCharacter);
                this.setModalActive(this.els.characterModal, false);
            });
        });
    }

    openTitleUpgradePage() {
        const catalog = this.getTitleCatalog();
        const unlockedTitles = new Set(this.data.player.unlockedTitles);
        const cards = catalog.map((title) => {
            const isUnlocked = unlockedTitles.has(title.id);
            const isActive = this.data.player.activeTitle === title.id;
            const level = this.getTitleLevel(title.id);
            const maxLevel = title.maxLevel || 10;
            const atMax = level >= maxLevel;
            const upgradeCost = this.getTitleUpgradeCost(title.id);
            const canUpgrade = isUnlocked && !atMax && this.data.coins >= upgradeCost;
            const canBuy = !isUnlocked && this.data.coins >= title.cost;
            const desc = title.levelDesc ? title.levelDesc(level) : title.desc;

            let actionButtons = '';
            if (!isUnlocked) {
                actionButtons = `<button class="menu-btn primary-btn" data-title-action="${title.id}" ${canBuy ? '' : 'disabled'}>解鎖 (${title.cost} 星幣)</button>`;
            } else {
                const equipBtn = `<button class="menu-btn" data-title-action="${title.id}" ${isActive ? 'disabled' : ''}>${isActive ? '已裝備' : '裝備'}</button>`;
                let upgradeBtn = '';
                if (!atMax) {
                    upgradeBtn = `<button class="menu-btn primary-btn" data-title-upgrade="${title.id}" ${canUpgrade ? '' : 'disabled'}>升級 (${upgradeCost})</button>`;
                } else {
                    upgradeBtn = `<button class="menu-btn primary-btn" disabled>已滿級</button>`;
                }
                actionButtons = `<div class="title-actions" style="display:flex; gap:8px;">${equipBtn}${upgradeBtn}</div>`;
            }

            return `
                <article class="inventory-card title-card ${isActive ? 'selected' : ''}">
                    <span class="inventory-label">${isUnlocked ? `Lv.${level}/${maxLevel}` : '未解鎖'}</span>
                    <div class="inventory-meta">
                        <h3>${title.name}</h3>
                        <p>${desc}</p>
                    </div>
                    ${actionButtons}
                </article>
            `;
        }).join('');

        this.els.titleModalDesc.innerHTML = `<div class="title-grid title-upgrade-grid">${cards}</div>`;
        this.setModalActive(this.els.titleModal, true);

        // Bind title actions
        this.els.titleModalDesc.querySelectorAll('[data-title-action]').forEach(el => {
            el.addEventListener('click', () => {
                if (window.audio) window.audio.playClick();
                this.unlockOrEquipTitle(el.dataset.titleAction);
                this.setModalActive(this.els.titleModal, false);
            });
        });
        this.els.titleModalDesc.querySelectorAll('[data-title-upgrade]').forEach(el => {
            el.addEventListener('click', () => {
                if (window.audio) window.audio.playClick();
                this.upgradeTitleLevel(el.dataset.titleUpgrade);
                this.setModalActive(this.els.titleModal, false);
            });
        });
    }

    upgradeTitleLevel(titleId) {
        const title = this.getTitleCatalog().find(t => t.id === titleId);
        if (!title) return;
        if (!this.data.player.unlockedTitles.includes(titleId)) return;
        const level = this.getTitleLevel(titleId);
        const maxLevel = title.maxLevel || 10;
        if (level >= maxLevel) {
            this.showMessage('已達最高等級', 'error');
            return;
        }
        const cost = this.getTitleUpgradeCost(titleId);
        if (this.data.coins < cost) {
            this.showMessage('星幣不足', 'error');
            return;
        }
        this.data.coins -= cost;
        this.data.stats.coinsSpent += cost;
        if (!this.data.player.titleLevels) this.data.player.titleLevels = {};
        this.data.player.titleLevels[titleId] = level + 1;
        this.saveData();
        this.renderInventoryPanel();
        this.showMessage(`${title.name} 升級至 Lv.${level + 1}`);
    }

    selectPlayableCharacter(characterId) {
        if (!this.getPlayableCharacters().some((character) => character.id === characterId)) return;
        this.data.player.selectedCharacter = characterId;
        this.saveData({ showToast: false });
        this.renderInventoryPanel();
        this.refreshHubGuide({ panelId: this.activeHubPanel });
        this.showMessage('人物已切換');
    }

    unlockOrEquipTitle(titleId) {
        const title = this.getTitleCatalog().find((item) => item.id === titleId);
        if (!title) return;

        if (this.data.player.unlockedTitles.includes(titleId)) {
            this.data.player.activeTitle = titleId;
            this.saveData({ showToast: false });
            this.renderInventoryPanel();
            this.showMessage(`已裝備稱號：${title.name}`);
            return;
        }

        if (this.data.coins < title.cost) {
            this.showMessage('星幣不足，無法解鎖稱號。', 'error');
            return;
        }

        this.data.coins -= title.cost;
        this.data.stats.coinsSpent += title.cost;
        this.data.player.unlockedTitles.push(titleId);
        this.data.player.activeTitle = titleId;
        this.saveData();
        this.renderInventoryPanel();
        this.showMessage(`稱號解鎖：${title.name}`);
    }

    renderHomeSaveNote() {
        if (!this.els.homeSaveNote) return;
        this.els.homeSaveNote.textContent = this.currentUser
            ? `目前已登入 ${this.currentUser.displayName || '玩家'}，進度會先保存在本機，再自動同步到雲端。`
            : '未登入時將記錄保存在這台裝置；登入 Google 後會自動同步到雲端。';
    }

    renderSettingsPanel() {
        if (this.els.settingsCloudTitle) {
            this.els.settingsCloudTitle.textContent = this.currentUser
                ? `${this.currentUser.displayName || '玩家'} 的雲端存檔`
                : '本機存檔模式';
        }
        if (this.els.settingsCloudCopy) {
            this.els.settingsCloudCopy.textContent = this.currentUser
                ? '金幣、體力與關卡進度會在操作後自動同步；如果你剛切換裝置，也可以手動把目前進度立即上傳。'
                : '未登入時只會保存在這台裝置。登入 Google 後，遊戲會自動讀取並同步你的雲端存檔。';
        }
        if (this.els.btnCloudSync) {
            this.els.btnCloudSync.classList.toggle('hidden', !this.currentUser);
        }
        if (this.els.settingsAuthCard) {
            this.els.settingsAuthCard.classList.toggle('hidden', !!this.currentUser);
        }
    }

    renderHubDashboard() {
        this.renderHomeSaveNote();
        this.renderSettingsPanel();

        // Toggle between start screen and game hub
        const hubEl = document.querySelector('#view-hub .hub-content');
        const bottomNav = document.getElementById('hub-bottom-nav');
        if (!this.sessionStarted) {
            if (hubEl) {
                hubEl.classList.add('home-screen');
                hubEl.classList.remove('hub-hero-layout', 'home-screen-exit');
            }
            if (this.els.globalHeader) this.els.globalHeader.classList.add('hidden');
            if (bottomNav) bottomNav.classList.add('hidden');
        } else {
            if (hubEl) {
                hubEl.classList.remove('home-screen', 'home-screen-exit');
                hubEl.classList.add('hub-hero-layout');
            }
            if (bottomNav) bottomNav.classList.remove('hidden');
            // globalHeader is managed by showHubPanel
        }
        this.dailyChallenge = this.generateDailyChallenge();
        this.syncWeeklyProgress();
        const currentLevel = this.getStoryProgressLevel();
        const hasStoryLeft = currentLevel && currentLevel.id <= this.levels.length;

        if (this.els.storyProgressBadge) {
            this.els.storyProgressBadge.textContent = hasStoryLeft
                ? `${currentLevel.chapter}｜第 ${currentLevel.id} 關`
                : '主線已結案';
        }

        if (this.els.storyNextTitle) {
            this.els.storyNextTitle.textContent = hasStoryLeft ? currentLevel.title : '所有正式委託已完成';
        }

        if (this.els.storyNextDesc) {
            this.els.storyNextDesc.textContent = hasStoryLeft
                ? `${currentLevel.request} ${currentLevel.clue}`
                : '可以重玩主線關卡，或專心衝刺每日挑戰與每週全勤獎勵。';
        }

        if (this.els.storyProgressText) {
            this.els.storyProgressText.textContent = hasStoryLeft
                ? `${currentLevel.chapter}｜第 ${currentLevel.id} 關：${currentLevel.title}`
                : '所有正式委託已封存';
        }

        if (this.els.homeStoryCopy) {
            this.els.homeStoryCopy.textContent = hasStoryLeft
                ? `${currentLevel.intro || '新的邊境委託已送達。'} ${currentLevel.request} 提示：${currentLevel.clue}`
                : '主線故事已完成。可以從任務清單重玩已封存的委託，或挑戰每日與無盡討伐。';
        }

        if (this.els.hubTaskText) {
            this.els.hubTaskText.textContent = hasStoryLeft
                ? `我們得處理「${currentLevel.title}」這張委託了。`
                : '今天暫時沒有新的邊境急件。';
        }

        if (this.els.dailyStatusText) {
            const rewardClaimed = this.data.daily.rewardDate === this.dailyChallenge.dateKey;
            this.els.dailyStatusText.textContent = rewardClaimed ? '今日獎勵已領取' : '今日首通可得 500 星幣';
        }

        this.renderHubCast();
        this.renderStoryFeed();
        this.renderDailyPanel();
        this.renderWeeklyCalendar();
        this.renderInventoryPanel();
        this.showHubPanel(this.activeHubPanel);
        this.refreshHubGuide({ panelId: this.activeHubPanel });
    }

    bindEvents() {
        document.querySelectorAll('#view-hub .menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.audio) window.audio.playClick();
                const rect = btn.getBoundingClientRect();
                this.particles.createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 10, {
                    variant: 'spark',
                    colors: ['#ffd166', '#ffcad4', '#a9def9'],
                    distance: [18, 56],
                    duration: 850
                });
            });
        });

        this.els.btnHeroInteract?.addEventListener('click', () => {
            if (window.audio) window.audio.playScan();
            this.particles.createCelebration(window.innerWidth / 2, window.innerHeight * 0.4);
            this.refreshHubGuide({ rerollCharacter: true, panelId: this.activeHubPanel });
        });

        this.els.btnHubTipShop?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.showLocation('shop');
        });

        this.els.btnHubHome?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.forceReturnHub();
        });

        this.els.btnGuestStart?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            
            // Prioritize entering the hub first for better responsiveness on mobile
            this.sessionStarted = true;
            this.enterHub();
            this.saveData({ showToast: false });

            // Try fullscreen as a progressive enhancement, catching any browser-specific errors
            if (typeof document.documentElement.requestFullscreen === 'function') {
                document.documentElement.requestFullscreen().catch(() => {
                    // Fail silently as many mobile browsers block this or have restricted support
                });
            }
        });

        this.els.btnDailyStart?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.startDailyChallenge();
        });

        this.els.btnEndlessStart?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.startEndless();
        });

        this.els.btnCharacterClose?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.setModalActive(this.els.characterModal, false);
        });

        this.els.btnTitleClose?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.setModalActive(this.els.titleModal, false);
        });

        this.els.hubBottomNav?.addEventListener('click', (e) => {
            const btn = e.target.closest('.hub-nav-btn');
            if (!btn) return;

            if (window.audio) window.audio.playClick();
            const target = btn.dataset.hubTarget;
            if (target === 'shop') {
                this.showHubPanel('shop');
                return;
            }
            if (target === 'missions') {
                this.enterStoryMap();
                return;
            }
            this.showLocation('hub');
            this.showHubPanel(target);
        });

        this.els.btnGachaDraw?.addEventListener('click', () => {
            this.drawFamiliar();
        });

        this.els.btnGachaClose?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.els.gachaOverlay.classList.remove('active', 'reveal');
        });

        this.els.petInventoryGrid?.addEventListener('click', (e) => {
            const card = e.target.closest('.pet-card.owned');
            if (!card) return;
            if (window.audio) window.audio.playClick();
            this.setActivePet(card.dataset.id);
        });

        this.els.inventoryGrid?.addEventListener('click', (e) => {
            const charSelect = e.target.closest('[data-open-character-select]');
            if (charSelect) {
                if (window.audio) window.audio.playClick();
                this.openCharacterSelectModal();
                return;
            }

            const titlePage = e.target.closest('[data-open-title-page]');
            if (titlePage) {
                if (window.audio) window.audio.playClick();
                this.openTitleUpgradePage();
            }
        });

        this.els.btnToggleAudio?.addEventListener('click', () => {
            if (window.audio) {
                const muted = window.audio.toggleMute();
                this.showMessage(muted ? '背景音效已關閉' : '背景音效已開啟');
            }
        });

        this.els.btnDeleteData?.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.openConfirmModal({
                title: '重置資料',
                description: '確定要刪除所有本機資料並重新開始嗎？此操作無法撤銷。如果已登入 Google，下次登入時會恢復雲端資料。',
                cancelText: '取消',
                okText: '確定刪除',
                okVariant: 'danger',
                onOk: () => {
                    localStorage.removeItem(this.storageKey);
                    this.showMessage('資料已清除，正在重新啟動...', 'info');
                    setTimeout(() => location.reload(), 1500);
                }
            });
        });

        this.els.btnCloudSync?.addEventListener('click', async () => {
            if (window.audio) window.audio.playClick();
            if (!this.currentUser) {
                this.showMessage('請先登入 Google 帳號後再上傳。', 'error');
                return;
            }
            try {
                const synced = await window.cloudSave?.forceSync?.();
                this.showMessage(synced ? '目前進度已手動上傳到雲端。' : '手動上傳未完成，請稍後再試。', synced ? 'info' : 'error');
            } catch (error) {
                console.error(error);
                this.showMessage('手動上傳失敗，請稍後再試。', 'error');
            }
        });

        // Explicit fallback for settings login button in case global listener fails
        const settingsLoginBtn = document.getElementById('btn-settings-login-google');
        if (settingsLoginBtn) {
            settingsLoginBtn.addEventListener('click', () => {
                if (!this.currentUser && window.firebaseAuth?.loginWithGoogle) {
                    if (window.audio) window.audio.playClick();
                    window.firebaseAuth.loginWithGoogle();
                }
            });
        }

        this.els.btnGlobalBack.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.audio) window.audio.playClick();
            
            if (this.viewState === 'hub' && this.activeHubPanel !== 'home') {
                this.showHubPanel('home');
            } else {
                this.forceReturnHub();
            }
        });

        this.els.btnQuit.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.openConfirmModal({
                title: '確認',
                description: '確定要撤退嗎？這將不會退還已消耗的體力。',
                cancelText: '取消',
                okText: '確定撤退',
                okVariant: 'danger',
                onOk: () => {
                    this.closeConfirmModal();
                    this.clearCombatTimer();
                    this.forceReturnHub();
                }
            });
        });

        this.els.btnConfirmCancel.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.closeConfirmModal({ runCancel: true });
        });
        this.els.btnConfirmOk.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            if (this.pendingConfirmAction) {
                this.pendingConfirmAction();
            } else {
                this.closeConfirmModal();
            }
        });

        this.els.palette.addEventListener('click', e => {
            const btn = e.target.closest('.palette-btn');
            if (btn && !this.gameState.solved && !this.dialogue.isPlaying) this.handleIngredientTap(btn.dataset.id);
        });

        this.els.slotsContainer.addEventListener('click', (e) => {
            const slot = e.target.closest('.slot');
            if (slot && !this.gameState.solved && !this.dialogue.isPlaying) {
                const idx = parseInt(slot.dataset.index);
                if (this.gameState.hints.includes(idx)) return;
                if (this.gameState.selectedSlot === idx && this.gameState.input[idx]) {
                    this.clearSlot(idx);
                } else {
                    if (window.audio) window.audio.playClick();
                    this.setSelectedSlot(idx);
                }
            }
        });

        this.els.btnSubmit.addEventListener('click', () => {
            if (!this.dialogue.isPlaying) this.submitPotion();
        });

        this.els.btnHint.addEventListener('click', () => {
            if (!this.dialogue.isPlaying) this.useHint();
        });

        this.els.btnModalAction.addEventListener('click', () => {
            if (window.audio) window.audio.playClick();
            this.closeResultModal();
            if (this.gameState.gameOver) {
                this.forceReturnHub();
            } else {
                this.forceReturnHub();
            }
        });
    }

    renderMap() {
        if (this.els.btnMapDaily) {
            this.dailyChallenge = this.generateDailyChallenge();
            this.els.btnMapDaily.textContent = this.canClaimDailyReward() ? '每日挑戰 +500' : '每日 / 無盡';
        }
        this.els.levelGrid.innerHTML = '';
        let visibleIndex = 0;
        this.levels.forEach(lv => {
            // Completely hide locked levels
            if (lv.id > this.data.highestLevel && lv.id > 1) return;

            const isNew = lv.id === this.data.highestLevel && this.data.highestLevel > this.lastHighestLevel;
            const stars = this.data.levelStars[lv.id] || 0;
            const card = document.createElement('div');

            card.className = `level-card ${isNew ? 'new-level-glow' : ''}`;
            card.style.setProperty('--stagger-delay', `${Math.min(visibleIndex, 6) * 70}ms`);
            card.innerHTML = this.getLevelCardMarkup(lv, stars);

            card.addEventListener('click', () => {
                if (window.audio) window.audio.playClick();
                const rect = card.getBoundingClientRect();
                this.particles.createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 14, {
                    variant: 'spark',
                    colors: ['#ffe08c', '#ffffff', '#a4f5df'],
                    distance: [20, 72],
                    duration: 900
                });
                this.startGame('story', lv.id)
            });
            this.els.levelGrid.appendChild(card);
            visibleIndex++;

            if (isNew) {
                // Remove glow after animation
                setTimeout(() => { card.classList.remove('new-level-glow'); this.lastHighestLevel = this.data.highestLevel; }, 2600);
            }
        });
    }

    renderShop() {
        const items = this.getShopInventory();
        this.els.shopItems.innerHTML = '';
        items.forEach(item => {
            if (item.repeat === false && item.cond && !item.cond()) return; // already bought unique

            const div = document.createElement('div');
            div.className = 'shop-item';
            div.style.setProperty('--stagger-delay', `${this.els.shopItems.children.length * 80}ms`);
            const disabled = item.disabled ? item.disabled() : false;
            const icon = item.icon || '🔮';
            const buttonLabel = disabled
                ? '暫無需求'
                : `售價 ${item.cost}`;
            div.innerHTML = `
                <div class="shop-item-icon">${icon}</div>
                <div class="shop-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.desc}</p>
                    <p class="shop-item-meta">${item.category}｜${item.tier}</p>
                    <p class="shop-item-meta">${item.effectText ? item.effectText() : item.desc}</p>
                    <p class="shop-item-meta">${item.statusText ? item.statusText() : '可立即購買'}</p>
                </div>
                <button class="buy-btn" data-id="${item.id}" ${(this.data.coins < item.cost || disabled) ? 'disabled' : ''}>
                    <img src="assets/icons/coin.png" alt="星幣">${buttonLabel}
                </button>
            `;
            const btn = div.querySelector('button');
            btn.addEventListener('click', () => {
                if (this.data.coins >= item.cost && !disabled) {
                    if (window.audio) window.audio.playLoot ? window.audio.playLoot() : window.audio.playSuccess();
                    const rect = btn.getBoundingClientRect();
                    this.particles.createCelebration(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    this.data.coins -= item.cost;
                    this.data.stats.coinsSpent += item.cost;
                    item.action();
                    this.saveData();
                    this.renderShop();
                    this.showMessage(item.id === 'staminaPack' ? '補給成功，體力已回復' : '交涉成功，設備已升級');
                }
            });
            this.els.shopItems.appendChild(div);
        });
    }

    startDailyChallenge() {
        this.closeResultModal();
        this.closeConfirmModal();
        this.activeHubPanel = 'daily';

        // Each daily challenge costs 5 stamina
        if (this.data.stamina < 5) {
            this.showMessage('體力不足，每日挑戰需要 5 點體力。', 'error');
            this.showStaminaHelp(5);
            return;
        }
        this.data.stamina -= 5;

        // Track play count for today
        const dateKey = this.getDateKey();
        if (this.data.daily.lastPlayedDate !== dateKey) {
            this.data.daily.playCount = 0;
        }
        this.data.daily.playCount = (this.data.daily.playCount || 0) + 1;
        this.data.daily.lastPlayedDate = dateKey;
        const playCount = this.data.daily.playCount;

        // First play uses today's fixed challenge, 2nd+ are random
        let challenge;
        if (playCount <= 1) {
            challenge = this.generateDailyChallenge();
        } else {
            // Random challenge
            const pool = this.getDailyChallengePool();
            const chosen = pool[Math.floor(Math.random() * pool.length)];
            const slotCount = 5;
            challenge = this.normalizePuzzleDefinition({
                id: `daily-${dateKey}-${playCount}`,
                dateKey,
                name: `每日挑戰｜${chosen.title}`,
                title: chosen.title,
                client: '每日星象演算',
                request: '每日挑戰，每次消耗 5 體力，過關獲得 10 金幣。',
                rule: chosen.rule,
                ruleLabel: chosen.ruleLabel,
                slotCount,
                storyClue: this.getRuleClue(chosen.rule, slotCount),
                chapter: '每日挑戰',
                chapterIndex: 1,
                intro: '',
                perfect: '挑戰完成！',
                good: '挑戰完成。',
                rough: '勉強過關。',
                fail: '挑戰失敗。'
            });
        }
        this.dailyChallenge = challenge;
        this.saveData({ showToast: false });

        this.gameMode = 'daily';
        this.currentLevel = 0;
        this.els.viewGame?.classList.remove('endless-battle');
        this.requestFS();
        this.showLocation('game');
        const maxMana = this.getModeMaxMana('daily');
        this.gameState = { mana: maxMana, maxMana, orderCount: 1, scoreCoins: 0, gameOver: false, hintPenalty: false, dailyRewardGranted: false, weeklyRewardGranted: false };
        this.els.leaderboardBox.classList.add('hidden');

        // Only show intro dialogue for the first play of the day
        if (playCount <= 1) {
            const lines = [
                {
                    speaker: this.getCharacterProfile('scout').name,
                    portrait: this.getCharacterProfile('scout').portraitClass,
                    text: '每日挑戰已解封。每次消耗 5 體力，過關獲得 10 金幣。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: `今天的題目是「${this.dailyChallenge.title}」。規格重點：${this.dailyChallenge.clue}`
                }
            ];
            this.dialogue.play(lines, () => {
                this.setupBoard(
                    this.dailyChallenge.name,
                    `每日挑戰｜${this.dailyChallenge.ruleLabel}`,
                    this.dailyChallenge.rule,
                    this.dailyChallenge.slotCount,
                    this.dailyChallenge
                );
            });
        } else {
            // 2nd+ play: go directly to board, no dialogue, no hints
            this.setupBoard(
                this.dailyChallenge.name,
                `每日挑戰｜${this.dailyChallenge.ruleLabel}`,
                this.dailyChallenge.rule,
                this.dailyChallenge.slotCount,
                this.dailyChallenge
            );
        }
    }

    startEndless() {
        this.startGame('endless');
    }

    startGame(mode, levelId = 1) {
        this.closeResultModal();
        this.closeConfirmModal();
        const staminaCost = mode === 'endless' ? 30 : mode === 'story' ? 10 : 0;
        if (staminaCost > 0 && this.data.stamina < staminaCost) {
            this.showMessage('體力不足，請先補充後再出發。', 'error');
            this.showStaminaHelp(staminaCost);
            return;
        }

        if (staminaCost > 0) {
            this.data.stamina -= staminaCost;
            if (mode === 'endless') this.data.stats.endlessPlayed++;
            this.saveData({ showToast: false });
        }

        this.gameMode = mode;
        this.currentLevel = levelId;
        this.els.viewGame?.classList.toggle('endless-battle', mode === 'endless');
        this.requestFS();
        this.playTransitionOverlay(() => {
            this.showLocation('game');
        });

        const maxMana = this.getModeMaxMana(mode);
        this.gameState = {
            mana: maxMana,
            maxMana,
            orderCount: 0,
            defeated: 0,
            score: 0,
            scoreCoins: 0,
            hp: this.getEndlessMaxHp(),
            maxHp: this.getEndlessMaxHp(),
            gameOver: false,
            hintPenalty: false,
            dailyRewardGranted: false,
            weeklyRewardGranted: false
        };
        this.els.leaderboardBox.classList.add('hidden');

        // Play story explicitly every time
        if (mode === 'endless') {
            this.dialogue.play([
                {
                    speaker: this.getCharacterProfile('scout').name,
                    portrait: this.getCharacterProfile('scout').portraitClass,
                    text: '無盡討伐已開場。每場消耗 30 體力，敵人會在倒數結束時反擊。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: '我要用完整咒語解開陣式。每擊敗一名敵人都會累積分數並回復部分精神力。'
                }
            ], () => this.nextEndlessOrder());
        } else {
            const lv = this.levels.find(l => l.id === levelId);
            this.dialogue.play(this.buildLevelIntro(lv), () => this.startPattern(levelId));
        }
    }

    nextEndlessOrder() {
        if (this.gameState.gameOver) return;
        this.gameState.orderCount++;
        this.gameState.hintPenalty = false;
        const endlessOrder = this.generateEndlessOrder(this.gameState.orderCount);
        this.gameState.currentEnemy = this.getEnemyForOrder(this.gameState.orderCount);
        this.els.combatEnemy?.classList.remove('defeated', 'attacking');
        this.setupBoard(
            endlessOrder.name,
            `無盡討伐｜${endlessOrder.ruleLabel}`,
            endlessOrder.rule,
            endlessOrder.slotCount,
            endlessOrder
        );
    }

    startPattern(levelId) {
        const lv = this.levels.find(l => l.id === levelId);
        this.setupBoard(lv.name, `${lv.client}｜${lv.ruleLabel}`, lv.rule, lv.slotCount, lv);
    }

    clearCombatTimer() {
        if (this.combatTimerId) {
            clearInterval(this.combatTimerId);
            this.combatTimerId = null;
        }
    }

    updatePlayerCombatPortrait() {
        const character = this.getPlayableCharacter();
        const stage = this.getPlayerStage(character);

        if (this.els.gamePlayerImage) {
            this.els.gamePlayerImage.src = stage.image;
            this.els.gamePlayerImage.alt = character.name;
        }
        if (this.els.gamePlayerName) this.els.gamePlayerName.textContent = character.name;
        if (this.els.gamePlayerTitle) this.els.gamePlayerTitle.textContent = '';
    }

    updateCombatStage() {
        if (!this.els.combatStage) return;

        this.updatePlayerCombatPortrait();
        const isEndless = this.gameMode === 'endless';
        const hasStoryTimer = this.gameMode === 'story' && Number.isFinite(this.gameState.timeLimit) && this.gameState.timeLimit > 0;
        this.els.viewGame?.classList.toggle('endless-battle', isEndless);
        this.els.viewGame?.classList.toggle('abyssal-theme', isEndless);
        this.els.combatStage?.classList.toggle('is-endless', isEndless);
        const isBoss = !!this.gameState.currentPuzzle?.isBoss;
        this.els.combatEnemy?.classList.toggle('is-boss', isBoss);
        
        if (isBoss && !this.gameState.gameOver) {
            this.particles.createCauldronPulse(window.innerWidth / 2, window.innerHeight * 0.45);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
        this.els.combatModeTag.textContent = isEndless
            ? `無盡討伐｜得分 ${this.gameState.score || 0}`
            : this.gameMode === 'daily'
                ? '每日挑戰'
                : '故事委託';

        if (this.els.combatTimerLabelText) {
            this.els.combatTimerLabelText.textContent = isEndless ? '攻擊倒數' : '限時提交';
        }
        this.els.combatTimer?.classList.toggle('hidden', !(isEndless || hasStoryTimer));
        this.els.combatHp?.classList.toggle('hidden', !isEndless);
        this.els.combatEnemy?.classList.toggle('hidden', !isEndless);

        if (isEndless) {
            this.updateEndlessHud();
            this.updateEnemyUI();
        } else if (hasStoryTimer) {
            this.updateEndlessHud();
        }
    }

    updateEnemyUI() {
        const enemy = this.gameState.currentEnemy || this.getEnemyForOrder(this.gameState.orderCount || 1);
        if (this.els.combatEnemyImage) {
            this.els.combatEnemyImage.src = enemy.image;
            this.els.combatEnemyImage.alt = enemy.name;
        }
        if (this.els.combatEnemyName) this.els.combatEnemyName.textContent = enemy.name;
        if (this.els.combatEnemyCount) {
            this.els.combatEnemyCount.textContent = `第 ${this.gameState.orderCount || 1} 隻｜${this.gameState.slotCount || 3} 格咒語`;
        }
    }

    updateEndlessHud() {
        if (this.gameState.maxHp) {
            const hpPct = Math.max(0, Math.min(100, (this.gameState.hp / this.gameState.maxHp) * 100));
            if (this.els.combatHpValue) this.els.combatHpValue.textContent = `${this.gameState.hp} / ${this.gameState.maxHp}`;
            if (this.els.combatHpFill) this.els.combatHpFill.style.width = `${hpPct}%`;
        }

        if (this.gameState.timeLimit && this.els.combatTimerFill) {
            const timePct = Math.max(0, Math.min(100, (this.gameState.timeLeft / this.gameState.timeLimit) * 100));
            this.els.combatTimerFill.style.width = `${timePct}%`;
        }
        if (this.els.combatTimerValue && Number.isFinite(this.gameState.timeLeft)) {
            this.els.combatTimerValue.textContent = `${this.gameState.timeLeft}`;
        }
    }

    startEndlessTimer() {
        this.clearCombatTimer();
        if (this.gameMode !== 'endless' || this.gameState.gameOver) return;

        this.gameState.timeLimit = this.getEndlessTimeLimit(this.gameState.slotCount);
        this.gameState.timeLeft = this.gameState.timeLimit;
        this.updateEndlessHud();

        this.combatTimerId = setInterval(() => {
            if (this.gameMode !== 'endless' || this.gameState.solved || this.els.modal.classList.contains('active')) return;
            this.gameState.timeLeft -= 1;
            this.updateEndlessHud();
            if (this.gameState.timeLeft <= 0) {
                this.handleEndlessTimeout();
            }
        }, 1000);
    }

    startStoryTimer() {
        this.clearCombatTimer();
        if (this.gameMode !== 'story' || this.gameState.gameOver || !this.gameState.timeLimit) return;

        this.gameState.timeLeft = this.gameState.timeLimit;
        this.updateEndlessHud();

        this.combatTimerId = setInterval(() => {
            if (this.gameMode !== 'story' || this.gameState.solved || this.els.modal.classList.contains('active')) return;
            this.gameState.timeLeft -= 1;
            this.updateEndlessHud();
            if (this.gameState.timeLeft <= 0) {
                this.handleStoryTimeout();
            }
        }, 1000);
    }

    handleStoryTimeout() {
        this.clearCombatTimer();
        if (this.gameMode !== 'story' || this.gameState.gameOver || !this.gameState.timeLimit) return;

        this.gameState.input = this.gameState.input.map((value, index) => this.gameState.hints.includes(index) ? value : null);
        this.gameState.selectedSlot = this.getNextSelectableSlot(0);
        if (window.audio) window.audio.playWarning ? window.audio.playWarning() : window.audio.playError();
        this.showMessage('限時已到，這次調配被迫重置。', 'error');
        this.updateGameUI();

        setTimeout(() => {
            if (!this.gameState.solved && !this.gameState.gameOver) this.startStoryTimer();
        }, 250);
    }

    handleEndlessTimeout() {
        this.clearCombatTimer();
        if (this.gameMode !== 'endless' || this.gameState.gameOver) return;

        this.gameState.hp = Math.max(0, this.gameState.hp - 1);
        this.gameState.input = this.gameState.input.map((value, index) => this.gameState.hints.includes(index) ? value : null);
        this.els.combatEnemy?.classList.add('attacking');
        this.els.combatStage?.querySelector('.combat-player')?.classList.add('taking-damage');

        // Cute attack sparkle particles around enemy
        const enemyEl = this.els.combatEnemy;
        if (enemyEl) {
            const rect = enemyEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height * 0.4;
            this.particles.createExplosion(cx, cy, 15, {
                variant: 'spark',
                colors: ['#ff6b9d', '#ffd166', '#ff8fab', '#ffadca'],
                distance: [20, 60],
                minSize: 6,
                maxSize: 14,
                duration: 800
            });
            // Impact particles on player
            setTimeout(() => {
                const playerEl = this.els.combatStage?.querySelector('.combat-player');
                if (playerEl) {
                    const pr = playerEl.getBoundingClientRect();
                    this.particles.createExplosion(pr.left + pr.width / 2, pr.top + pr.height / 2, 8, {
                        variant: 'mist',
                        colors: ['#ef476f', '#ffd6e0', '#ff8fab'],
                        distance: [10, 30],
                        minSize: 5,
                        maxSize: 10,
                        duration: 600
                    });
                }
            }, 250);
        }

        setTimeout(() => {
            this.els.combatStage?.querySelector('.combat-player')?.classList.remove('taking-damage');
        }, 400);
        if (window.audio) window.audio.playWarning ? window.audio.playWarning() : window.audio.playError();
        this.showMessage('咒語逾時，敵人反擊！', 'error');
        this.updateGameUI();

        if (this.gameState.hp <= 0) {
            this.handleGameOver('hp');
            return;
        }

        setTimeout(() => {
            this.els.combatEnemy?.classList.remove('attacking');
            this.startEndlessTimer();
        }, 700);
    }

    setupBoard(title, desc, rule, slotCount = 5, levelData = null) {
        this.clearCombatTimer();
        this.els.gameTitle.textContent = title;
        this.els.gameDesc.textContent = desc;
        this.gameState.slotCount = slotCount;
        this.gameState.maxMana = this.gameState.maxMana || this.getModeMaxMana(this.gameMode);
        this.gameState.secret = this.generateSecret(rule, slotCount, Math.random);
        this.gameState.input = Array(slotCount).fill(null);
        this.gameState.turn = 0;
        this.gameState.hints = [];
        this.gameState.solved = false;
        this.gameState.levelData = levelData;
        this.gameState.timeLimit = this.gameMode === 'story' && levelData?.timeLimit ? levelData.timeLimit : 0;
        this.gameState.timeLeft = this.gameState.timeLimit || 0;
        this.gameState.selectedSlot = 0;

        // Setup visual slots dynamically
        this.els.slotsContainer.innerHTML = '';
        for (let i = 0; i < slotCount; i++) {
            const d = document.createElement('div');
            d.className = 'slot';
            d.dataset.index = i;
            this.els.slotsContainer.appendChild(d);
        }
        // Save current DOM slots references
        this.els.slots = Array.from(document.querySelectorAll('.slot'));

        const hintText = this.gameMode === 'endless'
            ? `${levelData.ruleLabel}<br>${levelData.clue}<br><br>試錯紀錄會顯示在這裡，每一次施放都會標出第幾次嘗試。`
            : levelData
                ? `${levelData.ruleLabel}<br>${levelData.clue}<br><br>先點選要放置的格位，再點素材。`
                : '等待輸入序列...<br>先點選格位，再點素材，精確的推理將是節省精神力的唯一出路。';
        this.els.history.innerHTML = `<div class="empty-hint">${hintText}</div>`;
        this.updateCombatStage();
        this.updateGameUI();
        requestAnimationFrame(() => this.updateLayoutMetrics());
        if (this.gameMode === 'endless') this.startEndlessTimer();
        else if (this.gameMode === 'story' && this.gameState.timeLimit) this.startStoryTimer();
    }

    getNextSelectableSlot(startIndex = 0) {
        const total = this.gameState.slotCount || 0;
        if (!total) return -1;

        for (let offset = 0; offset < total; offset++) {
            const idx = (startIndex + offset) % total;
            if (!this.gameState.hints.includes(idx) && this.gameState.input[idx] === null) {
                return idx;
            }
        }

        for (let offset = 0; offset < total; offset++) {
            const idx = (startIndex + offset) % total;
            if (!this.gameState.hints.includes(idx)) return idx;
        }

        return -1;
    }

    setSelectedSlot(index) {
        if (index < 0 || index >= this.gameState.slotCount) return;
        if (this.gameState.hints.includes(index)) return;
        this.gameState.selectedSlot = index;
        this.updateGameUI();
    }

    shuffleSequence(sequence, rng = Math.random) {
        const clone = [...sequence];
        for (let i = clone.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [clone[i], clone[j]] = [clone[j], clone[i]];
        }
        return clone;
    }

    getCountMap(sequence) {
        return sequence.reduce((map, id) => {
            map[id] = (map[id] || 0) + 1;
            return map;
        }, {});
    }

    validatePattern(rule, sequence, slotCount = sequence.length) {
        if (!Array.isArray(sequence) || sequence.length !== slotCount || slotCount <= 0) return false;
        const counts = Object.values(this.getCountMap(sequence)).sort((a, b) => b - a);
        const uniqueCount = counts.length;
        const strictMajority = Math.floor(sequence.length / 2) + 1;

        switch (rule) {
            case 'unique':
                return slotCount <= this.symbols.length && uniqueCount === sequence.length && counts.every((count) => count === 1);
            case 'repeat-one':
                return uniqueCount === sequence.length - 1 && counts[0] === 2 && counts.slice(1).every((count) => count === 1);
            case 'triplet':
                return slotCount >= 5
                    && counts[0] === 3
                    && uniqueCount === sequence.length - 2
                    && counts.slice(1).every((count) => count === 1);
            case 'three-types':
                return slotCount >= 3 && uniqueCount === 3 && counts.every((count) => count >= 1);
            case 'bookend':
                return slotCount >= 4
                    && sequence[0] === sequence[sequence.length - 1]
                    && counts[0] === 2
                    && uniqueCount === sequence.length - 1
                    && counts.slice(1).every((count) => count === 1);
            case 'bookend-pair': {
                const edge = sequence[0];
                const map = this.getCountMap(sequence);
                return slotCount >= 6
                    && sequence[0] === sequence[sequence.length - 1]
                    && map[edge] === 2
                    && counts.filter((count) => count === 2).length === 2
                    && counts.filter((count) => count === 1).length === sequence.length - 4;
            }
            case 'twin-pairs':
                return slotCount % 2 === 0 && uniqueCount === slotCount / 2 && counts.every((count) => count === 2);
            case 'split-pairs':
                return slotCount >= 5
                    && counts.filter((count) => count === 2).length === 2
                    && counts.filter((count) => count === 1).length === sequence.length - 4;
            case 'weighted':
                return counts[0] >= strictMajority;
            case 'alternating':
                return uniqueCount === 2
                    && sequence.every((id, index) => index < 2 || id === sequence[index - 2])
                    && sequence.every((id, index) => index === 0 || id !== sequence[index - 1]);
            case 'no-adjacent':
                return sequence.every((id, index) => index === 0 || id !== sequence[index - 1]);
            case 'spectrum':
                if (sequence.length <= this.symbols.length) {
                    return uniqueCount === sequence.length && counts.every((count) => count === 1);
                }
                return sequence.length === this.symbols.length + 1
                    && uniqueCount === this.symbols.length
                    && counts.join('|') === '2|1|1|1|1';
            case 'spectrum-plus':
                return sequence.length === this.symbols.length + 2
                    && uniqueCount === this.symbols.length
                    && counts.join('|') === '2|2|1|1|1';
            case 'palindrome':
                return sequence.join('|') === [...sequence].reverse().join('|');
            case 'crown':
                return sequence.length === 6
                    && sequence[0] === sequence[sequence.length - 1]
                    && uniqueCount === 4
                    && counts.join('|') === '2|2|1|1'
                    && sequence[1] === sequence[sequence.length - 2];
            default:
                return Array.isArray(sequence) && sequence.length > 0;
        }
    }

    findValidSequence(rule, slotCount, rng = Math.random) {
        const ids = this.shuffleSequence(this.symbols.map((symbol) => symbol.id), rng);
        const current = [];
        let result = null;

        const search = () => {
            if (result) return;
            if (current.length === slotCount) {
                if (this.validatePattern(rule, current, slotCount)) {
                    result = [...current];
                }
                return;
            }

            for (const id of ids) {
                current.push(id);
                search();
                current.pop();
                if (result) return;
            }
        };

        search();
        return result;
    }

    generateSecret(rule, slotCount, rng = Math.random) {
        const ids = this.symbols.map(s => s.id);
        const r = (pool = ids) => pool[Math.floor(rng() * pool.length)];
        const pickDistinct = (count, pool = ids) => this.shuffleSequence(pool, rng).slice(0, count);
        const fillFromTypes = (types, total) => {
            const seq = [...types];
            while (seq.length < total) seq.push(types[Math.floor(rng() * types.length)]);
            return this.shuffleSequence(seq, rng);
        };
        const buildNoAdjacent = (length, pool = ids) => {
            const seq = [];
            while (seq.length < length) {
                const prev = seq[seq.length - 1];
                const choices = this.shuffleSequence(pool.filter(id => id !== prev), rng);
                seq.push(choices[0]);
            }
            return seq;
        };
        const generator = () => {
            if (rule === 'unique') return pickDistinct(slotCount);
            if (rule === 'repeat-one') {
                const singles = pickDistinct(slotCount - 1);
                const duplicate = singles[Math.floor(rng() * singles.length)];
                return this.shuffleSequence([...singles, duplicate], rng);
            }
            if (rule === 'triplet') {
                const lead = r();
                const singles = pickDistinct(slotCount - 3, ids.filter(id => id !== lead));
                return this.shuffleSequence([lead, lead, lead, ...singles], rng);
            }
            if (rule === 'three-types') {
                return fillFromTypes(pickDistinct(3), slotCount);
            }
            if (rule === 'bookend') {
                const picks = pickDistinct(slotCount - 1);
                const [edge, ...middle] = picks;
                return [edge, ...this.shuffleSequence(middle, rng), edge];
            }
            if (rule === 'bookend-pair') {
                const picks = pickDistinct(slotCount - 2);
                const [edge, pair, ...middleSingles] = picks;
                return [edge, ...this.shuffleSequence([pair, pair, ...middleSingles], rng), edge];
            }
            if (rule === 'twin-pairs') {
                const pairTypes = pickDistinct(slotCount / 2);
                return this.shuffleSequence(pairTypes.flatMap(id => [id, id]), rng);
            }
            if (rule === 'split-pairs') {
                const pairTypes = pickDistinct(2);
                const singles = pickDistinct(slotCount - 4, ids.filter(id => !pairTypes.includes(id)));
                return this.shuffleSequence([...pairTypes.flatMap(id => [id, id]), ...singles], rng);
            }
            if (rule === 'weighted') {
                const lead = r();
                const leadCount = Math.floor(slotCount / 2) + 1;
                const others = fillFromTypes(pickDistinct(Math.max(1, slotCount - leadCount), ids.filter(id => id !== lead)), slotCount - leadCount);
                return this.shuffleSequence(Array(leadCount).fill(lead).concat(others), rng);
            }
            if (rule === 'alternating') {
                const [a, b] = pickDistinct(2);
                return Array.from({ length: slotCount }, (_, idx) => idx % 2 === 0 ? a : b);
            }
            if (rule === 'no-adjacent') {
                return buildNoAdjacent(slotCount);
            }
            if (rule === 'spectrum') {
                const picked = pickDistinct(ids.length);
                if (slotCount <= ids.length) return picked.slice(0, slotCount);
                const bonus = picked[Math.floor(rng() * picked.length)];
                return this.shuffleSequence([...picked, bonus], rng);
            }
            if (rule === 'spectrum-plus') {
                const picked = pickDistinct(ids.length);
                const bonuses = pickDistinct(2, picked);
                return this.shuffleSequence([...picked, ...bonuses], rng);
            }
            if (rule === 'palindrome') {
                const half = Array.from({ length: Math.ceil(slotCount / 2) }, () => r());
                return half.concat([...half].slice(0, Math.floor(slotCount / 2)).reverse());
            }
            if (rule === 'crown') {
                const [edge, core, accent, support] = pickDistinct(4);
                return [edge, core, accent, support, core, edge];
            }
            return Array.from({ length: slotCount }, () => r());
        };

        for (let attempt = 0; attempt < 120; attempt++) {
            const sequence = generator();
            if (this.validatePattern(rule, sequence, slotCount)) {
                return sequence;
            }
        }

        const recovered = this.findValidSequence(rule, slotCount, rng);
        if (recovered) return recovered;

        console.error('Unable to generate a valid secret for rule', rule, slotCount);
        return Array.from({ length: slotCount }, () => r());
    }

    handleIngredientTap(id) {
        const selected = typeof this.gameState.selectedSlot === 'number'
            ? this.gameState.selectedSlot
            : this.getNextSelectableSlot(0);
        if (selected === -1) {
            this.showMessage('所有可用格位都已放滿，可點擊格位重新調整。', 'error');
            return;
        }

        if (!this.gameState.hints.includes(selected)) {
            this.gameState.input[selected] = id;
            if (window.audio) window.audio.playScan();
            const slotRect = this.els.slots[selected]?.getBoundingClientRect();
            if (slotRect) this.particles.createCauldronPulse(slotRect.left + slotRect.width / 2, slotRect.top + slotRect.height / 2);
            this.gameState.selectedSlot = this.getNextSelectableSlot(selected + 1);
            this.updateGameUI();
        }
    }

    clearSlot(idx) {
        if (this.gameState.hints.includes(idx)) return;
        this.gameState.input[idx] = null;
        this.gameState.selectedSlot = idx;
        if (window.audio) window.audio.playClick();
        this.updateGameUI();
    }

    getHintCost() {
        let base = 30;
        return base + Math.floor(this.currentLevel / 2);
    }

    getSubmitCost() {
        if (this.gameMode === 'endless') return 6 + Math.max(0, (this.gameState.slotCount || 3) - 3) * 2;
        if (this.gameMode === 'story' || this.gameMode === 'daily') return 5 + Math.floor((this.currentLevel || 1) / 5);
        return 5;
    }

    useHint() {
        // Disabled logic for high levels > 25
        if (this.currentLevel >= 26 && this.gameMode === 'story') {
            this.showMessage('高難度限制：查閱文獻已被公會封鎖！', 'error');
            return;
        }

        const cost = this.getHintCost();
        if (!this.consumeMana(cost)) return;
        if (this.gameMode === 'endless' && this.gameState.mana <= 0) {
            this.handleGameOver();
            return;
        }

        const cands = Array.from({ length: this.gameState.slotCount }, (_, idx) => idx).filter(i => !this.gameState.hints.includes(i));
        if (!cands.length) return;

        this.gameState.hintPenalty = true;
        if (this.gameMode !== 'endless') {
            this.showMessage('動用查閱文獻：當局評分鎖定為 1 星', 'error');
        }

        const h = cands[Math.floor(Math.random() * cands.length)];
        this.gameState.hints.push(h);
        this.gameState.input[h] = this.gameState.secret[h];
        if (this.gameState.selectedSlot === h) {
            this.gameState.selectedSlot = this.getNextSelectableSlot(h + 1);
        }
        if (window.audio) window.audio.playScaffold();
        const slotRect = this.els.slots[h]?.getBoundingClientRect();
        if (slotRect) this.particles.createExplosion(slotRect.left + slotRect.width / 2, slotRect.top + slotRect.height / 2, 10, { variant: 'spark', colors: ['#fff4bf', '#d8f3ff', '#f4d6ff'], distance: [18, 52], duration: 900 });
        this.updateGameUI();
    }

    submitPotion() {
        if (this.gameState.input.some(s => s === null)) return;

        const cost = this.getSubmitCost();

        if (!this.consumeMana(cost)) return;

        this.gameState.turn++;
        this.particles.createCauldronPulse(window.innerWidth / 2, window.innerHeight * 0.72);

        this.els.combatStage?.querySelector('.combat-player')?.classList.add('attacking');
        setTimeout(() => {
            this.els.combatStage?.querySelector('.combat-player')?.classList.remove('attacking');
        }, 320);

        const res = this.scoreGuess(this.gameState.input, this.gameState.secret);
        this.addHistoryRow([...this.gameState.input], res);

        if (res.exact > 0) {
            this.els.combatStage?.querySelector('.combat-player')?.classList.add('success');
            if (navigator.vibrate) navigator.vibrate(20);
            setTimeout(() => {
                this.els.combatStage?.querySelector('.combat-player')?.classList.remove('success');
            }, 600);
        }

        if (res.exact > 0 && res.exact < this.gameState.slotCount) {
            this.els.combatEnemy?.classList.add('taking-damage');
            setTimeout(() => {
                this.els.combatEnemy?.classList.remove('taking-damage');
            }, 400);
        }

        if (res.exact === this.gameState.slotCount) {
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            this.handleSolve();
        }
        else {
            if (window.audio) window.audio.playSkill();
            const explosionColors = this.gameMode === 'endless' ? ['#7b4bff', '#ff5799', '#3d304a'] : ['#a9def9', '#d0f4de', '#e4c1f9'];
            this.particles.createExplosion(window.innerWidth / 2, window.innerHeight * 0.45, 12, { variant: 'mist', colors: explosionColors, distance: [10, 55], minSize: 8, maxSize: 16, duration: 1400 });
            this.gameState.input = this.gameState.input.map((v, i) => this.gameState.hints.includes(i) ? v : null);
            this.updateGameUI();
            if (this.gameState.mana <= 0) this.handleGameOver();
            else if (this.gameMode === 'endless') this.startEndlessTimer();
            else if (this.gameMode === 'story' && this.gameState.timeLimit) this.startStoryTimer();
        }
    }

    scoreGuess(guess, secret) {
        let exact = 0, partial = 0, gR = {}, sR = {};
        for (let i = 0; i < this.gameState.slotCount; i++) {
            if (guess[i] === secret[i]) exact++;
            else {
                gR[guess[i]] = (gR[guess[i]] || 0) + 1;
                sR[secret[i]] = (sR[secret[i]] || 0) + 1;
            }
        }
        for (let k in gR) partial += Math.min(gR[k], sR[k] || 0);
        return { exact, partial };
    }

    consumeMana(cost) {
        if (this.gameState.mana <= 0) { this.handleGameOver(); return false; }
        this.gameState.mana -= cost;
        this.data.stats.manaSpent += cost;
        if (this.gameState.mana < 0) this.gameState.mana = 0;
        this.updateGameUI();
        if (this.gameState.mana === 0 && this.gameState.turn > 0) return true;
        return true;
    }

    handleEndlessVictory() {
        this.clearCombatTimer();
        this.gameState.solved = true;
        this.gameState.defeated++;
        const timeBonus = Math.max(0, this.gameState.timeLeft || 0) * 6;
        const baseScore = 80 + this.gameState.slotCount * 35 + timeBonus;
        const scoreGain = Math.floor(baseScore * this.getEndlessScoreMultiplier());
        const coinReward = Math.max(8, Math.floor(scoreGain / 35));
        
        // Boost reward based on Story progress
        const storyMultiplier = 1 + (this.data.highestLevel / 15);
        const boostedReward = Math.floor(coinReward * storyMultiplier);
        const manaRecovery = 10 + this.gameState.slotCount * 4 + Math.floor((this.gameState.timeLeft || 0) / 2);

        this.gameState.score += scoreGain;
        this.gameState.scoreCoins += boostedReward;
        this.gameState.mana = Math.min(this.gameState.maxMana, this.gameState.mana + manaRecovery);
        this.data.coins += boostedReward;
        this.data.stats.endlessBestScore = Math.max(this.data.stats.endlessBestScore, this.gameState.score);
        this.data.stats.endlessBestDefeated = Math.max(this.data.stats.endlessBestDefeated, this.gameState.defeated);
        this.saveData({ showToast: false });

        if (window.audio) window.audio.playSuccess();
        this.els.combatEnemy?.classList.add('defeated');
        this.particles.createCelebration(window.innerWidth * 0.72, window.innerHeight * 0.34);
        this.showMessage(`擊敗 ${this.gameState.currentEnemy?.name || '敵人'}，+${scoreGain} 分，回復 ${manaRecovery} MP`);
        this.updateGameUI();

        setTimeout(() => {
            if (!this.gameState.gameOver) this.nextEndlessOrder();
        }, 900);
    }

    handleSolve() {
        if (this.gameMode === 'endless') {
            this.handleEndlessVictory();
            return;
        }

        this.gameState.solved = true;
        if (window.audio) window.audio.playSuccess();
        this.particles.createCelebration(window.innerWidth / 2, window.innerHeight * 0.38);
        this.particles.createCelebration(window.innerWidth * 0.25, window.innerHeight * 0.3);
        this.particles.createCelebration(window.innerWidth * 0.75, window.innerHeight * 0.3);
        this.updateGameUI();

        let stars = 1;
        if (!this.gameState.hintPenalty) {
            if (this.gameState.turn <= 3) stars = 3;
            else if (this.gameState.turn <= 6) stars = 2;
        }

        let reward = 20 * stars;
        if (this.gameMode === 'story') {
            // Level 30: 1000 start, Level 100: ~8000
            if (this.currentLevel >= 30) {
                const baseGrowth = 1000 + (this.currentLevel - 30) * 100;
                reward = Math.floor(baseGrowth * (stars / 3));
                // Ensure at least 1000 for 1 star at Lv 30+
                if (reward < 1000) reward = 1000;
            } else {
                // Scaling from level 1 to 30
                reward = Math.floor((20 + this.currentLevel * 10) * stars);
            }
        } else if (this.gameMode === 'daily') {
            if (this.canClaimDailyReward()) {
                reward = 1000; // Increased from 500
            } else {
                reward = 100; // Increased from 10
            }
        }
        this.gameState.dailyRewardGranted = this.gameMode === 'daily' && reward > 0;
        this.gameState.weeklyRewardGranted = false;

        this.gameState.scoreCoins += reward;
        this.data.coins += reward;
        this.data.stats.wins++;
        this.data.stats.stars += stars;

        if (this.gameMode === 'story') {
            if (this.data.highestLevel === this.currentLevel) this.data.highestLevel++;
            const prev = this.data.levelStars[this.currentLevel] || 0;
            if (stars > prev) this.data.levelStars[this.currentLevel] = stars;
        } else if (this.gameMode === 'daily') {
            this.data.stats.dailyWins++;
            if (reward > 0) {
                this.data.daily.rewardDate = this.dailyChallenge.dateKey;
            }
            if (this.data.daily.bestDate !== this.dailyChallenge.dateKey || this.data.daily.bestTurns === 0 || this.gameState.turn < this.data.daily.bestTurns) {
                this.data.daily.bestDate = this.dailyChallenge.dateKey;
                this.data.daily.bestTurns = this.gameState.turn;
            }
            this.markWeeklyStamp(this.dailyChallenge.dateKey);
            if (this.maybeClaimWeeklyReward()) {
                this.gameState.weeklyRewardGranted = true;
                reward += 500;
                this.gameState.scoreCoins += 500;
            }
        }

        this.saveData();

        const levelData = this.gameMode === 'story'
            ? this.levels.find(l => l.id === this.currentLevel)
            : this.gameState.levelData;
        let postStory = [];
        if (this.gameMode === 'daily') {
            postStory = [
                {
                    speaker: this.getCharacterProfile('scout').name,
                    portrait: this.getCharacterProfile('scout').portraitClass,
                    text: '每日挑戰完成，10 金幣已入帳。你可以隨時再挑戰。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: `這題我花了 ${this.gameState.turn} 回合。繼續挑戰可以繼續積累經驗。`
                }
            ];
        } else if (this.gameState.hintPenalty) {
            postStory = [
                {
                    speaker: this.getCharacterProfile('mentor').name,
                    portrait: this.getCharacterProfile('mentor').portraitClass,
                    text: '你靠文獻把它硬拉過線了，這次只能拿到最低限度的及格分。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: '下次得靠真正的推理把它做漂亮。'
                }
            ];
        } else {
            postStory = levelData ? this.buildVictoryDialogue(levelData, stars) : [
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: '成品完成了。至少這次，我把局面收住了。'
                }
            ];
        }

        setTimeout(() => {
            this.dialogue.play(postStory, () => {
                this.showResultModal({
                    success: true,
                    title: this.getResultTitle(stars),
                    desc: this.gameMode === 'story'
                        ? `${levelData ? levelData.client : '委託人'} 的委託已完成，公會完成本次評級。`
                        : this.gameMode === 'daily'
                            ? this.gameState.weeklyRewardGranted
                                ? '每日挑戰完成，10 金幣與本週七日結算獎勵都已入帳。'
                                : '每日挑戰完成，10 金幣已入帳。'
                            : '無盡討伐本輪完成，得分與星幣已入帳。',
                    story: levelData
                        ? `${this.gameMode === 'daily' ? '每日題目回顧' : '委託回顧'}｜${levelData.request}${this.gameState.weeklyRewardGranted ? '｜本週七日蓋章完成 +500' : ''}`
                        : '本輪配方已記錄進防衛紀錄冊。',
                    stars,
                    reward,
                    actionText: this.gameMode === 'story' ? '回到首頁' : this.gameMode === 'daily' ? '回到首頁' : '撤退',
                    levelData
                });
            });
        }, 500);
    }

    handleGameOver(reason = 'mana') {
        this.clearCombatTimer();
        this.gameState.gameOver = true;
        this.gameState.solved = true;
        if (this.gameMode === 'endless') {
            this.data.stats.endlessBestScore = Math.max(this.data.stats.endlessBestScore, this.gameState.score || 0);
            this.data.stats.endlessBestDefeated = Math.max(this.data.stats.endlessBestDefeated, this.gameState.defeated || 0);
            this.saveData({ showToast: false });
        }
        if (window.audio) window.audio.playError();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        const failColors = this.gameMode === 'endless' ? ['#2d243a', '#7b4bff', '#000'] : ['#ffd6e0', '#d9d9d9', '#bde0fe'];
        this.particles.createExplosion(window.innerWidth / 2, window.innerHeight * 0.5, 20, { variant: 'mist', colors: failColors, distance: [20, 70], minSize: 10, maxSize: 18, duration: 1500 });
        this.updateGameUI();

        setTimeout(() => {
            const levelData = this.gameMode === 'story'
                ? this.levels.find(l => l.id === this.currentLevel)
                : this.gameState.levelData || null;
            const lines = this.gameMode === 'daily'
                ? [
                    {
                        speaker: this.getCharacterProfile('scout').name,
                        portrait: this.getCharacterProfile('scout').portraitClass,
                        text: '今天的演算題還沒穩住，但每日挑戰不限次數，你可以立刻再試。'
                    },
                    {
                        speaker: this.getCharacterProfile('iris').name,
                        portrait: this.getCharacterProfile('iris').portraitClass,
                        text: '這回合消耗太快了。我先把剛才的錯位記下來，再重新整理節奏。'
                    }
                ]
                : this.gameMode === 'endless'
                    ? [
                        {
                            speaker: this.getCharacterProfile('scout').name,
                            portrait: this.getCharacterProfile('scout').portraitClass,
                            text: reason === 'hp' ? 'HP 已經見底，討伐紀錄到此封存。' : '精神力耗盡，咒語盤無法再維持。'
                        },
                        {
                            speaker: this.getCharacterProfile('iris').name,
                            portrait: this.getCharacterProfile('iris').portraitClass,
                            text: `本場擊敗 ${this.gameState.defeated || 0} 名敵人，累積 ${this.gameState.score || 0} 分。下次可以靠稱號把節奏撐得更久。`
                        }
                    ]
                    : levelData ? this.buildFailureDialogue(levelData) : [
                        {
                            speaker: this.getCharacterProfile('iris').name,
                            portrait: this.getCharacterProfile('iris').portraitClass,
                            text: '不行了...精神力已經見底了。'
                        },
                        {
                            speaker: this.getCharacterProfile('mentor').name,
                            portrait: this.getCharacterProfile('mentor').portraitClass,
                            text: '今天的實習先到這裡，先回據點把節奏整理乾淨。'
                        }
                    ];
            this.dialogue.play(lines, () => {
                this.showResultModal({
                    success: false,
                    title: this.gameMode === 'endless' && reason === 'hp' ? 'HP 歸零' : '精神力透支',
                    desc: this.gameMode === 'story'
                        ? '本次委託未能完成，公會已記錄失敗報告。'
                        : this.gameMode === 'daily'
                            ? '今日挑戰未能完成，但可以立刻再次嘗試。'
                            : `無盡討伐結算：擊敗 ${this.gameState.defeated || 0} 名敵人，累積 ${this.gameState.score || 0} 分。`,
                    story: levelData
                        ? `${this.gameMode === 'daily' ? '每日題目回顧' : '失敗回顧'}｜${levelData.request}`
                        : this.gameMode === 'endless'
                            ? `最佳紀錄：${this.data.stats.endlessBestScore} 分｜${this.data.stats.endlessBestDefeated} 名敵人`
                            : '本輪演算紀錄已封存，建議回據點整理節奏。',
                    stars: 0,
                    reward: 0,
                    actionText: this.gameMode === 'daily' ? '回到據點' : this.gameMode === 'endless' ? '撤退' : '回據點休息',
                    levelData,
                    leaderboardText: ''
                });
            });
        }, 1000);
    }

    updateGameUI() {
        const maxMana = this.gameState.maxMana || this.getModeMaxMana(this.gameMode);
        const pct = (this.gameState.mana / maxMana) * 100;
        this.els.manaVal.textContent = `${this.gameState.mana} / ${maxMana}`;
        this.els.manaFill.style.width = `${pct}%`;
        if (pct <= 20) this.els.manaFill.classList.add('danger-fill');
        else this.els.manaFill.classList.remove('danger-fill');

        let filledCount = 0;
        if ((typeof this.gameState.selectedSlot !== 'number' || this.gameState.selectedSlot < 0 || this.gameState.hints.includes(this.gameState.selectedSlot))
            && !this.gameState.solved && !this.gameState.gameOver) {
            this.gameState.selectedSlot = this.getNextSelectableSlot(0);
        }

        this.els.slots.forEach((slot, i) => {
            const symId = this.gameState.input[i];
            slot.innerHTML = '';
            if (symId) {
                filledCount++;
                slot.className = 'slot filled';
                if (this.gameState.hints.includes(i)) slot.classList.add('hinted');
                const sym = this.symbols.find(s => s.id === symId);
                const tk = document.createElement('div');
                tk.className = 'token';
                tk.style.backgroundImage = `url('${sym.img}')`;
                slot.appendChild(tk);
            } else {
                slot.className = 'slot';
            }

            if (this.gameState.selectedSlot === i && !this.gameState.hints.includes(i) && !this.gameState.solved && !this.gameState.gameOver) {
                slot.classList.add('selected');
            }
        });

        const ok = filledCount === this.gameState.slotCount && !this.gameState.solved && !this.gameState.gameOver;
        this.els.btnSubmit.disabled = !ok;

        const isLocked = this.currentLevel >= 26 && this.gameMode === 'story';
        let hintCost = this.getHintCost();
        this.els.btnHint.textContent = isLocked ? '封鎖權限' : `查閱文獻 (-${hintCost})`;
        this.els.btnHint.className = isLocked ? 'btn btn-secondary locked-hint' : 'btn btn-secondary';
        this.els.btnHint.disabled = this.gameState.solved || this.gameState.gameOver || this.gameState.mana < hintCost || this.gameState.hints.length === this.gameState.slotCount || isLocked;
        const submitCost = this.getSubmitCost();
        this.els.btnSubmit.textContent = this.gameMode === 'endless' ? `施放咒語 (-${submitCost})` : `啟動提煉 (-${submitCost})`;
        this.updateCombatStage();
        requestAnimationFrame(() => this.updateLayoutMetrics());
    }

    addHistoryRow(guess, res) {
        if (this.gameState.turn === 1) this.els.history.innerHTML = '';

        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
            <div class="turn-number">#${this.gameState.turn}</div>
            <div class="history-symbols">
                ${guess.map(id => {
            const s = this.symbols.find(x => x.id === id);
            return `<div class="mini-symbol" style="background-image:url('${s.img}')"></div>`;
        }).join('')}
            </div>
            <div class="history-feedback">
                <div class="feedback-item">
                    <img src="assets/icons/star.png" class="feedback-icon" alt="star"> <span>${res.exact}</span>
                </div>
                <div class="feedback-item">
                    <img src="assets/icons/swirl.png" class="feedback-icon" alt="swirl"> <span>${res.partial}</span>
                </div>
            </div>
        `;
        this.els.history.prepend(row);
    }

    renderPalette() {
        this.els.palette.innerHTML = '';
        this.symbols.forEach(sym => {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.dataset.id = sym.id;
            const token = document.createElement('div');
            token.className = 'token';
            token.style.backgroundImage = `url('${sym.img}')`;
            btn.appendChild(token);
            this.els.palette.appendChild(btn);
        });
    }

    showMessage(text, type = 'info') {
        this.els.msg.textContent = text;
        this.els.msg.className = `show ${type}`;
        if (this.msgTimer) clearTimeout(this.msgTimer);
        this.msgTimer = setTimeout(() => this.els.msg.classList.remove('show'), 2000);
    }

    renderFamiliarPanel() {
        if (!this.els.petInventoryGrid) return;
        const catalog = this.getPetCatalog();
        const owned = this.data.player.ownedPets || [];
        const active = this.data.player.activePet;
        const isAllOwned = owned.length >= catalog.length;

        this.els.petInventoryGrid.innerHTML = catalog.map(pet => {
            const isOwned = owned.includes(pet.id);
            const isActive = active === pet.id;
            
            let imgStyle = pet.filter ? `filter: ${pet.filter}` : '';
            if (pet.atlas) {
                imgStyle += `; object-fit: cover; object-position: ${pet.atlas.x}% ${pet.atlas.y}%; width: 200%; height: 200%; max-width: none;`;
            }

            return `
                <div class="pet-card ${isOwned ? 'owned' : ''} ${isActive ? 'active' : ''}" data-id="${pet.id}">
                    <div class="pet-icon-wrap" style="overflow: hidden;">
                        <img src="${pet.image}" class="pet-icon" style="${imgStyle}">
                    </div>
                    <span class="pet-name">${pet.name}</span>
                </div>
            `;
        }).join('');

        if (this.els.btnGachaDraw) {
            if (isAllOwned) {
                this.els.btnGachaDraw.disabled = true;
                this.els.btnGachaDraw.textContent = '無法再取得使魔';
            } else {
                this.els.btnGachaDraw.disabled = this.data.coins < 4000;
                this.els.btnGachaDraw.textContent = '召喚使魔';
            }
        }
    }

    drawFamiliar() {
        const catalog = this.getPetCatalog();
        const owned = this.data.player.ownedPets || [];
        const unowned = catalog.filter(p => !owned.includes(p.id));

        if (unowned.length === 0) {
            this.showMessage('你已擁有目前所有的使魔夥伴！', 'info');
            return;
        }

        if (this.data.coins < 4000) {
            this.showMessage('星幣不足 4,000，無法進行召喚。', 'error');
            return;
        }
        
        this.data.coins -= 4000;
        this.data.stats.coinsSpent += 4000;
        this.updateGlobalUI();
        if (window.audio) window.audio.playClick();

        // Pick one randomly from unowned
        const result = unowned[Math.floor(Math.random() * unowned.length)];

        // Update data
        if (!this.data.player.ownedPets) this.data.player.ownedPets = [];
        this.data.player.ownedPets.push(result.id);
        this.saveData({ showToast: false });

        // Animation Start
        this.els.gachaOverlay.classList.add('active');
        this.els.gachaOverlay.classList.remove('reveal');
        
        // Reset Result View
        this.els.gachaResultImg.src = result.image;
        let imgStyle = result.filter ? `filter: ${result.filter}` : '';
        if (result.atlas) {
            imgStyle += `; object-fit: cover; object-position: ${result.atlas.x}% ${result.atlas.y}%; width: 200%; height: 200%; max-width: none;`;
        } else {
            imgStyle += `; object-fit: contain; width: 100%; height: 100%;`;
        }
        this.els.gachaResultImg.style = imgStyle;
        this.els.gachaResultName.textContent = result.name;

        // Magical buildup
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        
        let buildupTimer = setInterval(() => {
            this.particles.createExplosion(cx, cy, 5, {
                variant: 'spark',
                colors: ['#fff', '#7b4bff', '#ffd700'],
                distance: [20, 100],
                duration: 600
            });
        }, 100);

        setTimeout(() => {
            clearInterval(buildupTimer);
            this.els.gachaOverlay.classList.add('reveal');
            if (window.audio) window.audio.playSkill();
            
            // Grand Finale Celebration
            this.particles.createCelebration(cx, cy);
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.particles.createExplosion(cx + (Math.random()-0.5)*200, cy + (Math.random()-0.5)*200, 20, {
                        variant: 'spark',
                        colors: ['#7b4bff', '#ffd700', '#fff'],
                        distance: [50, 200],
                        duration: 1500
                    });
                }, i * 200);
            }

            this.renderFamiliarPanel();
        }, 1800);
    }

    setActivePet(petId) {
        if (this.data.player.activePet === petId) {
            this.data.player.activePet = null;
        } else {
            this.data.player.activePet = petId;
        }
        this.saveData({ showToast: false });
        this.renderFamiliarPanel();
        this.updatePetDisplay();
    }

    updatePetDisplay() {
        const petId = this.data.player.activePet;
        const catalog = this.getPetCatalog();
        const pet = catalog.find(p => p.id === petId);

        [this.els.hubPetCompanion, this.els.gamePetCompanion].forEach(el => {
            if (!el) return;
            if (pet) {
                el.classList.add('active');
                let style = `background-image: url(${pet.image}); background-size: contain; background-repeat: no-repeat; background-position: center;`;
                if (pet.filter) style += ` filter: ${pet.filter};`;
                el.style = style;
            } else {
                el.classList.remove('active');
            }
        });
    }

    initCheats() {
        const sequence = 'ASDFGHJKLMN';
        let input = '';
        window.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            if (sequence.includes(key)) {
                input += key;
                if (input === sequence) {
                    this.activateCheats();
                    input = '';
                } else if (!sequence.startsWith(input)) {
                    input = key;
                }
            } else {
                input = '';
            }
        });
    }

    activateCheats() {
        this.data.coins = 9999999;
        this.data.stamina = 999;
        this.data.highestLevel = 100;
        this.saveData();
        this.renderHubDashboard();
        this.renderShop();
        this.renderFamiliarPanel();
        this.updateGlobalUI();
        this.showMessage('✦ 開發者權限已解鎖！星幣與體力無限 ✦', 'success');
        if (window.audio) window.audio.playSuccess();
    }
}

// Boot up robustly
window.app = new MagicAlchemyLab();
