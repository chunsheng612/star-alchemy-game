// firebase-save.js - v8 Compat Version
(function() {
    let auth = null;
    let firestore = null;

    const els = {
        status: document.getElementById("cloud-save-status"),
        detail: document.getElementById("cloud-save-status-detail")
    };

    const FIRESTORE_PATCH_FIELDS = ["saveDataJson", "saveData", "clientUpdatedAt", "updatedAt", "schemaVersion"];
    let activeUid = null;
    let queuedData = null;
    let saveTimer = null;
    let syncInFlight = false;

    function ensureFirebase() {
        if (auth && firestore) return true;
        if (window.firebase) {
            auth = firebase.auth();
            firestore = firebase.firestore();
            return true;
        }
        return false;
    }

    function setStatus(text, tone = "") {
        const timeStr = tone === "success" ? ` (${new Date().toLocaleTimeString([], { hour12: false })})` : "";
        [els.status, els.detail].forEach((node) => {
            if (!node) return;
            node.textContent = text + timeStr;
            node.className = `cloud-save-status${tone ? ` is-${tone}` : ""}`;
        });
    }

    async function persistCloudData(uid, payload) {
        if (!uid || !payload || !ensureFirebase()) return false;
        try {
            const userDoc = firestore.collection('users').doc(uid).collection('game').doc('save');
            await userDoc.set({
                saveDataJson: JSON.stringify(payload),
                saveData: payload,
                clientUpdatedAt: payload.updatedAt || Date.now(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                schemaVersion: "2"
            }, { merge: true });
            return true;
        } catch (e) {
            console.error("Cloud save failed:", e);
            throw e;
        }
    }

    async function flushSaveQueue() {
        if (!activeUid || !queuedData || !window.app || !ensureFirebase()) return;
        if (syncInFlight) return;
        
        const snapshot = queuedData;
        queuedData = null;
        syncInFlight = true;
        setStatus("雲端同步中…", "busy");

        try {
            await persistCloudData(activeUid, snapshot);
            setStatus("雲端已同步", "success");
        } catch (error) {
            queuedData = snapshot;
            setStatus("同步失敗，已保留在本機", "error");
        } finally {
            syncInFlight = false;
        }
    }

    function queueSave(nextData) {
        if (!window.app) return;
        if (!activeUid) {
            setStatus("僅保存在此裝置。");
            return;
        }
        queuedData = window.app.getSerializableData(nextData);
        setStatus("等待同步…", "busy");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(flushSaveQueue, 2000);
    }

    async function hydrateCloudSave(user) {
        if (!user || !window.app || !ensureFirebase()) return;
        activeUid = user.uid;
        setStatus("讀取存檔中…", "busy");

        try {
            const userDoc = await firestore.collection('users').doc(user.uid).collection('game').doc('save').get();
            const localData = window.app.getSerializableData(window.app.data, { touchTimestamp: false });
            
            if (!userDoc.exists) {
                await persistCloudData(user.uid, localData);
                setStatus("已建立雲端存檔", "success");
                return;
            }

            const cloudData = userDoc.data().saveData || JSON.parse(userDoc.data().saveDataJson || "{}");
            const mergedData = window.app.mergeSaveData(localData, cloudData);
            
            if (JSON.stringify(mergedData) !== JSON.stringify(window.app.normalizeData(localData))) {
                window.app.applyExternalData(mergedData, { notice: "已載入雲端存檔" });
            }
            setStatus("雲端已同步", "success");
        } catch (error) {
            console.error("Hydrate failed:", error);
            setStatus("讀取失敗，使用本機存檔", "error");
        }
    }

    window.cloudSave = {
        queueSave,
        forceSync: async () => {
            if (!activeUid) return false;
            queuedData = window.app.getSerializableData(window.app.data);
            await flushSaveQueue();
            return true;
        }
    };

    const checkAuth = setInterval(() => {
        if (ensureFirebase()) {
            clearInterval(checkAuth);
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    activeUid = null;
                    setStatus("僅保存在此裝置。");
                    return;
                }
                await hydrateCloudSave(user);
            });
        }
    }, 500);
})();
