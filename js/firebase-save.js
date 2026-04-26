import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseApp = window.firebaseAuth?.firebaseApp;
const auth = window.firebaseAuth?.auth;

if (!firebaseApp || !auth) {
    throw new Error("Firebase Auth must be initialized before Firestore sync.");
}

const db = getFirestore(firebaseApp);
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

function showMessage(text, type = "info") {
    if (window.app && typeof window.app.showMessage === "function") {
        window.app.showMessage(text, type);
    }
}

function setStatus(text, tone = "") {
    [els.status, els.detail].forEach((node) => {
        if (!node) return;
        node.textContent = text;
        node.className = `cloud-save-status${tone ? ` is-${tone}` : ""}`;
    });
}

function getSaveRef(uid) {
    return doc(db, "users", uid, "game", "save");
}

/**
 * Perform actual Firestore write
 * @param {string} uid User ID
 * @param {object} payload Serialized data
 */
async function persistCloudData(uid, payload) {
    if (!uid || !payload) return;

    await setDoc(
        getSaveRef(uid),
        {
            saveData: payload,
            clientUpdatedAt: payload.updatedAt,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
}

async function flushSaveQueue() {
    if (!activeUid || !queuedData || !window.app) {
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
    } catch (error) {
        console.error("Cloud save sync failed:", error);
        lastSyncSucceeded = false;
        setStatus("雲端同步失敗，稍後會再試", "error");
        
        // Put back in queue if it wasn't replaced by newer data
        if (!queuedData) queuedData = snapshot;
        
        if (!syncFailureNotified) {
            syncFailureNotified = true;
            showMessage("雲端同步失敗，請確認網路連線", "error");
        }
        
        // Retry later
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            void flushSaveQueue();
        }, 8000);
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

    // Capture snapshot immediately
    queuedData = window.app.getSerializableData(nextData);
    
    // If not currently syncing, show busy status and schedule
    if (!syncInFlight) {
        setStatus("雲端同步中…", "busy");
    }

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        void flushSaveQueue();
    }, 1000);
}

async function hydrateCloudSave(user) {
    if (!user || !window.app) return;
    if (syncInFlight) {
        // If a sync is already happening (unlikely during boot/auth change), wait or skip
        // For hydration, we usually want to finish this first.
    }

    activeUid = user.uid;
    syncInFlight = true;
    setStatus("雲端存檔讀取中…", "busy");

    const localData = window.app.getSerializableData(window.app.data, { touchTimestamp: false });
    const saveRef = getSaveRef(user.uid);

    try {
        const snap = await getDoc(saveRef);
        const cloudData = snap.exists() ? snap.data()?.saveData || null : null;

        if (!cloudData) {
            // New cloud user, upload local data
            await persistCloudData(user.uid, localData);
            setStatus("已建立雲端存檔", "success");
            syncInFlight = false;
            return;
        }

        const mergedData = window.app.mergeSaveData(localData, cloudData);
        const localJson = JSON.stringify(window.app.normalizeData(localData));
        const cloudJson = JSON.stringify(window.app.normalizeData(cloudData));
        const mergedJson = JSON.stringify(mergedData);

        if (mergedJson !== localJson) {
            window.app.applyExternalData(mergedData, {
                notice: "已載入雲端存檔"
            });
        }

        if (mergedJson !== cloudJson) {
            // Cloud needs update after merge
            await persistCloudData(user.uid, mergedData);
        }

        setStatus("雲端已同步", "success");
        syncFailureNotified = false;
    } catch (error) {
        console.error("Cloud save hydrate failed:", error);
        setStatus("雲端讀取失敗，目前使用本機存檔", "error");
        showMessage("雲端存檔讀取失敗，目前使用本機進度", "error");
    } finally {
        syncInFlight = false;
        // Check if anything was queued during hydration
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

onAuthStateChanged(auth, async (user) => {
    clearTimeout(saveTimer);
    queuedData = null;
    requeueAfterSync = false;
    syncInFlight = false; // Reset on auth change

    if (!user) {
        activeUid = null;
        syncFailureNotified = false;
        setStatus("未登入時僅保存在此裝置。");
        return;
    }

    await hydrateCloudSave(user);
});
