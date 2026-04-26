import {
    initializeFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    enableNetwork
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

let db = null;
let auth = null;

const els = {
    status: document.getElementById("cloud-save-status"),
    detail: document.getElementById("cloud-save-status-detail")
};

let activeUid = null;
let queuedData = null;
let saveTimer = null;
let syncInFlight = false;
let requeueAfterSync = false;
let syncFailureNotified = false;
let lastSyncSucceeded = false;
let statusTimeout = null;

function ensureFirebase() {
    if (db && auth) return true;
    const fb = window.firebaseAuth;
    if (fb?.firebaseApp && fb?.auth) {
        db = initializeFirestore(fb.firebaseApp, {
            experimentalForceLongPolling: true,
            useFetchStreams: false
        });
        auth = fb.auth;
        
        // Force network to on to fix the 'client is offline' false positive
        void enableNetwork(db).catch(e => console.warn("Enable network failed:", e));
        return true;
    }
    return false;
}

function showMessage(text, type = "info") {
    if (window.app && typeof window.app.showMessage === "function") {
        window.app.showMessage(text, type);
    }
}

function setStatus(text, tone = "") {
    const timeStr = (tone === "success") 
        ? ` (${new Date().toLocaleTimeString([], { hour12: false })})` 
        : "";
    
    [els.status, els.detail].forEach((node) => {
        if (!node) return;
        node.textContent = text + timeStr;
        node.className = `cloud-save-status${tone ? ` is-${tone}` : ""}`;
    });

    // Safety timeout: if stuck in 'busy' for more than 15s, revert to neutral
    clearTimeout(statusTimeout);
    if (tone === "busy") {
        statusTimeout = setTimeout(() => {
            if (syncInFlight) {
                console.warn("Sync seems stuck, resetting status view.");
                setStatus("同步反應較慢，請確認網路", "error");
            }
        }, 15000);
    }
}

function getSaveRef(uid) {
    if (!ensureFirebase()) return null;
    return doc(db, "users", uid, "game", "save");
}

async function persistCloudData(uid, payload) {
    if (!uid || !payload || !ensureFirebase()) return;

    // Use a longer timeout for mobile networks (25 seconds)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Cloud write timeout (25s)")), 25000)
    );

    const savePromise = setDoc(
        getSaveRef(uid),
        {
            saveData: payload,
            clientUpdatedAt: payload.updatedAt,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

    await Promise.race([savePromise, timeoutPromise]);
}

async function flushSaveQueue() {
    if (!activeUid || !queuedData || !window.app || !ensureFirebase()) {
        syncInFlight = false;
        return false;
    }

    if (syncInFlight) {
        requeueAfterSync = true;
        return false;
    }

    const snapshot = queuedData;
    queuedData = null;
    syncInFlight = true;
    setStatus("雲端同步中…", "busy");

    try {
        await persistCloudData(activeUid, snapshot);
        syncFailureNotified = false;
        lastSyncSucceeded = true;
        setStatus("雲端已同步", "success");
        
        setTimeout(() => {
            if (!syncInFlight && !queuedData) {
                setStatus("雲端已同步", "");
            }
        }, 5000);
    } catch (error) {
        console.error("Cloud sync detailed error:", error);
        lastSyncSucceeded = false;
        
        const isTimeout = error.message?.includes("timeout");
        const errorCode = error.code || (isTimeout ? "timeout" : "unknown");
        
        setStatus(`同步失敗 (${errorCode})，重試中`, "error");
        
        if (!queuedData) queuedData = snapshot;
        
        if (!syncFailureNotified) {
            syncFailureNotified = true;
            const userMsg = isTimeout 
                ? "連線較慢，正在背景排隊上傳" 
                : `同步錯誤: ${errorCode}，請確認網路`;
            showMessage(userMsg, "error");
        }
        
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            void flushSaveQueue();
        }, 10000);
    } finally {
        syncInFlight = false;
        if (requeueAfterSync) {
            requeueAfterSync = false;
            void flushSaveQueue();
        }
    }
    return lastSyncSucceeded;
}

function queueSave(nextData) {
    if (!window.app) return;

    if (!activeUid) {
        setStatus("未登入時僅保存在此裝置。");
        return;
    }

    queuedData = window.app.getSerializableData(nextData);
    setStatus("雲端同步中…", "busy");

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        void flushSaveQueue();
    }, 1200);
}

async function hydrateCloudSave(user, retryCount = 0) {
    if (!user || !window.app || !ensureFirebase()) return;
    if (syncInFlight && retryCount === 0) return;

    activeUid = user.uid;
    syncInFlight = true;
    setStatus("雲端存檔讀取中…", "busy");

    const localData = window.app.getSerializableData(window.app.data, { touchTimestamp: false });
    const saveRef = getSaveRef(user.uid);

    try {
        // Ensure network is on
        await enableNetwork(db).catch(() => {});
        
        const snap = await getDoc(saveRef);
        const cloudData = snap.exists() ? snap.data()?.saveData || null : null;

        if (!cloudData) {
            await persistCloudData(user.uid, localData);
            setStatus("已建立雲端存檔", "success");
            setTimeout(() => {
                if (!syncInFlight) setStatus("雲端已同步", "");
            }, 5000);
            return;
        }

        const mergedData = window.app.mergeSaveData(localData, cloudData);
        const localJson = JSON.stringify(window.app.normalizeData(localData));
        const mergedJson = JSON.stringify(mergedData);

        if (mergedJson !== localJson) {
            window.app.applyExternalData(mergedData, {
                notice: "已載入雲端存檔"
            });
        }

        if (JSON.stringify(mergedData) !== JSON.stringify(cloudData)) {
            await persistCloudData(user.uid, mergedData);
        }

        setStatus("雲端已同步", "success");
        syncFailureNotified = false;
        
        setTimeout(() => {
            if (!syncInFlight && !queuedData) {
                setStatus("雲端已同步", "");
            }
        }, 5000);
    } catch (error) {
        console.error(`Cloud save hydrate failed (Attempt ${retryCount + 1}):`, error);
        
        // Auto retry once if it's a network issue
        if (retryCount < 1 && (error.message?.includes("offline") || error.message?.includes("timeout"))) {
            console.log("[Sync] Retrying hydration in 3 seconds...");
            setTimeout(() => {
                void hydrateCloudSave(user, retryCount + 1);
            }, 3000);
            return;
        }

        if (error.message?.includes("offline")) {
            setStatus("雲端連線失敗 (離線模式)", "error");
        } else {
            setStatus("雲端讀取失敗，目前使用本機存檔", "error");
        }
        
        // Only show message toast if it's the final retry
        showMessage("雲端同步連線中，請稍候...", "info");
    } finally {
        syncInFlight = false;
        if (requeueAfterSync) {
            requeueAfterSync = false;
            void flushSaveQueue();
        }
    }
}

window.cloudSave = {
    queueSave,
    forceSync: async () => {
        if (!activeUid || !window.app) {
            setStatus("未登入時僅保存在此裝置。");
            return false;
        }
        queuedData = window.app.getSerializableData(window.app.data);
        clearTimeout(saveTimer);
        return flushSaveQueue();
    }
};

const checkAuthInterval = setInterval(() => {
    if (ensureFirebase()) {
        clearInterval(checkAuthInterval);
        onAuthStateChanged(auth, async (user) => {
            clearTimeout(saveTimer);
            queuedData = null;
            requeueAfterSync = false;
            syncInFlight = false;

            if (!user) {
                activeUid = null;
                syncFailureNotified = false;
                setStatus("未登入時僅保存在此裝置。");
                return;
            }
            
            // Force network enable on auth change to wake up Firestore
            void enableNetwork(db).catch(() => {});
            
            await hydrateCloudSave(user);
        });
    }
}, 500);
