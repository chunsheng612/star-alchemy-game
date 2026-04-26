import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import {
    browserLocalPersistence,
    getAuth,
    GoogleAuthProvider,
    getRedirectResult,
    onAuthStateChanged,
    setPersistence,
    signInWithPopup,
    signInWithRedirect,
    signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig) {
    throw new Error("Missing window.__FIREBASE_CONFIG__");
}

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
auth.languageCode = "zh-TW";
setPersistence(auth, browserLocalPersistence).catch(() => {
    // Keep default persistence if the environment refuses explicit local persistence.
});

analyticsSupported().then((supported) => {
    if (supported) {
        getAnalytics(firebaseApp);
    }
}).catch(() => {
    // Ignore analytics initialization issues on unsupported environments.
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.firebaseAuth = { firebaseApp, auth };

const els = {
    guest: document.getElementById("auth-guest"),
    user: document.getElementById("auth-user"),
    loginGoogle: document.getElementById("btn-login-google"),
    logout: document.getElementById("btn-logout"),
    avatar: document.getElementById("auth-avatar"),
    name: document.getElementById("auth-name"),
    email: document.getElementById("auth-email")
};

function showMessage(text, type = "info") {
    if (window.app && typeof window.app.showMessage === "function") {
        window.app.showMessage(text, type);
        return;
    }
    console.log(text);
}

function isMobileDevice() {
    return window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getAuthErrorMessage(error) {
    switch (error?.code) {
        case "auth/popup-closed-by-user":
            return "登入視窗已關閉，尚未完成 Google 驗證。";
        case "auth/popup-blocked":
            return "瀏覽器擋下了登入視窗，請允許彈出視窗後再試一次。";
        case "auth/cancelled-popup-request":
            return "登入程序已被新的請求取代，請再點一次 Google 登入。";
        case "auth/unauthorized-domain":
            return `目前網域 ${window.location.hostname} 尚未加入 Firebase Authorized domains。`;
        case "auth/network-request-failed":
            return "網路請求失敗，請確認目前頁面可正常連線到 Firebase。";
        default:
            return `登入失敗：${error?.code || error?.message || "未知錯誤"}`;
    }
}

function shouldFallbackToRedirect(error) {
    const redirectReadyCodes = new Set([
        "auth/popup-blocked",
        "auth/cancelled-popup-request",
        "auth/operation-not-supported-in-this-environment"
    ]);
    return isMobileDevice() && redirectReadyCodes.has(error?.code);
}

async function loginWithGoogle() {
    try {
        if (isMobileDevice() || isStandaloneApp()) {
            showMessage("即將開啟 Google 登入頁面，完成後會自動返回遊戲。");
            await signInWithRedirect(auth, provider);
            return;
        }
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        if (shouldFallbackToRedirect(error)) {
            try {
                showMessage("目前改用重新導向登入，請完成 Google 驗證後返回遊戲。");
                await signInWithRedirect(auth, provider);
            } catch (redirectError) {
                console.error(redirectError);
                showMessage(getAuthErrorMessage(redirectError), "error");
            }
            return;
        }
        showMessage(getAuthErrorMessage(error), "error");
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        showMessage("已登出");
    } catch (error) {
        console.error(error);
        showMessage(`登出失敗：${error.code || error.message}`, "error");
    }
}

function updateAuthUI(user) {
    if (!els.guest || !els.user) return;

    if (user) {
        els.guest.classList.add("hidden");
        els.user.classList.remove("hidden");

        if (els.avatar) {
            els.avatar.src = user.photoURL || "assets/icons/potion_blue.png";
        }
        if (els.name) {
            els.name.textContent = user.displayName || "已登入玩家";
        }
        if (els.email) {
            els.email.textContent = user.email || "";
        }

        window.currentUser = user;
        if (window.app) {
            window.app.currentUser = user;
            if (typeof window.app.onAuthChanged === "function") {
                window.app.onAuthChanged(user);
            }
        }
    } else {
        els.guest.classList.remove("hidden");
        els.user.classList.add("hidden");

        window.currentUser = null;
        if (window.app) {
            window.app.currentUser = null;
            if (typeof window.app.onAuthChanged === "function") {
                window.app.onAuthChanged(null);
            }
        }
    }
}

if (els.loginGoogle) {
    els.loginGoogle.addEventListener("click", loginWithGoogle);
}

if (els.logout) {
    els.logout.addEventListener("click", logoutUser);
}

getRedirectResult(auth)
    .then((result) => {
        if (result?.user) {
            showMessage("Google 登入完成");
        }
    })
    .catch((error) => {
        console.error(error);
        if (error?.code === "auth/no-auth-event") return;
        showMessage(getAuthErrorMessage(error), "error");
    });

onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
});
