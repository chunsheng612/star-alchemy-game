# Firebase 登入 + GitHub + Netlify 手把手指南

這份文件是照你目前這個專案寫的，不是泛用教學。

你的專案現在是：

- 純靜態網站
- 沒有 `npm` / `vite` / `webpack`
- 主入口是 [index.html](/Users/chunsheng/Desktop/【＋】ChunSheng/Game_克蘇魯/StarAlchemy/index.html)
- 遊戲邏輯在 [js/app.js](/Users/chunsheng/Desktop/【＋】ChunSheng/Game_克蘇魯/StarAlchemy/js/app.js)
- 目前存檔是 `localStorage`

所以最穩的做法是：

1. 先串 `Firebase Authentication`
2. 先把「登入 / 登出 / 顯示玩家資訊」做好
3. 等登入穩了，再把存檔同步到 `Cloud Firestore`

---

## 你做完這份文件後，會得到什麼

- 玩家可以用 Google 登入
- 登入後可以看到頭像、名字、Email
- 玩家重新整理頁面後，登入狀態會保留
- 網站可以放在 GitHub，交給 Netlify 自動部署
- 後續你可以再把遊戲存檔改成 Firebase 雲端存檔

---

## 先講一個很重要的觀念

`Firebase Web` 的 `apiKey` 不是傳統意義上的祕密金鑰。

官方文件有特別說明：

- Firebase API key 主要是用來識別專案，不是拿來做資料授權
- 真正的安全要靠 `Authentication`、`Firestore Security Rules`、`App Check`

所以你這個專案第一版，不需要為了「把 Firebase config 藏起來」而多做一套複雜 build 流程。

對你現在這種「純靜態 + GitHub + Netlify」專案，我建議：

- 第一版：直接用前端 config
- 第二版：再考慮用 Netlify build script 產生 config

---

## Step 1：建立 Firebase 專案

1. 打開 Firebase Console  
   [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. 按 `Add project`
3. 建一個新專案，例如：
   `star-alchemy-game`
4. Analytics 可以先關掉，之後要用再開
5. 進入專案後，按 `</>` 建立一個 `Web App`
6. App nickname 可以取：
   `star-alchemy-web`
7. 建立完成後，Firebase 會給你一段 config，像這樣：

```js
const firebaseConfig = {
  apiKey: "xxxx",
  authDomain: "xxxx.firebaseapp.com",
  projectId: "xxxx",
  storageBucket: "xxxx.firebasestorage.app",
  messagingSenderId: "xxxx",
  appId: "xxxx"
};
```

先把這段存起來，等等要貼進專案。

---

## Step 2：開啟登入功能

### 2-1 開啟 Google 登入

1. Firebase Console 左側進入 `Authentication`
2. 按 `Get started`
3. 進入 `Sign-in method`
4. 開啟 `Google`
5. 設定支援 Email
6. 按 `Save`

### 2-2 加入授權網域

這一步很重要，少做就會報 `auth/unauthorized-domain`。

到：

- `Authentication`
- `Settings`
- `Authorized domains`

把這些網域加進去：

- `localhost`
- 之後 Netlify 產生的 `你的站名.netlify.app`
- 你未來自己的自訂網域，例如 `game.yourdomain.com`

注意：

- Firebase 官方文件提到，`2025-04-28` 之後建立的新專案，`localhost` 不一定會自動在 authorized domains 裡面
- 所以本機測試時，如果登入報網域錯誤，先檢查這裡

---

## Step 3：先在專案裡新增 2 個檔案

請新增：

- `js/firebase-config.js`
- `js/firebase-auth.js`

### 3-1 `js/firebase-config.js`

把你剛剛從 Firebase Console 拿到的 config 貼進去：

```js
window.__FIREBASE_CONFIG__ = {
  apiKey: "你的 apiKey",
  authDomain: "你的 authDomain",
  projectId: "你的 projectId",
  storageBucket: "你的 storageBucket",
  messagingSenderId: "你的 messagingSenderId",
  appId: "你的 appId"
};
```

### 3-2 `js/firebase-auth.js`

這一份先做 Google 登入，對你這種手機遊戲頁比較合適。

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig) {
  throw new Error("Missing window.__FIREBASE_CONFIG__");
}

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
auth.languageCode = "zh-TW";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});

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
  return window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
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

    if (window.app) {
      window.app.currentUser = user;
    }
  } else {
    els.guest.classList.remove("hidden");
    els.user.classList.add("hidden");

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
  window.currentUser = user || null;
  updateAuthUI(user);
});
```

---

## Step 4：把登入 UI 插進首頁

打開 [index.html](/Users/chunsheng/Desktop/【＋】ChunSheng/Game_克蘇魯/StarAlchemy/index.html)，在首頁的 `.menu-buttons` 下面加這段：

```html
<div id="auth-card" class="hub-tip">
  <div id="auth-guest">
    <span>登入後可保留身份，下一步可再接雲端存檔。</span>
    <button id="btn-login-google" class="hub-tip-btn">使用 Google 登入</button>
  </div>

  <div id="auth-user" class="hidden">
    <div class="auth-user-row">
      <img id="auth-avatar" class="auth-avatar" src="assets/icons/potion_blue.png" alt="avatar">
      <div class="auth-user-meta">
        <strong id="auth-name">已登入玩家</strong>
        <span id="auth-email"></span>
      </div>
    </div>
    <button id="btn-logout" class="hub-tip-btn">登出</button>
  </div>
</div>
```

然後在 `</body>` 前，補上這三行 script：

```html
<script src="js/audio.js"></script>
<script src="js/app.js"></script>
<script src="js/firebase-config.js"></script>
<script type="module" src="js/firebase-auth.js"></script>
```

重點：

- `app.js` 要先載入
- `firebase-config.js` 要在 `firebase-auth.js` 前面
- `firebase-auth.js` 要用 `type="module"`

---

## Step 5：補一點首頁樣式

打開 [css/style.css](/Users/chunsheng/Desktop/【＋】ChunSheng/Game_克蘇魯/StarAlchemy/css/style.css)，加這段：

```css
.auth-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.auth-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.auth-user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  min-width: 0;
}

.auth-user-meta strong {
  font-size: 14px;
}

.auth-user-meta span {
  font-size: 12px;
  color: var(--color-text-dim);
  word-break: break-word;
}
```

---

## Step 6：本機測試

不要直接雙擊 `index.html` 用 `file://` 開。

請用本機 server：

```bash
cd /你的專案資料夾
python3 -m http.server 4173
```

然後打開：

[http://localhost:4173](http://localhost:4173)

如果你看到以下錯誤：

- `auth/unauthorized-domain`

代表你還沒把 `localhost` 加進 Firebase authorized domains。

---

## Step 7：推到 GitHub

如果你還沒建 repo，可以用：

```bash
git init
git branch -M main
git add .
git commit -m "Add Firebase login"
git remote add origin 你的 GitHub Repo URL
git push -u origin main
```

如果你已經有 repo，就正常：

```bash
git add .
git commit -m "Add Firebase login"
git push
```

---

## Step 8：把 GitHub repo 接到 Netlify

到 Netlify：

[https://app.netlify.com/](https://app.netlify.com/)

依序做：

1. `Add new project`
2. `Import an existing project`
3. 選 `GitHub`
4. 授權 Netlify 讀取你的 repo
5. 選你的 repo

這個專案是純靜態站，建議設定：

- Base directory：留空
- Build command：留空
- Publish directory：`.`

然後按 `Publish`

部署完成後，Netlify 會給你一個網址，例如：

```txt
https://star-alchemy-demo.netlify.app
```

---

## Step 9：把 Netlify 網址加回 Firebase Authorized Domains

這一步很多人會漏掉。

回 Firebase Console：

- `Authentication`
- `Settings`
- `Authorized domains`

新增：

- `star-alchemy-demo.netlify.app`

如果你之後再綁自訂網域，也要再加一次，例如：

- `game.example.com`

---

## Step 10：第二階段才做 Firestore 雲端存檔

你目前的遊戲存檔在 [js/app.js](/Users/chunsheng/Desktop/【＋】ChunSheng/Game_克蘇魯/StarAlchemy/js/app.js) 裡的 `loadData()` / `saveData()`。

我建議你先不要一開始就把存檔一起改掉，先做：

1. 登入成功
2. 登出成功
3. 重新整理後仍保持登入

都穩了，再把存檔搬去 Firestore。

### 10-1 Firestore 建議資料路徑

```txt
users/{uid}/game/save
```

### 10-2 Firestore 存檔範例

之後你可以在新的 `js/firebase-save.js` 寫這種邏輯：

```js
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const db = getFirestore(window.firebaseAuth.firebaseApp);

export async function loadCloudSave(uid) {
  const ref = doc(db, "users", uid, "game", "save");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudData(uid, data) {
  const ref = doc(db, "users", uid, "game", "save");
  await setDoc(ref, data, { merge: true });
}
```

### 10-3 Firestore 規則

最基本至少要做到「只能讀寫自己的存檔」：

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/game/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

這樣別人不能直接讀你的玩家資料。

---

## 我對你這個專案的實際建議順序

不要一次做太多，請照這個順序：

1. Firebase 專案建立
2. Google 登入打通
3. 本機登入成功
4. Netlify 部署成功
5. Netlify 網域加入 authorized domains
6. 線上登入成功
7. 最後再接 Firestore 存檔

這樣你比較不會同時卡在：

- Firebase 設定
- 網域授權
- JS 錯誤
- Netlify 部署
- Firestore 規則

---

## 常見錯誤排查

### 1. `auth/unauthorized-domain`

原因：

- 你的 `localhost` 或 `netlify.app` 網域沒有加進 Firebase Authorized Domains

修法：

- 到 `Authentication > Settings > Authorized domains` 補上

### 2. 手機上 Google popup 怪怪的

原因：

- Firebase 官方建議 mobile 比較適合 `signInWithRedirect`

修法：

- 我上面的 `firebase-auth.js` 已經幫你做成：
  - 桌面：`signInWithPopup`
  - 手機：`signInWithRedirect`

### 3. 部署後空白頁

原因通常是：

- script 順序錯
- `firebase-config.js` 沒載到
- `firebase-auth.js` 不是 `type="module"`

### 4. 登入成功但遊戲沒反應

原因：

- 你還沒有把登入狀態跟遊戲資料綁起來

目前這是正常的，因為第一版先做登入，不先改存檔。

---

## 官方文件

Firebase 官方：

- Add Firebase to a JavaScript project  
  [https://firebase.google.com/docs/web/setup](https://firebase.google.com/docs/web/setup)
- Alternative CDN setup for Firebase Web SDK  
  [https://firebase.google.com/docs/web/alt-setup](https://firebase.google.com/docs/web/alt-setup)
- Get started with Firebase Authentication on web  
  [https://firebase.google.com/docs/auth/web/start](https://firebase.google.com/docs/auth/web/start)
- Google sign-in for Firebase Authentication  
  [https://firebase.google.com/docs/auth/web/google-signin](https://firebase.google.com/docs/auth/web/google-signin)
- Firebase API keys explanation  
  [https://firebase.google.com/docs/projects/api-keys](https://firebase.google.com/docs/projects/api-keys)
- Firestore add / set document  
  [https://firebase.google.com/docs/firestore/manage-data/add-data](https://firebase.google.com/docs/firestore/manage-data/add-data)

Netlify 官方：

- Deploy from repository  
  [https://docs.netlify.com/start/quickstarts/deploy-from-repository/](https://docs.netlify.com/start/quickstarts/deploy-from-repository/)
- Netlify environment variables  
  [https://docs.netlify.com/build/environment-variables/get-started/](https://docs.netlify.com/build/environment-variables/get-started/)

---

## 我建議你下一步

如果你要我直接幫你做，我建議下一步是：

1. 我直接把 `Google 登入 UI + firebase-auth.js + firebase-config.js 範本` 實作進專案
2. 你只要把 Firebase config 貼進去
3. 等登入穩了，我再幫你做 `Firestore 雲端存檔`

這樣比你一次把登入和雲端存檔全部一起改，風險低很多。
