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
    status: document.getElementById("cloud-save-status")
};

let activeUid = null;
let queuedData = null;
let saveTimer = null;
let syncInFlight = false;
let requeueAfterSync = false;
let syncFailureNotified = false;

function showMessage(text, type = "info") {
    if (window.app && typeof window.app.showMessage === "function") {
        window.app.showMessage(text, type);
    }
}

function setStatus(text, tone = "") {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.className = `cloud-save-status${tone ? ` is-${tone}` : ""}`;
}

function getSaveRef(uid) {
    return doc(db, "users", uid, "game", "save");
}

async function persistCloudData(uid, nextData) {
    if (!uid || !window.app) return;

    const payload = window.app.getSerializableData(nextData);
    await setDoc(
        getSaveRef(uid),
        {
            saveData: payload,
            clientUpdatedAt: payload.updatedAt,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

    return payload;
}

async function flushSaveQueue() {
    if (!activeUid || !queuedData || !window.app) return;
    if (syncInFlight) {
        requeueAfterSync = true;
        return;
    }

    const snapshot = queuedData;
    queuedData = null;
    syncInFlight = true;
    setStatus("雲端同步中…", "busy");

    try {
        await persistCloudData(activeUid, snapshot);
        syncFailureNotified = false;
        setStatus("雲端已同步", "success");
    } catch (error) {
        console.error("Cloud save sync failed:", error);
        setStatus("雲端同步失敗，稍後會再試", "error");
        if (snapshot) queuedData = snapshot;
        if (!syncFailureNotified) {
            syncFailureNotified = true;
            showMessage("雲端同步失敗，請稍後再試", "error");
        }
        saveTimer = setTimeout(() => {
            void flushSaveQueue();
        }, 4000);
    } finally {
        syncInFlight = false;
        if (requeueAfterSync) {
            requeueAfterSync = false;
            void flushSaveQueue();
        }
    }
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
    }, 700);
}

async function hydrateCloudSave(user) {
    if (!user || !window.app) return;

    activeUid = user.uid;
    setStatus("雲端存檔讀取中…", "busy");

    const localData = window.app.getSerializableData(window.app.data, { touchTimestamp: false });
    const saveRef = getSaveRef(user.uid);

    try {
        const snap = await getDoc(saveRef);
        const cloudData = snap.exists() ? snap.data()?.saveData || null : null;

        if (!cloudData) {
            await persistCloudData(user.uid, localData);
            setStatus("已建立雲端存檔", "success");
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
            await persistCloudData(user.uid, mergedData);
        }

        setStatus("雲端已同步", "success");
        syncFailureNotified = false;
    } catch (error) {
        console.error("Cloud save hydrate failed:", error);
        setStatus("雲端讀取失敗，目前使用本機存檔", "error");
        showMessage("雲端存檔讀取失敗，目前使用本機進度", "error");
    }
}

window.cloudSave = {
    queueSave,
    forceSync: () => flushSaveQueue()
};

onAuthStateChanged(auth, async (user) => {
    clearTimeout(saveTimer);
    queuedData = null;
    requeueAfterSync = false;

    if (!user) {
        activeUid = null;
        syncFailureNotified = false;
        setStatus("未登入時僅保存在此裝置。");
        return;
    }

    await hydrateCloudSave(user);
});
