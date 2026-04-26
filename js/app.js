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
        for(let i = 0; i < count; i++) {
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
            if(window.audio) window.audio.playClick();
            this.next();
        });
    }

    play(lines, onComplete) {
        if(!lines || lines.length===0) {
            if(onComplete) onComplete();
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
        if(this.typingInterval) clearInterval(this.typingInterval);
        this.textArea.innerHTML = '';
        let i = 0;
        this.typingInterval = setInterval(() => {
            this.textArea.innerHTML += text.charAt(i);
            i++;
            if (i >= text.length) clearInterval(this.typingInterval);
        }, 30);
    }

    finish() {
        if(this.typingInterval) clearInterval(this.typingInterval);
        this.overlay.classList.remove('show');
        this.isPlaying = false;
        if (this.onComplete) this.onComplete();
    }

    abort() {
        if(this.typingInterval) clearInterval(this.typingInterval);
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
            { id: 'q6', text: '獲得鷹眼鑑定加成', rule: (data) => data.upgrades.eagleEye, reward: 250 },
            { id: 'q7', text: '通過第 30 關', rule: (data) => data.highestLevel >= 31, reward: 1000 },
            { id: 'q_max', text: '所有考核皆已通過', rule: ()=>false, reward: 0 }
        ];

        this.claimBtn.addEventListener('click', (e) => {
            if(!this.claimBtn.classList.contains('disabled')) {
                const rect = e.target.getBoundingClientRect();
                this.app.particles.createExplosion(rect.left + rect.width/2, rect.top + rect.height/2, 30);
                this.claimCurrent();
            }
        });
    }

    getCurrentQuest() {
        const id = this.app.data.activeQuestId;
        return this.quests.find(q => q.id === id) || this.quests[this.quests.length-1];
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
            if(window.audio) window.audio.playLoot ? window.audio.playLoot() : window.audio.playSuccess();
            this.app.data.coins += q.reward;
            this.app.showMessage(`任務達成！獲得 ${q.reward} 星幣`);
            
            const idx = this.quests.findIndex(x => x.id === q.id);
            if(idx < this.quests.length - 1) {
                this.app.data.activeQuestId = this.quests[idx+1].id;
            }
            this.app.saveData();
            this.check();
        }
    }
}


class MagicAlchemyLab {
    constructor() {
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
            globalHeader: document.getElementById('global-header'),
            headerTitle: document.getElementById('header-title'),
            globalCoins: document.getElementById('global-coins'),
            btnGlobalBack: document.getElementById('btn-global-back'),
            saveToast: document.getElementById('save-toast'),
            hubTip: document.getElementById('hub-stamina-tip'),
            hubTipText: document.getElementById('hub-tip-text'),
            btnHubTipShop: document.getElementById('btn-hub-tip-shop'),
            btnGuestStart: document.getElementById('btn-guest-start'),
            btnStoryStart: document.getElementById('btn-story-start'),
            btnDailyStart: document.getElementById('btn-daily-start'),
            btnEndlessStart: document.getElementById('btn-endless-start'),
            hubPanels: Array.from(document.querySelectorAll('.hub-panel')),
            hubBottomNav: document.getElementById('hub-bottom-nav'),
            storyProgressBadge: document.getElementById('story-progress-badge'),
            storyNextTitle: document.getElementById('story-next-title'),
            storyNextDesc: document.getElementById('story-next-desc'),
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
            settingsCloudTitle: document.getElementById('settings-cloud-title'),
            settingsCloudCopy: document.getElementById('settings-cloud-copy'),
            btnCloudSync: document.getElementById('btn-cloud-sync'),
            slotsContainer: document.getElementById('slots-container'),
            questWidget: document.getElementById('quest-widget')
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
        this.storageKey = 'star_alchemy_save_v5';
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
        this.activeHubPanel = 'story';
        this.bootFinished = false;
        this.bootTimers = [];
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

        return chapters.flatMap((chapter, chapterIndex) =>
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
            case 'daily':
                return todayRewardReady
                    ? `先打每日挑戰可拿今日 500 星幣；下方的無限挑戰不限次數，每次成功固定 +10。`
                    : `今日 500 星幣已領取，仍可刷每日與無限挑戰；本週再完成 ${remainingWeekly} 天可多拿 500。`;
            case 'inventory':
                return this.data.stamina >= 10
                    ? `背包與夥伴狀態都在這裡，準備好後可直接從底部「故事」進選關。`
                    : `目前體力 ${this.data.stamina}/100，先補給或改玩每日與無限挑戰都可以。`;
            case 'settings':
                return this.currentUser
                    ? `已登入 ${this.currentUser.displayName || '玩家'}，進度會先保存在裝置，再自動同步雲端；需要時可手動上傳。`
                    : '目前是本機存檔模式；登入 Google 後，金幣、體力與關卡進度都會自動同步到雲端。';
            case 'story':
            default:
                return nextLevel
                    ? `先從底部「故事」直接進選關，下一張是第 ${nextLevel.id} 關「${nextLevel.title}」。`
                    : '主線已全數結案，現在可以重刷故事、每日與無限挑戰。';
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
                text: `做得好。我一直都知道妳可以順利處理這種級別的難題。`
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
            text: `別氣餒，先去大廳休息一下，把剛才的失誤記錄下來，公會的卷宗隨時向妳開放。`
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
            highestLevel: 1,
            levelStars: {},
            stamina: 100,
            lastEnergyTime: Date.now(),
            updatedAt: Date.now(),
            activeQuestId: 'q1',
            upgrades: { eagleEye: false, sponsor: false },
            stats: { wins: 0, manaSpent: 0, stars: 0, endlessPlayed: 0, coinsSpent: 0, dailyWins: 0 },
            daily: { rewardDate: '', bestDate: '', bestTurns: 0, lastPlayedDate: '' },
            weekly: { cycleStart: '', stamps: [], rewardClaimed: false },
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
            settings: { ...defaultData.settings, ...(source.settings || {}) }
        };

        merged.coins = clampInt(merged.coins, defaultData.coins);
        merged.maxMana = clampInt(merged.maxMana, defaultData.maxMana, 20);
        merged.highestLevel = clampInt(merged.highestLevel, defaultData.highestLevel, 1);
        merged.stamina = clampInt(merged.stamina, defaultData.stamina, 0, 100);
        merged.lastEnergyTime = clampInt(merged.lastEnergyTime, now, 0, now);
        merged.updatedAt = clampInt(merged.updatedAt, now, 0, now);
        merged.activeQuestId = typeof merged.activeQuestId === 'string' ? merged.activeQuestId : defaultData.activeQuestId;

        merged.upgrades = {
            eagleEye: Boolean(merged.upgrades.eagleEye),
            sponsor: Boolean(merged.upgrades.sponsor)
        };

        merged.stats = {
            wins: clampInt(merged.stats.wins, 0),
            manaSpent: clampInt(merged.stats.manaSpent, 0),
            stars: clampInt(merged.stats.stars, 0),
            endlessPlayed: clampInt(merged.stats.endlessPlayed, 0),
            coinsSpent: clampInt(merged.stats.coinsSpent, 0),
            dailyWins: clampInt(merged.stats.dailyWins, 0)
        };

        merged.daily = {
            rewardDate: typeof merged.daily.rewardDate === 'string' ? merged.daily.rewardDate : '',
            bestDate: typeof merged.daily.bestDate === 'string' ? merged.daily.bestDate : '',
            bestTurns: clampInt(merged.daily.bestTurns, 0),
            lastPlayedDate: typeof merged.daily.lastPlayedDate === 'string' ? merged.daily.lastPlayedDate : ''
        };

        merged.weekly = {
            cycleStart: typeof merged.weekly.cycleStart === 'string' ? merged.weekly.cycleStart : '',
            stamps: Array.isArray(merged.weekly.stamps)
                ? merged.weekly.stamps.filter((stamp) => typeof stamp === 'string')
                : [],
            rewardClaimed: Boolean(merged.weekly.rewardClaimed)
        };

        merged.settings = {
            bootSeen: Boolean(merged.settings.bootSeen),
            guestStarted: Boolean(merged.settings.guestStarted)
        };

        merged.levelStars = Object.fromEntries(
            Object.entries(merged.levelStars).map(([levelId, stars]) => [levelId, clampInt(stars, 0, 0, 3)])
        );

        if (merged.stamina < 100) {
            const elapsedMin = Math.floor((now - merged.lastEnergyTime) / 60000);
            if (elapsedMin > 0) {
                merged.stamina = Math.min(100, merged.stamina + elapsedMin);
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

    mergeSaveData(firstData = null, secondData = null) {
        const createEmptyState = () => {
            const empty = this.getDefaultData();
            empty.updatedAt = 0;
            return empty;
        };

        const left = firstData ? this.normalizeData(firstData) : createEmptyState();
        const right = secondData ? this.normalizeData(secondData) : createEmptyState();
        const newer = left.updatedAt >= right.updatedAt ? left : right;
        const older = newer === left ? right : left;

        const merged = this.normalizeData(newer);
        merged.maxMana = Math.max(newer.maxMana, older.maxMana);
        merged.highestLevel = Math.max(newer.highestLevel, older.highestLevel);
        merged.levelStars = {};

        const allStarLevels = new Set([
            ...Object.keys(newer.levelStars || {}),
            ...Object.keys(older.levelStars || {})
        ]);
        allStarLevels.forEach((levelId) => {
            merged.levelStars[levelId] = Math.max(newer.levelStars[levelId] || 0, older.levelStars[levelId] || 0);
        });

        merged.upgrades = {
            eagleEye: newer.upgrades.eagleEye || older.upgrades.eagleEye,
            sponsor: newer.upgrades.sponsor || older.upgrades.sponsor
        };

        merged.stats = {
            wins: Math.max(newer.stats.wins, older.stats.wins),
            manaSpent: Math.max(newer.stats.manaSpent, older.stats.manaSpent),
            stars: Math.max(newer.stats.stars, older.stats.stars),
            endlessPlayed: Math.max(newer.stats.endlessPlayed, older.stats.endlessPlayed),
            coinsSpent: Math.max(newer.stats.coinsSpent, older.stats.coinsSpent),
            dailyWins: Math.max(newer.stats.dailyWins, older.stats.dailyWins)
        };

        merged.daily = {
            rewardDate: newer.daily.rewardDate || older.daily.rewardDate || '',
            bestDate: newer.daily.bestDate || older.daily.bestDate || '',
            bestTurns: newer.daily.bestTurns && older.daily.bestTurns
                ? Math.min(newer.daily.bestTurns, older.daily.bestTurns)
                : Math.max(newer.daily.bestTurns || 0, older.daily.bestTurns || 0),
            lastPlayedDate: newer.daily.lastPlayedDate || older.daily.lastPlayedDate || ''
        };

        const weeklyCycle = newer.weekly.cycleStart || older.weekly.cycleStart || '';
        const weeklyStamps = new Set([
            ...(newer.weekly.cycleStart === weeklyCycle ? newer.weekly.stamps : []),
            ...(older.weekly.cycleStart === weeklyCycle ? older.weekly.stamps : [])
        ]);
        merged.weekly = {
            cycleStart: weeklyCycle,
            stamps: [...weeklyStamps].sort(),
            rewardClaimed:
                (newer.weekly.cycleStart === weeklyCycle && newer.weekly.rewardClaimed) ||
                (older.weekly.cycleStart === weeklyCycle && older.weekly.rewardClaimed)
        };

        merged.settings = {
            bootSeen: newer.settings.bootSeen || older.settings.bootSeen,
            guestStarted: newer.settings.guestStarted || older.settings.guestStarted
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
            case 'three-types':
                return `${slotCount} 格只會使用 3 種素材，而且這 3 種都一定會出現。`;
            case 'bookend':
                return `第 1 格與第 ${slotCount} 格必定相同，而且首尾素材只會出現這 2 次；中間每格都要和首尾不同。`;
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
        return {
            ...puzzle,
            storyClue: puzzle.storyClue || puzzle.clue || '',
            clue: this.getRuleClue(puzzle.rule, puzzle.slotCount)
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
            4: ['unique', 'repeat-one', 'bookend', 'three-types', 'twin-pairs', 'weighted', 'alternating', 'no-adjacent', 'palindrome'],
            5: ['repeat-one', 'three-types', 'bookend', 'weighted', 'split-pairs', 'no-adjacent', 'spectrum', 'palindrome', 'alternating'],
            6: ['twin-pairs', 'three-types', 'weighted', 'no-adjacent', 'bookend', 'alternating', 'spectrum', 'palindrome', 'split-pairs', 'crown']
        };
        return (rulesBySlot[slotCount] || rulesBySlot[5]).map((rule) => ({
            rule,
            ruleLabel: this.normalizePuzzleDefinition({ rule, slotCount }).clue ? this.levels.find((level) => level.rule === rule && level.slotCount === slotCount)?.ruleLabel || rule : rule
        }));
    }

    generateEndlessOrder(orderCount = 1) {
        const slotCount = orderCount >= 9 ? 6 : orderCount >= 4 ? 5 : 4;
        const rng = this.createSeededRandom(`endless-${this.getDateKey()}-${orderCount}-${this.data.stats.endlessPlayed}`);
        const pool = this.getEndlessChallengePool(slotCount);
        const chosen = pool[Math.floor(rng() * pool.length)] || { rule: 'repeat-one', ruleLabel: '回火疊加' };
        const title = slotCount >= 6 ? '邊境長夜演算' : slotCount >= 5 ? '連續壓力測試' : '工坊耐久試作';
        return this.normalizePuzzleDefinition({
            id: `endless-${orderCount}`,
            title: `${title} #${orderCount}`,
            name: `無限挑戰 #${orderCount}`,
            chapter: '無限挑戰',
            client: '公會模擬演算',
            request: '這是用來打發時間與磨練手感的自由演算，每次完成只會發放 10 星幣。',
            rule: chosen.rule,
            ruleLabel: chosen.ruleLabel,
            slotCount,
            intro: '模擬盤已展開，這裡不消耗體力，只看你能把節奏維持多久。',
            perfect: '這輪演算很乾淨，像是整張盤面都被你提前看穿了。',
            good: '這輪處理得不錯，節奏一直都在你的手上。',
            rough: '雖然過了，但還有不少地方能壓得更漂亮。',
            fail: '模擬盤散掉了，不過這本來就是拿來反覆練手感的。',
            clue: this.getRuleClue(chosen.rule, slotCount)
        });
    }

    canClaimDailyReward() {
        return this.data.daily.rewardDate !== this.dailyChallenge.dateKey;
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
            const raw = localStorage.getItem(this.storageKey) || localStorage.getItem('star_alchemy_save_v4');
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
        this.els.confirmModal.classList.add('active');
    }

    closeConfirmModal({ runCancel = false } = {}) {
        this.els.confirmModal.classList.remove('active');
        if (runCancel && this.pendingConfirmCancelAction) this.pendingConfirmCancelAction();
        this.pendingConfirmAction = null;
        this.pendingConfirmCancelAction = null;
    }

    showStaminaHelp() {
        const missing = Math.max(0, 10 - this.data.stamina);
        const description = `開始故事委託需要 10 點體力，你目前只有 ${this.data.stamina}/100。\n每分鐘會自然恢復 1 點體力，或到商店花 60 金幣購買公會補給糖，立即恢復 30 點。\n如果想先練習，不耗體力的「每日挑戰」與「無限挑戰」都可立即遊玩。\n再補 ${missing} 點就能再次出發。`;
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
        this.updateGlobalUI();
        this.renderMap();
        this.renderShop();
        this.renderPalette();
        this.renderHubDashboard();
        this.bindEvents();
        this.quests.check();
        window.audio?.updateMuteButton?.();
        this.updateScene('hub');
        this.updateLayoutMetrics();
        this.startBootSequence();

        const syncLayout = () => this.updateLayoutMetrics();
        window.addEventListener('resize', syncLayout);
        window.addEventListener('load', syncLayout);
        window.visualViewport?.addEventListener('resize', syncLayout);
        document.fonts?.ready.then(syncLayout);
        
        // Stamina auto-regen logic
        setInterval(() => {
            if (this.data.stamina < 100) {
                const elapsedMin = Math.floor((Date.now() - this.data.lastEnergyTime) / 60000);
                if (elapsedMin > 0) {
                    this.data.stamina = Math.min(100, this.data.stamina + elapsedMin);
                    this.data.lastEnergyTime += elapsedMin * 60000;
                    this.saveData({ showToast: false });
                }
            } else {
                this.data.lastEnergyTime = Date.now();
            }
        }, 20000);
    }

    forceReturnHub() {
        this.dialogue.abort();
        this._hubEnteredThisSession = true;
        this.showLocation('hub');
        this.renderMap();
    }

    enterStoryMap() {
        if (!this.currentUser) {
            this.data.settings.guestStarted = true;
        }
        this._hubEnteredThisSession = true;
        this.requestFS();
        if (this.els.bootOverlay?.classList.contains('active')) {
            this.completeBootSequence();
        }
        this.showLocation('map');
        this.renderMap();
    }

    updateLayoutMetrics() {
        const readMetric = (name, fallback) => {
            const current = parseFloat(getComputedStyle(this.els.appContainer).getPropertyValue(name));
            return Number.isFinite(current) && current > 0 ? current : fallback;
        };
        const globalHeaderHeight = this.els.globalHeader && !this.els.globalHeader.classList.contains('hidden')
            ? this.els.globalHeader.offsetHeight
            : readMetric('--global-header-height', 112);
        const gameHeaderHeight = this.els.gameHeader?.offsetHeight || readMetric('--game-header-height', 152);
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

    showLocation(viewId) {
        this.previousView = this.viewState;
        const outgoing = document.querySelector('.view-section.active-view');
        const incoming = document.getElementById(`view-${viewId}`);

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
            this.els.globalHeader.classList.add('hidden');
            this.renderHubDashboard();
        } else if (viewId === 'game') {
            this.els.globalHeader.classList.add('hidden');
        } else {
            this.els.globalHeader.classList.remove('hidden');
            this.els.headerTitle.textContent = viewId === 'map' ? '故事選關' : '黑市交涉';
            if (viewId === 'shop') {
                const hubNavButtons = this.els.hubBottomNav ? this.els.hubBottomNav.querySelectorAll('.hub-nav-btn') : [];
                hubNavButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.hubTarget === 'shop');
                });
                this.renderShop();
            }
        }
        
        if (viewId === 'hub') {
            this.quests.check();
        } else {
            this.els.questWidget.classList.remove('show');
        }

        requestAnimationFrame(() => this.updateLayoutMetrics());
    }

    updateGlobalUI() {
        this.els.globalCoins.textContent = this.data.coins;
        this.els.globalStamina.textContent = this.data.stamina;

        if (!this.els.hubTip || !this.els.hubTipText) return;

        if (this.data.stamina < 10) {
            const missing = 10 - this.data.stamina;
            this.els.hubTipText.textContent = `故事委託需要 10 體力。你目前 ${this.data.stamina}/100，還差 ${missing} 點；約 ${this.getMinutesUntilStaminaReady()} 分鐘後可自然回到可出發狀態，也可去商店買補給糖立即回復 30 點。想先遊玩時，可改打不耗體力的每日或無限挑戰。`;
            this.els.hubTip.classList.remove('hidden');
        } else {
            this.els.hubTip.classList.add('hidden');
        }
    }

    getRewardRangeText() {
        const rewards = [1, 2, 3].map(stars => {
            let reward = 20 * stars;
            if (this.data.upgrades.eagleEye) reward = Math.floor(reward * 1.1);
            return reward;
        });
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
                ${[1,2,3].map(i => `<img src="assets/icons/star.png" class="${i <= stars ? 'earned' : ''}" alt="評級星星">`).join('')}
            </div>
        `;
    }

    getShopInventory() {
        return [
            {
                id: 'staminaPack',
                icon: '🧃',
                name: '公會補給糖',
                desc: `立即恢復 30 點體力（目前 ${this.data.stamina}/100）`,
                cost: 60,
                repeat: true,
                category: '補給品',
                tier: '即時回復',
                accent: 'supply',
                disabled: () => this.data.stamina >= 100,
                effectText: () => `體力 ${this.data.stamina} → ${Math.min(100, this.data.stamina + 30)}`,
                statusText: () => this.data.stamina >= 100 ? '目前已滿體' : `還可補 ${100 - this.data.stamina} 點`,
                action: () => this.data.stamina = Math.min(100, this.data.stamina + 30)
            },
            {
                id: 'manaUp',
                icon: '🛠️',
                name: '大釜擴容',
                desc: '最大精神力上限 +20',
                cost: 150,
                repeat: true,
                category: '設備',
                tier: '常規升級',
                accent: 'upgrade',
                effectText: () => `精神力上限 ${this.data.maxMana} → ${this.data.maxMana + 20}`,
                statusText: () => '可重複交涉',
                action: () => this.data.maxMana += 20
            },
            {
                id: 'manaUpH',
                icon: '🏺',
                name: '頂級大釜組',
                desc: '最大精神力上限 +50',
                cost: 350,
                repeat: true,
                category: '設備',
                tier: '高階套組',
                accent: 'premium',
                effectText: () => `精神力上限 ${this.data.maxMana} → ${this.data.maxMana + 50}`,
                statusText: () => '適合中後段高壓委託',
                action: () => this.data.maxMana += 50
            },
            {
                id: 'eagleEye',
                icon: '🦅',
                name: '鷹眼鑑定',
                desc: '結算金幣收益增加 10%',
                cost: 500,
                repeat: false,
                category: '被動',
                tier: '收益增幅',
                accent: 'perk',
                cond: ()=>!this.data.upgrades.eagleEye,
                effectText: () => '委託結算收益 +10%',
                statusText: () => '完成後將永久生效',
                action: () => this.data.upgrades.eagleEye = true
            },
            {
                id: 'sponsor',
                icon: '📚',
                name: '學苑贊助',
                desc: '查閱文獻魔力基礎下降',
                cost: 1000,
                repeat: false,
                category: '被動',
                tier: '支援授權',
                accent: 'perk',
                cond: ()=>!this.data.upgrades.sponsor,
                effectText: () => '查閱文獻基礎消耗 15 → 10',
                statusText: () => '高壓關卡更容易保住精神力',
                action: () => this.data.upgrades.sponsor = true
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
        if (!success) return this.gameMode === 'endless' ? '無限挑戰結算' : '委託失敗報告';
        if (this.gameMode === 'daily') return '每日挑戰結算';
        if (this.gameMode === 'endless') return '無限挑戰結算';
        if (levelData) return `${levelData.chapter}｜委託評級`;
        return '委託評級';
    }

    getResultStats({ success, stars = 0, levelData = null }) {
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
            return success ? '下一輪模擬盤已展開，還想繼續就直接接著打。' : '這輪手感先到這裡，回據點休息後隨時能再開新的無限挑戰。';
        }

        if (!success) {
            return levelData ? `建議重新對照規格：「${levelData.clue}」` : '先穩住節奏，再重新接單。';
        }

        const nextLevel = levelData ? this.levels.find(lv => lv.id === levelData.id + 1) : null;
        if (nextLevel) return `下一張委託：${nextLevel.title}｜${nextLevel.slotCount} 格｜${nextLevel.ruleLabel}`;
        if (this.data.highestLevel > 30) return '所有正式委託皆已結案，無盡挑戰權限已開啟。';
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
            ? [1,2,3].map(i => `<img src="assets/icons/star.png" class="${i <= stars ? 'earned' : ''}">`).join('')
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

        this.els.modal.classList.add('active');
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
        if (this._hubEnteredThisSession) {
            this.refreshHubGuide({ panelId: this.activeHubPanel });
        }
    }

    enterHub() {
        // Transition from start screen to game hub with animation
        const hubEl = document.querySelector('#view-hub .hub-content');
        if (hubEl) {
            hubEl.classList.add('home-screen-exit');
            setTimeout(() => {
                hubEl.classList.remove('home-screen', 'home-screen-exit');
                hubEl.classList.add('hub-hero-layout', 'hub-enter');
                this.renderHubDashboard();
                this.refreshHubGuide({ rerollCharacter: true, panelId: this.activeHubPanel });
                setTimeout(() => hubEl.classList.remove('hub-enter'), 600);
            }, 400);
        }
    }

    showHubPanel(panelId = 'story') {
        const target = ['story', 'daily', 'inventory', 'settings'].includes(panelId) ? panelId : 'story';
        this.activeHubPanel = target;
        const hubNavButtons = this.els.hubBottomNav ? this.els.hubBottomNav.querySelectorAll('.hub-nav-btn') : [];

        this.els.hubPanels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === target);
        });

        hubNavButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hubTarget === target);
        });

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

        const rewardReady = this.canClaimDailyReward();
        this.els.dailyTitle.textContent = `${this.dailyChallenge.title}｜${this.dailyChallenge.slotCount} 格`;
        this.els.dailyDesc.textContent = `${this.dailyChallenge.clue} 不消耗體力，可不限次數挑戰；下方還有每次完成固定 +10 的無限挑戰。`;
        this.els.dailyRuleLabel.textContent = `${this.dailyChallenge.ruleLabel}｜${this.dailyChallenge.dateKey}`;
        this.els.dailyRewardStatus.textContent = rewardReady
            ? '今日首通可得 500 星幣'
            : '今日獎勵已領取，仍可繼續練習';
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
        const items = [
            {
                type: 'stat',
                label: '體力儲量',
                title: `${this.data.stamina}/100`,
                text: this.data.stamina >= 10 ? '故事委託可直接出發。' : `還差 ${10 - this.data.stamina} 點才能再接主線。`
            },
            {
                type: 'stat',
                label: '大釜容量',
                title: `${this.data.maxMana}`,
                text: '精神力上限越高，容錯與嘗試次數就越多。'
            },
            {
                type: 'stat',
                label: '鷹眼鑑定',
                title: this.data.upgrades.eagleEye ? '已啟用' : '未取得',
                text: this.data.upgrades.eagleEye ? '委託結算收益會額外提高 10%。' : '在商店解鎖後，委託收益會更漂亮。'
            },
            {
                type: 'stat',
                label: '學苑贊助',
                title: this.data.upgrades.sponsor ? '已啟用' : '未取得',
                text: this.data.upgrades.sponsor ? '查閱文獻成本已降至更穩定的範圍。' : '開啟後，提示消耗會更低。'
            }
        ];
        const castCards = Object.values(this.characters).map((character) => ({
            type: 'character',
            label: character.role,
            title: character.name,
            text: character.summary,
            image: character.image
        }));

        this.els.inventoryGrid.innerHTML = [...items, ...castCards].map((item) => {
            if (item.type === 'character') {
                return `
                    <article class="inventory-card cast-card">
                        <div class="portrait-frame">
                            <img src="${item.image}" alt="${item.title}">
                        </div>
                        <div class="inventory-meta">
                            <span class="inventory-label">${item.label}</span>
                            <h3>${item.title}</h3>
                            <p>${item.text}</p>
                        </div>
                    </article>
                `;
            }
            return `
                <article class="inventory-card">
                    <span class="inventory-label">${item.label}</span>
                    <div class="inventory-meta">
                        <h3 class="inventory-value">${item.title}</h3>
                        <p>${item.text}</p>
                    </div>
                </article>
            `;
        }).join('');
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
    }

    renderHubDashboard() {
        this.renderHomeSaveNote();
        this.renderSettingsPanel();

        // Toggle between start screen and game hub
        const hubEl = document.querySelector('#view-hub .hub-content');
        if (hubEl) {
            // Always show start screen on fresh page load (not yet entered hub this session)
            if (!this._hubEnteredThisSession) {
                hubEl.classList.add('home-screen');
                hubEl.classList.remove('hub-hero-layout');
                return; // Don't render hub panels until player enters
            } else {
                hubEl.classList.remove('home-screen');
                hubEl.classList.add('hub-hero-layout');
            }
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
                if(window.audio) window.audio.playClick();
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
            if(window.audio) window.audio.playScan();
            this.particles.createCelebration(window.innerWidth/2, window.innerHeight * 0.4);
            this.refreshHubGuide({ rerollCharacter: true, panelId: this.activeHubPanel });
        });

        this.els.btnHubTipShop?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.showLocation('shop');
        });

        this.els.btnGuestStart?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            if (!this.currentUser) this.data.settings.guestStarted = true;
            this._hubEnteredThisSession = true;
            this.saveData({ showToast: false });
            this.enterHub();
        });

        this.els.btnStoryStart?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.enterStoryMap();
        });

        this.els.btnDailyStart?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.startDailyChallenge();
        });

        this.els.btnEndlessStart?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.startEndless();
        });

        this.els.btnMapShop?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.showLocation('shop');
        });

        this.els.btnMapDaily?.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.startDailyChallenge();
        });

        this.els.hubBottomNav?.addEventListener('click', (e) => {
            const btn = e.target.closest('.hub-nav-btn');
            if (!btn) return;
            if(window.audio) window.audio.playClick();
            const target = btn.dataset.hubTarget;
            if (target === 'shop') {
                this.showLocation('shop');
                this.els.hubBottomNav.querySelectorAll('.hub-nav-btn').forEach(navBtn => {
                    navBtn.classList.toggle('active', navBtn === btn);
                });
                return;
            }
            // "故事" button goes directly to level select map
            if (target === 'story') {
                this.enterStoryMap();
                return;
            }
            this.showLocation('hub');
            this.showHubPanel(target);
        });

        this.els.btnToggleAudio?.addEventListener('click', () => {
            if(window.audio) {
                const muted = window.audio.toggleMute();
                this.showMessage(muted ? '背景音效已關閉' : '背景音效已開啟');
            }
        });

        this.els.btnCloudSync?.addEventListener('click', async () => {
            if(window.audio) window.audio.playClick();
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

        this.els.btnGlobalBack.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            if (this.viewState === 'shop' && this.previousView === 'map') {
                this.showLocation('map');
                this.renderMap();
                return;
            }
            this.forceReturnHub();
        });

        this.els.btnQuit.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.openConfirmModal({
                title: '確認',
                description: '確定要撤退嗎？這將不會退還已消耗的體力。',
                cancelText: '取消',
                okText: '確定撤退',
                okVariant: 'danger',
                onOk: () => {
                    this.closeConfirmModal();
                    if (this.gameMode === 'story' || this.gameMode === 'daily') {
                        this.showLocation('map');
                        this.renderMap();
                    } else {
                        this.forceReturnHub();
                    }
                }
            });
        });
        
        this.els.btnConfirmCancel.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.closeConfirmModal({ runCancel: true });
        });
        this.els.btnConfirmOk.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            if (this.pendingConfirmAction) {
                this.pendingConfirmAction();
            } else {
                this.closeConfirmModal();
            }
        });

        this.els.palette.addEventListener('click', e => {
            const btn = e.target.closest('.palette-btn');
            if(btn && !this.gameState.solved && !this.dialogue.isPlaying) this.handleIngredientTap(btn.dataset.id);
        });

        this.els.slotsContainer.addEventListener('click', (e) => {
            const slot = e.target.closest('.slot');
            if(slot && !this.gameState.solved && !this.dialogue.isPlaying) {
                const idx = parseInt(slot.dataset.index);
                if (this.gameState.hints.includes(idx)) return;
                if (this.gameState.selectedSlot === idx && this.gameState.input[idx]) {
                    this.clearSlot(idx);
                } else {
                    if(window.audio) window.audio.playClick();
                    this.setSelectedSlot(idx);
                }
            }
        });

        this.els.btnSubmit.addEventListener('click', () => {
            if(!this.dialogue.isPlaying) this.submitPotion();
        });
        
        this.els.btnHint.addEventListener('click', () => {
            if(!this.dialogue.isPlaying) this.useHint();
        });

        this.els.btnModalAction.addEventListener('click', () => {
            if(window.audio) window.audio.playClick();
            this.els.modal.classList.remove('active');
            if (this.gameState.gameOver) {
                if (this.gameMode === 'story') {
                    this.showLocation('map');
                    this.renderMap();
                } else {
                    this.showLocation('map');
                    this.renderMap();
                }
            } else {
                if (this.gameMode === 'endless') this.nextEndlessOrder();
                else if (this.gameMode === 'story') { 
                    this.showLocation('map'); 
                    this.renderMap(); 
                } else {
                    this.showLocation('map');
                    this.renderMap();
                }
            }
        });
    }

    renderMap() {
        if (this.els.btnMapDaily) {
            this.dailyChallenge = this.generateDailyChallenge();
            this.els.btnMapDaily.textContent = this.canClaimDailyReward() ? '每日挑戰 +500' : '每日挑戰';
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
                if(window.audio) window.audio.playClick();
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
                setTimeout(()=>{ card.classList.remove('new-level-glow'); this.lastHighestLevel = this.data.highestLevel; }, 2600);
            }
        });
    }

    renderShop() {
        const items = this.getShopInventory();
        this.els.shopItems.innerHTML = '';
        items.forEach(item => {
            if(item.repeat === false && item.cond && !item.cond()) return; // already bought unique

            const div = document.createElement('div');
            div.className = 'shop-item';
            div.style.setProperty('--stagger-delay', `${this.els.shopItems.children.length * 80}ms`);
            const disabled = item.disabled ? item.disabled() : false;
            const icon = item.icon || '🔮';
            const buttonLabel = disabled
                ? '暫無需求'
                : this.data.coins < item.cost
                    ? '星幣不足'
                    : `購買 ${item.cost}`;
            div.innerHTML = `
                <div class="shop-item-icon">${icon}</div>
                <div class="shop-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.desc}</p>
                    <p class="shop-item-meta">${item.category}｜${item.tier}</p>
                    <p class="shop-item-meta">${item.effectText ? item.effectText() : item.desc}</p>
                    <p class="shop-item-meta">${item.statusText ? item.statusText() : '可立即購買'}</p>
                </div>
                <button class="buy-btn" data-id="${item.id}" ${(this.data.coins < item.cost || disabled) ? 'disabled':''}>
                    <img src="assets/icons/coin.png" alt="星幣">${buttonLabel}
                </button>
            `;
            const btn = div.querySelector('button');
            btn.addEventListener('click', () => {
                if(this.data.coins >= item.cost && !disabled) {
                    if(window.audio) window.audio.playLoot ? window.audio.playLoot() : window.audio.playSuccess();
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
        this.dailyChallenge = this.generateDailyChallenge();
        this.activeHubPanel = 'daily';
        this.data.daily.lastPlayedDate = this.dailyChallenge.dateKey;
        this.saveData({ showToast: false });

        this.gameMode = 'daily';
        this.currentLevel = 0;
        this.requestFS();
        this.showLocation('game');
        this.gameState = { mana: this.data.maxMana, orderCount: 1, scoreCoins: 0, gameOver: false, hintPenalty: false, dailyRewardGranted: false, weeklyRewardGranted: false };
        this.els.leaderboardBox.classList.add('hidden');

        const lines = [
            {
                speaker: this.getCharacterProfile('scout').name,
                portrait: this.getCharacterProfile('scout').portraitClass,
                text: '今日挑戰已解封。這是模擬演算，不消耗體力，但今天只有第一次通關會發正式獎勵。'
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
    }

    startEndless() { 
        this.data.stats.endlessPlayed++;
        this.saveData({ showToast: false });
        this.startGame('endless'); 
    }

    startGame(mode, levelId = 1) {
        const requiresStamina = mode === 'story';
        if (requiresStamina && this.data.stamina < 10) {
            this.showMessage('體力不足，請先補充後再出發。', 'error');
            this.showStaminaHelp();
            return;
        }
        
        if (requiresStamina) {
            this.data.stamina -= 10;
            this.saveData({ showToast: false });
        }
        
        this.gameMode = mode;
        this.currentLevel = levelId;
        this.requestFS();
        this.showLocation('game');

        this.gameState = { mana: this.data.maxMana, orderCount: 0, scoreCoins: 0, gameOver: false, hintPenalty: false, dailyRewardGranted: false, weeklyRewardGranted: false };
        this.els.leaderboardBox.classList.add('hidden');

        // Play story explicitly every time
        if (mode === 'endless') {
            this.dialogue.play([
                {
                    speaker: this.getCharacterProfile('scout').name,
                    portrait: this.getCharacterProfile('scout').portraitClass,
                    text: '這是公會的無限挑戰模擬盤，不消耗體力，想練多久都可以。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: '每完成一輪固定拿 10 星幣。就算只是打發時間，我也想把手感維持在最好。'
                }
            ], () => this.nextEndlessOrder());
        } else {
            const lv = this.levels.find(l => l.id === levelId);
            this.dialogue.play(this.buildLevelIntro(lv), () => this.startPattern(levelId));
        }
    }

    nextEndlessOrder() {
        this.gameState.orderCount++;
        this.gameState.mana = Math.min(this.data.maxMana, this.gameState.mana + 30);
        this.gameState.hintPenalty = false;
        const endlessOrder = this.generateEndlessOrder(this.gameState.orderCount);
        this.setupBoard(
            endlessOrder.name,
            `無限挑戰｜${endlessOrder.ruleLabel}`,
            endlessOrder.rule,
            endlessOrder.slotCount,
            endlessOrder
        );
    }

    startPattern(levelId) {
        const lv = this.levels.find(l => l.id === levelId);
        this.setupBoard(lv.name, `${lv.client}｜${lv.ruleLabel}`, lv.rule, lv.slotCount, lv);
    }

    setupBoard(title, desc, rule, slotCount = 5, levelData = null) {
        this.els.gameTitle.textContent = title;
        this.els.gameDesc.textContent = desc;
        this.gameState.slotCount = slotCount;
        // Use level-specific seed to prevent duplicate answers across levels
        const levelSeed = levelData?.id ? `level-${levelData.id}-${rule}-${slotCount}` : null;
        const rng = levelSeed ? this.createSeededRandom(levelSeed) : Math.random;
        this.gameState.secret = this.generateSecret(rule, slotCount, rng);
        this.gameState.input = Array(slotCount).fill(null);
        this.gameState.turn = 0;
        this.gameState.hints = [];
        this.gameState.solved = false;
        this.gameState.levelData = levelData;
        this.gameState.selectedSlot = 0;
        
        // Setup visual slots dynamically
        this.els.slotsContainer.innerHTML = '';
        for(let i=0; i<slotCount; i++) {
            const d = document.createElement('div');
            d.className = 'slot';
            d.dataset.index = i;
            this.els.slotsContainer.appendChild(d);
        }
        // Save current DOM slots references
        this.els.slots = Array.from(document.querySelectorAll('.slot'));

        const hintText = levelData
            ? `${levelData.ruleLabel}<br>${levelData.clue}<br><br>先點選要放置的格位，再點素材。`
            : '等待輸入序列...<br>先點選格位，再點素材，精確的推理將是節省精神力的唯一出路。';
        this.els.history.innerHTML = `<div class="empty-hint">${hintText}</div>`;
        this.updateGameUI();
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
            case 'three-types':
                return slotCount >= 3 && uniqueCount === 3 && counts.every((count) => count >= 1);
            case 'bookend':
                return slotCount >= 4
                    && sequence[0] === sequence[sequence.length - 1]
                    && counts[0] === 2
                    && uniqueCount === sequence.length - 1
                    && counts.slice(1).every((count) => count === 1);
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
            if (rule === 'three-types') {
                return fillFromTypes(pickDistinct(3), slotCount);
            }
            if (rule === 'bookend') {
                const picks = pickDistinct(slotCount - 1);
                const [edge, ...middle] = picks;
                return [edge, ...this.shuffleSequence(middle, rng), edge];
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
            if(window.audio) window.audio.playScan();
            const slotRect = this.els.slots[selected]?.getBoundingClientRect();
            if (slotRect) this.particles.createCauldronPulse(slotRect.left + slotRect.width / 2, slotRect.top + slotRect.height / 2);
            this.gameState.selectedSlot = this.getNextSelectableSlot(selected + 1);
            this.updateGameUI();
        }
    }

    clearSlot(idx) {
        if(this.gameState.hints.includes(idx)) return;
        this.gameState.input[idx] = null;
        this.gameState.selectedSlot = idx;
        if(window.audio) window.audio.playClick();
        this.updateGameUI();
    }

    getHintCost() {
        let base = 15;
        if(this.data.upgrades.sponsor) base = 10;
        return base + Math.floor(this.currentLevel/2);
    }

    useHint() {
        // Disabled logic for high levels > 25
        if(this.currentLevel >= 26 && this.gameMode === 'story') {
            this.showMessage('高難度限制：查閱文獻已被公會封鎖！', 'error');
            return;
        }
        
        const cost = this.getHintCost();
        if(!this.consumeMana(cost)) return;
        
        const cands = Array.from({length: this.gameState.slotCount}, (_, idx) => idx).filter(i => !this.gameState.hints.includes(i));
        if(!cands.length) return;
        
        this.gameState.hintPenalty = true;
        this.showMessage('動用查閱文獻：當局評分鎖定為 1 星', 'error');

        const h = cands[Math.floor(Math.random()*cands.length)];
        this.gameState.hints.push(h);
        this.gameState.input[h] = this.gameState.secret[h];
        if (this.gameState.selectedSlot === h) {
            this.gameState.selectedSlot = this.getNextSelectableSlot(h + 1);
        }
        if(window.audio) window.audio.playScaffold();
        const slotRect = this.els.slots[h]?.getBoundingClientRect();
        if (slotRect) this.particles.createExplosion(slotRect.left + slotRect.width / 2, slotRect.top + slotRect.height / 2, 10, { variant: 'spark', colors: ['#fff4bf', '#d8f3ff', '#f4d6ff'], distance: [18, 52], duration: 900 });
        this.updateGameUI();
    }

    submitPotion() {
        if(this.gameState.input.some(s => s === null)) return;

        let cost = 5;
        if (this.gameMode === 'story' || this.gameMode === 'daily') {
            cost = 5 + Math.floor((this.currentLevel || 1) / 5);
        }

        if(!this.consumeMana(cost)) return;

        this.gameState.turn++;
        this.particles.createCauldronPulse(window.innerWidth / 2, window.innerHeight * 0.72);
        const res = this.scoreGuess(this.gameState.input, this.gameState.secret);
        this.addHistoryRow([...this.gameState.input], res);

        if (res.exact === this.gameState.slotCount) this.handleSolve();
        else {
            if(window.audio) window.audio.playSkill();
            this.particles.createExplosion(window.innerWidth / 2, window.innerHeight * 0.45, 12, { variant: 'mist', colors: ['#a9def9', '#d0f4de', '#e4c1f9'], distance: [10, 55], minSize: 8, maxSize: 16, duration: 1400 });
            this.gameState.input = this.gameState.input.map((v,i) => this.gameState.hints.includes(i) ? v : null);
            this.updateGameUI();
            if(this.gameState.mana <= 0) this.handleGameOver();
        }
    }

    scoreGuess(guess, secret) {
        let exact = 0, partial = 0, gR = {}, sR = {};
        for (let i=0; i<this.gameState.slotCount; i++) {
            if(guess[i] === secret[i]) exact++;
            else {
                gR[guess[i]] = (gR[guess[i]] || 0) + 1;
                sR[secret[i]] = (sR[secret[i]] || 0) + 1;
            }
        }
        for(let k in gR) partial += Math.min(gR[k], sR[k]||0);
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

    handleSolve() {
        this.gameState.solved = true;
        if(window.audio) window.audio.playSuccess();
        this.particles.createCelebration(window.innerWidth/2, window.innerHeight * 0.38);
        this.particles.createCelebration(window.innerWidth * 0.25, window.innerHeight * 0.3);
        this.particles.createCelebration(window.innerWidth * 0.75, window.innerHeight * 0.3);
        this.updateGameUI();

        let stars = 1;
        if(!this.gameState.hintPenalty) {
            if (this.gameState.turn <= 3) stars = 3;
            else if (this.gameState.turn <= 6) stars = 2;
        }

        let reward = this.gameMode === 'endless' ? 10 : 20 * stars;
        if (this.gameMode === 'daily') {
            reward = this.canClaimDailyReward() ? 500 : 0;
        } else if (this.gameMode === 'story' && this.data.upgrades.eagleEye) {
            reward = Math.floor(reward * 1.1);
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
                    text: reward > 0 ? '今日首通已封存，公會會在零點後重新發放下一筆獎勵。' : '今天的正式獎勵已領過了，但你仍可繼續重打這題。'
                },
                {
                    speaker: this.getCharacterProfile('iris').name,
                    portrait: this.getCharacterProfile('iris').portraitClass,
                    text: `這題我花了 ${this.gameState.turn} 回合。明天再來時，我還想把它壓得更乾淨。`
                }
            ];
        } else if(this.gameState.hintPenalty) {
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
                                ? '每日挑戰完成，今日首通與本週七日結算獎勵都已入帳。'
                                : this.gameState.dailyRewardGranted
                                    ? '每日挑戰已完成，500 星幣已入帳。'
                                    : '每日挑戰已完成，但今日正式獎勵已領取過。'
                        : '無限挑戰本輪完成，固定 10 星幣已入帳。',
                    story: levelData
                        ? `${this.gameMode === 'daily' ? '每日題目回顧' : '委託回顧'}｜${levelData.request}${this.gameState.weeklyRewardGranted ? '｜本週七日蓋章完成 +500' : ''}`
                        : '本輪配方已記錄進防衛紀錄冊。',
                    stars,
                    reward,
                    actionText: this.gameMode === 'story' ? '返回委託面板' : this.gameMode === 'daily' ? '回到據點' : '下一輪挑戰',
                    levelData
                });
            });
        }, 500);
    }

    handleGameOver() {
        this.gameState.gameOver = true;
        this.gameState.solved = true;
        if(window.audio) window.audio.playError();
        this.particles.createExplosion(window.innerWidth / 2, window.innerHeight * 0.5, 20, { variant: 'mist', colors: ['#ffd6e0', '#d9d9d9', '#bde0fe'], distance: [20, 70], minSize: 10, maxSize: 18, duration: 1500 });
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
                    title: '精神力透支',
                    desc: this.gameMode === 'story'
                        ? '本次委託未能完成，公會已記錄失敗報告。'
                        : this.gameMode === 'daily'
                            ? '今日挑戰未能完成，但可以立刻再次嘗試。'
                        : `無限挑戰結算：共完成 ${this.gameState.orderCount-1} 輪。`,
                    story: levelData
                        ? `${this.gameMode === 'daily' ? '每日題目回顧' : '失敗回顧'}｜${levelData.request}`
                        : '本輪演算紀錄已封存，建議回據點整理節奏。',
                    stars: 0,
                    reward: 0,
                    actionText: this.gameMode === 'daily' ? '回到據點' : this.gameMode === 'endless' ? '回到據點' : '回據點休息',
                    levelData,
                    leaderboardText: ''
                });
            });
        }, 1000);
    }

    updateGameUI() {
        const pct = (this.gameState.mana / this.data.maxMana) * 100;
        this.els.manaVal.textContent = `${this.gameState.mana} / ${this.data.maxMana}`;
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
                const sym = this.symbols.find(s=>s.id===symId);
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

        const ok = filledCount===this.gameState.slotCount && !this.gameState.solved && !this.gameState.gameOver;
        this.els.btnSubmit.disabled = !ok;
        
        const isLocked = this.currentLevel >= 26 && this.gameMode === 'story';
        let hintCost = this.getHintCost();
        this.els.btnHint.textContent = isLocked ? '封鎖權限' : `查閱文獻 (-${hintCost})`;
        this.els.btnHint.className = isLocked ? 'btn btn-secondary locked-hint' : 'btn btn-secondary';
        this.els.btnHint.disabled = this.gameState.solved || this.gameState.gameOver || this.gameState.mana < hintCost || this.gameState.hints.length === this.gameState.slotCount || isLocked;
    }

    addHistoryRow(guess, res) {
        if(this.gameState.turn===1) this.els.history.innerHTML = '';
        
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
            <div class="turn-number">#${this.gameState.turn}</div>
            <div class="history-symbols">
                ${guess.map(id => {
                    const s = this.symbols.find(x=>x.id===id);
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

    showMessage(text, type='info') {
        this.els.msg.textContent = text;
        this.els.msg.className = `show ${type}`;
        if(this.msgTimer) clearTimeout(this.msgTimer);
        this.msgTimer = setTimeout(()=>this.els.msg.classList.remove('show'), 2000);
    }
}

// Boot up robustly
window.app = new MagicAlchemyLab();
