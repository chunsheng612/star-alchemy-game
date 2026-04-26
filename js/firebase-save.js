import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

let auth = null;

const els = {
    status: document.getElementById("cloud-save-status"),
    detail: document.getElementById("cloud-save-status-detail")
};

const SYNC_TIMEOUT_MS = 20000;
const INITIAL_RETRY_DELAY_MS = 6000;
const MAX_RETRY_DELAY_MS = 60000;
const HYDRATE_RETRY_DELAY_MS = 3000;
const MAX_HYDRATE_RETRIES = 2;
const FIRESTORE_PATCH_FIELDS = ["saveDataJson", "saveData", "clientUpdatedAt", "updatedAt", "schemaVersion"];

let activeUid = null;
let queuedData = null;
let saveTimer = null;
let retryDelayMs = INITIAL_RETRY_DELAY_MS;
let syncInFlight = false;
let requeueAfterSync = false;
let syncFailureNotified = false;
let lastSyncSucceeded = false;
let statusTimeout = null;

function ensureFirebase() {
    if (auth) return true;

    const fb = window.firebaseAuth;
    const projectId = window.__FIREBASE_CONFIG__?.projectId;
    if (fb?.auth && projectId) {
        auth = fb.auth;
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
    const timeStr = tone === "success"
        ? ` (${new Date().toLocaleTimeString([], { hour12: false })})`
        : "";

    [els.status, els.detail].forEach((node) => {
        if (!node) return;
        node.textContent = text + timeStr;
        node.className = `cloud-save-status${tone ? ` is-${tone}` : ""}`;
    });

    clearTimeout(statusTimeout);
    if (tone === "busy") {
        statusTimeout = setTimeout(() => {
            if (syncInFlight) {
                setStatus("雲端仍在連線中，資料已保留在本機", "error");
            }
        }, 15000);
    }
}

function getErrorCode(error) {
    return error?.code || error?.statusText || error?.message || "unknown";
}

function isRetriableError(error) {
    const code = getErrorCode(error);
    return ["offline", "network", "timeout"].includes(code) || Number(error?.status || 0) >= 500;
}

function makeFirestoreUrl(uid, { patch = false } = {}) {
    const projectId = window.__FIREBASE_CONFIG__?.projectId;
    const encodedUid = encodeURIComponent(uid);
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodedUid}/game/save`);

    if (patch) {
        FIRESTORE_PATCH_FIELDS.forEach((field) => {
            url.searchParams.append("updateMask.fieldPaths", field);
        });
    }

    return url.toString();
}

function createError(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

async function fetchWithTimeout(url, options = {}) {
    if (navigator.onLine === false) {
        throw createError("Browser is offline", "offline");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } catch (error) {
        if (error?.name === "AbortError") {
            throw createError(`Cloud request timeout (${SYNC_TIMEOUT_MS / 1000}s)`, "timeout");
        }
        throw createError(error?.message || "Cloud request failed", "network", { cause: error });
    } finally {
        clearTimeout(timer);
    }
}

async function getAuthToken(uid, forceRefresh = false) {
    if (!ensureFirebase()) {
        throw createError("Firebase Auth is not ready", "auth-not-ready");
    }

    await window.firebaseAuth?.authReady;

    const user = auth.currentUser;
    if (!user || user.uid !== uid) {
        throw createError("No signed-in user for cloud save", "auth/no-current-user");
    }

    return user.getIdToken(forceRefresh);
}

async function firestoreFetch(uid, url, options = {}, forceRefreshToken = false) {
    const token = await getAuthToken(uid, forceRefreshToken);
    const response = await fetchWithTimeout(url, {
        method: options.method || "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && !forceRefreshToken) {
        return firestoreFetch(uid, url, options, true);
    }

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw createError(
            payload?.error?.message || response.statusText || "Firestore request failed",
            payload?.error?.status || `http-${response.status}`,
            { status: response.status, payload }
        );
    }

    return payload;
}

function jsonToFirestoreValue(value) {
    if (value === null || value === undefined) {
        return { nullValue: "NULL_VALUE" };
    }

    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((item) => jsonToFirestoreValue(item))
            }
        };
    }

    switch (typeof value) {
        case "boolean":
            return { booleanValue: value };
        case "number":
            return Number.isInteger(value)
                ? { integerValue: String(value) }
                : { doubleValue: value };
        case "string":
            return { stringValue: value };
        case "object":
            return {
                mapValue: {
                    fields: Object.fromEntries(
                        Object.entries(value)
                            .filter(([, child]) => child !== undefined)
                            .map(([key, child]) => [key, jsonToFirestoreValue(child)])
                    )
                }
            };
        default:
            return { stringValue: String(value) };
    }
}

function firestoreValueToJson(value) {
    if (!value || typeof value !== "object") return undefined;
    if ("nullValue" in value) return null;
    if ("booleanValue" in value) return Boolean(value.booleanValue);
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return Number(value.doubleValue);
    if ("timestampValue" in value) return value.timestampValue;
    if ("stringValue" in value) return value.stringValue;
    if ("arrayValue" in value) {
        return (value.arrayValue.values || []).map((item) => firestoreValueToJson(item));
    }
    if ("mapValue" in value) {
        return Object.fromEntries(
            Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, firestoreValueToJson(child)])
        );
    }
    return undefined;
}

function readCloudSaveData(document) {
    const fields = document?.fields || {};

    if (fields.saveDataJson?.stringValue) {
        try {
            return JSON.parse(fields.saveDataJson.stringValue);
        } catch (error) {
            console.warn("Cloud save JSON field is invalid, falling back to legacy map field.", error);
        }
    }

    if (fields.saveData) {
        return firestoreValueToJson(fields.saveData);
    }

    return null;
}

async function loadCloudDocument(uid) {
    try {
        return await firestoreFetch(uid, makeFirestoreUrl(uid));
    } catch (error) {
        if (error?.status === 404) return null;
        throw error;
    }
}

async function persistCloudData(uid, payload) {
    if (!uid || !payload || !ensureFirebase()) return false;

    const updatedAt = Number(payload.updatedAt) || Date.now();
    const body = {
        fields: {
            saveDataJson: { stringValue: JSON.stringify(payload) },
            saveData: jsonToFirestoreValue(payload),
            clientUpdatedAt: { integerValue: String(updatedAt) },
            updatedAt: { timestampValue: new Date().toISOString() },
            schemaVersion: { integerValue: "2" }
        }
    };

    await firestoreFetch(uid, makeFirestoreUrl(uid, { patch: true }), {
        method: "PATCH",
        body
    });

    return true;
}

function resetRetryBackoff() {
    retryDelayMs = INITIAL_RETRY_DELAY_MS;
}

function scheduleRetry() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        void flushSaveQueue();
    }, retryDelayMs);
    retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, retryDelayMs * 2);
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

    if (navigator.onLine === false) {
        setStatus("目前離線，已排隊等待連線", "error");
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
        resetRetryBackoff();
        setStatus("雲端已同步", "success");

        setTimeout(() => {
            if (!syncInFlight && !queuedData) {
                setStatus("雲端已同步", "");
            }
        }, 5000);
    } catch (error) {
        console.error("Cloud sync detailed error:", error);
        lastSyncSucceeded = false;

        if (!queuedData) queuedData = snapshot;

        const errorCode = getErrorCode(error);
        const label = errorCode === "timeout"
            ? "同步逾時，已排隊重試"
            : `同步失敗 (${errorCode})，已排隊重試`;
        setStatus(label, "error");

        if (!syncFailureNotified) {
            syncFailureNotified = true;
            const userMsg = isRetriableError(error)
                ? "雲端連線不穩，資料已保留並會自動重試"
                : `同步錯誤: ${errorCode}`;
            showMessage(userMsg, isRetriableError(error) ? "info" : "error");
        }

        scheduleRetry();
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

    if (navigator.onLine === false) {
        setStatus("目前離線，已排隊等待連線", "error");
        return;
    }

    setStatus("雲端同步中…", "busy");

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        void flushSaveQueue();
    }, 1200);
}

function getHydrateErrorStatus(error) {
    const code = getErrorCode(error);
    if (code === "offline") return "目前離線，暫時使用本機存檔";
    if (code === "timeout") return "雲端讀取逾時，目前使用本機存檔";
    if (error?.status === 403 || code === "PERMISSION_DENIED") return "雲端權限不足，請檢查 Firestore 規則";
    return "雲端讀取失敗，目前使用本機存檔";
}

async function hydrateCloudSave(user, retryCount = 0) {
    if (!user || !window.app || !ensureFirebase()) return false;
    if (auth.currentUser?.uid !== user.uid) return false;
    if (syncInFlight && retryCount === 0) {
        requeueAfterSync = true;
        return false;
    }

    activeUid = user.uid;
    syncInFlight = true;
    setStatus("雲端存檔讀取中…", "busy");

    const localData = window.app.getSerializableData(window.app.data, { touchTimestamp: false });

    try {
        const document = await loadCloudDocument(user.uid);
        const cloudData = readCloudSaveData(document);

        if (!cloudData) {
            await persistCloudData(user.uid, localData);
            resetRetryBackoff();
            setStatus("已建立雲端存檔", "success");
            setTimeout(() => {
                if (!syncInFlight) setStatus("雲端已同步", "");
            }, 5000);
            return true;
        }

        const mergedData = window.app.mergeSaveData(localData, cloudData);
        const localJson = JSON.stringify(window.app.normalizeData(localData));
        const mergedJson = JSON.stringify(mergedData);

        if (mergedJson !== localJson) {
            window.app.applyExternalData(mergedData, {
                notice: "已載入雲端存檔"
            });
        }

        if (JSON.stringify(mergedData) !== JSON.stringify(window.app.normalizeData(cloudData))) {
            await persistCloudData(user.uid, mergedData);
        }

        syncFailureNotified = false;
        lastSyncSucceeded = true;
        resetRetryBackoff();
        setStatus("雲端已同步", "success");

        setTimeout(() => {
            if (!syncInFlight && !queuedData) {
                setStatus("雲端已同步", "");
            }
        }, 5000);
        return true;
    } catch (error) {
        console.error(`Cloud save hydrate failed (Attempt ${retryCount + 1}):`, error);

        if (retryCount < MAX_HYDRATE_RETRIES && isRetriableError(error)) {
            setStatus("雲端連線重試中…", "busy");
            setTimeout(() => {
                void hydrateCloudSave(user, retryCount + 1);
            }, HYDRATE_RETRY_DELAY_MS);
            return false;
        }

        setStatus(getHydrateErrorStatus(error), "error");
        showMessage("雲端同步暫時未完成，本機進度已保留", "info");
        return false;
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

window.addEventListener("online", () => {
    if (activeUid && queuedData) {
        setStatus("網路已恢復，準備同步…", "busy");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            void flushSaveQueue();
        }, 800);
    }
});

window.addEventListener("offline", () => {
    if (activeUid) setStatus("目前離線，會在恢復連線後同步", "error");
});

const checkAuthInterval = setInterval(() => {
    if (ensureFirebase()) {
        clearInterval(checkAuthInterval);
        onAuthStateChanged(auth, async (user) => {
            clearTimeout(saveTimer);
            queuedData = null;
            requeueAfterSync = false;
            syncInFlight = false;
            resetRetryBackoff();

            if (!user) {
                activeUid = null;
                syncFailureNotified = false;
                lastSyncSucceeded = false;
                setStatus("未登入時僅保存在此裝置。");
                return;
            }

            await hydrateCloudSave(user);
        });
    }
}, 500);
