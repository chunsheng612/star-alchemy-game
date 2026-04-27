// firebase-auth.js - v8 Compat Version
(function() {
    const firebaseConfig = window.__FIREBASE_CONFIG__;

    if (!firebaseConfig) {
        console.error("Missing window.__FIREBASE_CONFIG__");
        return;
    }

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    auth.languageCode = "zh-TW";
    
    // Set Persistence (v8 style)
    const authReady = auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {
        // Keep default
    });

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    let loginInProgress = false;

    window.firebaseAuth = { 
        firebaseApp: firebase.app(), 
        auth: auth, 
        authReady: authReady, 
        loginWithGoogle, 
        logoutUser 
    };

    const els = {
        guest: document.getElementById("auth-guest"),
        user: document.getElementById("auth-user"),
        loginGoogle: document.getElementById("btn-login-google"),
        loginGoogleSettings: document.getElementById("btn-settings-login-google"),
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

    async function loginWithGoogle() {
        if (loginInProgress) return;
        loginInProgress = true;
        setLoginButtonsBusy(true);

        try {
            await authReady;
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error("Auth Error:", error);
            if (error.code === "auth/popup-blocked" || error.code === "auth/operation-not-supported-in-this-environment") {
                try {
                    await auth.signInWithRedirect(provider);
                } catch (redirectError) {
                    console.error("Redirect Error:", redirectError);
                }
            }
        } finally {
            loginInProgress = false;
            setLoginButtonsBusy(false);
        }
    }

    async function logoutUser() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error(error);
        }
    }

    function setLoginButtonsBusy(isBusy) {
        document.querySelectorAll("#btn-login-google, #btn-settings-login-google").forEach((button) => {
            button.disabled = isBusy;
        });
    }

    function updateAuthUI(user) {
        if (!els.guest || !els.user) return;

        if (user) {
            els.guest.classList.add("hidden");
            els.user.classList.remove("hidden");
            if (els.avatar) els.avatar.src = user.photoURL || "assets/icons/potion_blue.png";
            if (els.name) els.name.textContent = user.displayName || "已登入玩家";
            if (els.email) els.email.textContent = user.email || "";

            window.currentUser = user;
            if (window.app) {
                window.app.currentUser = user;
                if (typeof window.app.onAuthChanged === "function") window.app.onAuthChanged(user);
            }
        } else {
            els.guest.classList.remove("hidden");
            els.user.classList.add("hidden");
            window.currentUser = null;
            if (window.app) {
                window.app.currentUser = null;
                if (typeof window.app.onAuthChanged === "function") window.app.onAuthChanged(null);
            }
        }
    }

    document.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#btn-login-google, #btn-settings-login-google');
        if (loginBtn) {
            e.preventDefault();
            if (window.audio) window.audio.playClick();
            void loginWithGoogle();
        }
    });

    if (els.logout) {
        els.logout.addEventListener("click", logoutUser);
    }

    auth.onAuthStateChanged((user) => {
        loginInProgress = false;
        setLoginButtonsBusy(false);
        updateAuthUI(user);
    });
})();
