import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import {
    getAuth,
    GoogleAuthProvider,
    getRedirectResult,
    onAuthStateChanged,
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

async function loginWithGoogle() {
    try {
        if (isMobileDevice()) {
            await signInWithRedirect(auth, provider);
            return;
        }

        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        showMessage(`登入失敗：${error.code || error.message}`, "error");
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
        }
    } else {
        els.guest.classList.remove("hidden");
        els.user.classList.add("hidden");

        window.currentUser = null;
        if (window.app) {
            window.app.currentUser = null;
        }
    }
}

if (els.loginGoogle) {
    els.loginGoogle.addEventListener("click", loginWithGoogle);
}

if (els.logout) {
    els.logout.addEventListener("click", logoutUser);
}

getRedirectResult(auth).catch((error) => {
    console.error(error);
    showMessage(`登入導回失敗：${error.code || error.message}`, "error");
});

onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
});
