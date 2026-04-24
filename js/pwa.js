(function () {
    const els = {
        card: document.getElementById("install-card"),
        action: document.getElementById("btn-install-game"),
        status: document.getElementById("install-status"),
        iosTip: document.getElementById("install-ios-tip")
    };

    let deferredPrompt = null;

    function canRegisterSW() {
        return "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    function isStandalone() {
        return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function showCard({ message = "", showButton = false, showIosTip = false } = {}) {
        if (!els.card) return;
        els.card.classList.remove("hidden");
        if (els.status) els.status.textContent = message;
        if (els.action) els.action.classList.toggle("hidden", !showButton);
        if (els.iosTip) els.iosTip.classList.toggle("hidden", !showIosTip);
    }

    function hideCard() {
        if (!els.card) return;
        els.card.classList.add("hidden");
    }

    function showMessage(text, type = "info") {
        if (window.app && typeof window.app.showMessage === "function") {
            window.app.showMessage(text, type);
        }
    }

    async function promptInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === "accepted") {
                showMessage("安裝流程已啟動");
            }
            deferredPrompt = null;
            showCard({
                message: "若安裝完成，之後可直接從桌面開啟。",
                showButton: false,
                showIosTip: false
            });
            return;
        }

        if (isIOS() && !isStandalone()) {
            showCard({
                message: "iPhone 可安裝成桌面版。",
                showButton: false,
                showIosTip: true
            });
            showMessage("Safari 右上分享，再按「加入主畫面」");
        }
    }

    if (els.action) {
        els.action.addEventListener("click", () => {
            promptInstall().catch((error) => {
                console.error(error);
                showMessage("安裝流程啟動失敗", "error");
            });
        });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        showCard({
            message: "可安裝成桌面版，開啟更像原生 App。",
            showButton: true,
            showIosTip: false
        });
    });

    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        hideCard();
        showMessage("已安裝到裝置");
    });

    if (isStandalone()) {
        hideCard();
    } else if (isIOS()) {
        showCard({
            message: "iPhone 可加入主畫面，像 App 一樣開啟。",
            showButton: false,
            showIosTip: true
        });
    }

    if (canRegisterSW()) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").catch((error) => {
                console.error("Service worker registration failed:", error);
            });
        });
    }
})();
