import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFaRykC5-I3Cz62-sOCAqtxUB6f8Ho2Lo",
  authDomain: "pushynote.firebaseapp.com",
  projectId: "pushynote",
  storageBucket: "pushynote.appspot.com",
  messagingSenderId: "979064593610",
  appId: "1:979064593610:web:9e8bc87c1350f9610a2833",
  measurementId: "G-2LPLF1Q02D"
};

const app = initializeApp(firebaseConfig);
const fcmMessaging = getMessaging(app);

async function getFCMToken(registration) {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log("getFCMToken() 호출");

      // 동기적으로 FCM 토큰을 클라이언트에서 가져오기
      let fcmToken = getFcmTokenFromClient();
      // console.log("getFcmTokenFromClient : ", fcmToken);
      // console.log(fcmToken !== null)
      // console.log(fcmToken !== 'undefined')
      // console.log(fcmToken && fcmToken !== 'undefined')

      // 토큰이 이미 있다면 resolve로 반환
      if (fcmToken !== null && fcmToken !== 'undefined') return resolve(fcmToken);

      // console.log("vapidKey로 얻자")

      // 비동기적으로 FCM 토큰을 서버에서 가져오기
      try {
        fcmToken = await getToken(fcmMessaging, {
          vapidKey: "BN6zxgLtX3hjfUYlVITohygUePdoq4yndcquJxlxk5ZC3ocbpAVFt8Gf2w729vWPRhmvxq0zZVIsQ1bhSCq6hk8",
          serviceWorkerRegistration: registration
        });
      } catch (error) {
        // console.log("getToken Error : ", error);
        // console.log("==== getToken 재시도 ====")
        fcmToken = await getToken(fcmMessaging, {
          vapidKey: "BN6zxgLtX3hjfUYlVITohygUePdoq4yndcquJxlxk5ZC3ocbpAVFt8Gf2w729vWPRhmvxq0zZVIsQ1bhSCq6hk8",
          serviceWorkerRegistration: registration
        });
      }

      // console.log("서버로부터 가져온 FCM Token : ", fcmToken);
      resolve(fcmToken);
    } catch (error) {
      console.error("FCM Token fetch error:", error);
      reject(error);
    }
  });
}

function getFcmTokenFromClient() {
  let fcmToken = localStorage.getItem('webapp_fcm_token');
  if (!fcmToken) {
    const cookie = document.cookie.match('(^|;) ?webapp_fcm_token=([^;]*)(;|$)');
    if (cookie) {
      fcmToken = cookie[2];
    }

  }
  return fcmToken;
}

function setFcmToken(fcmToken) {
  localStorage.setItem('webapp_fcm_token', fcmToken);
  document.cookie = `webapp_fcm_token=${fcmToken}; path=/`;
}

function deleteFcmToken() {
  localStorage.removeItem('webapp_fcm_token');
  document.cookie = 'webapp_fcm_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function setUUID(uuid) {
  localStorage.setItem('webapp_uuid', uuid);
  document.cookie = `webapp_uuid=${uuid}; path=/`;
}

function getUUID() {
  let uuid = localStorage.getItem('webapp_uuid');
  if (!uuid) {
    const cookie = document.cookie.match('(^|;) ?webapp_uuid=([^;]*)(;|$)');
    if (cookie) {
      uuid = cookie[2];
    }
  }
  return uuid;
}

function deleteUUID() {
  localStorage.removeItem('webapp_uuid');
  document.cookie = 'webapp_uuid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function generateUUID() {
  let d = new Date().getTime();
  let d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** FCM 토큰 저장 */
function sendTokenToServer(token) {
  // console.log("sendTokenToServer() 호출");
  const uuid = generateUUID();
  const userAgent = navigator.userAgent;
  const domain = `${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;

  fetch('https://pushynote.com/api/fcm/regist-fcm-token', {
    method: 'POST',
    body: JSON.stringify({
      uuid,
      token,
      userAgent,
      domain,
    })
  })
    .then((res) => res.json())
    .then((json) => {
      // console.log("sendTokenToServer() 성공 : ", json);
      const { isSubscribeSuccess, isTokenSaveSuccess } = json.data;

      if (!isTokenSaveSuccess) {
        alert('[토큰 저장 실패]');
        return;
      }

      if (!isSubscribeSuccess) {
        alert('[주제 구독 실패]');
        return;
      }

      setUUID(uuid);
      setFcmToken(token);
      saveAskedHistory();
    })
}

/** FCM 토큰 제거 */
function deleteTokenInServer(token) {
  const uuid = getUUID();
  fetch('https://pushynote.com/delete_fcm_token.php', {
    method: 'POST',
    body: JSON.stringify({
      token,
      uuid,
    })
  }).then((res) => {
    const json = JSON.parse(res);
    const unsubscribe_result = JSON.parse(json.unsubscribe_result);
    const token_delete_result = JSON.parse(json.token_delete_result);

    if (token_delete_result.result !== 'success') {
      // console.log('[토큰 저장 실패] ', token_delete_result.message);
      return;
    }

    if (unsubscribe_result.successCount === 0) {
      // console.log('[주제 구독 실패] ', unsubscribe_result);
      return;
    }

    deleteFcmToken();
    deleteUUID();
  })
}

// 서버에 토큰 삭제 요청
function unsubscribeFCM() {
  getFCMToken().then((fcmToken) => {
    if (fcmToken) {
      deleteTokenInServer(fcmToken);
    }
  }).catch((e) => {
    alert("getFCMToken() Error : " + JSON.stringify(e))
  });
}

function saveAskedHistory() {
  var now = new Date();
  var expire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 7일 뒤 만료
  document.cookie = 'notificationAsked=true; expires=' + expire.toUTCString() + '; path=/';
  localStorage.setItem('webapp_first_launch', 'true');
}

function getAskedHistory() {
  const localStorageValue = localStorage.getItem('webapp_first_launch');
  const cookieValue = getCookie('notificationAsked');

  if (localStorageValue === 'true' || cookieValue === 'true') {
    return 'true';
  }
  return null;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function isPushNotificationSupported() {
  if (!"serviceWorker" in navigator) {
    // console.log("서비스 워커 미지원 환경 1");
    alert("이런! 푸시 알림 미지원 환경이에요. (1)")
    saveAskedHistory();
    return false;
  }

  if (!"pushManager" in navigator) {
    // console.log("서비스 워커 미지원 환경 2");
    alert("이런! 푸시 알림 미지원 환경이에요. (2)")
    saveAskedHistory();
    return false;
  }

  return true;
}

function registFcmToken(registration) {
  getFCMToken(registration).then((fcmToken) => {
    // console.log("getFCMToken : ", fcmToken);
    if (fcmToken) {
      sendTokenToServer(fcmToken);
    }
  });
}

// UUID로 등록된 FCM 토큰이 있는지 체크해서 없으면 FCM 토큰 등록하기
function registerFcmTokenIfNotExists(registration) {
  // console.log("registerFcmTokenIfNotExists() 호출");
  const uuid = getUUID();

  if (!uuid || uuid === 'undefined') {
    // console.log("registFcmToken()");
    registFcmToken(registration);
    return;
  }

  checkFcmTokenExist(uuid)
    .then((json) => {
      // console.log("checkFcmTokenExist", json);
      const { code } = json;
      if (code == 404) {
        registFcmToken(registration);
      }
    })
}

function checkFcmTokenExist(uuid) {
  return new Promise((resolve, reject) => {
    fetch('https://pushynote.com/api/fcm/check-fcm-token', {
      method: 'POST',
      body: JSON.stringify({
        uuid
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        // console.log("FCM 토큰 체크 성공 : " + json);
        resolve(json); // 서버 응답을 반환
      }).catch((err) => {
        // console.log("FCM 토큰 체크 에러 : " + err);
        reject(err); // 에러를 반환
      })
  });
}

async function registServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw');

    registration.onupdatefound = () => {
      const newWorker = registration.installing;

      newWorker.onstatechange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      };
    };

    // console.log("registration : ", registration);
    if (isPushNotificationSupported()) {
      // console.log("isPushNotificationSupported : ", true);
      registerFcmTokenIfNotExists(registration);
    } else {
      // console.log("isPushNotificationSupported : ", false);
    }
  } catch (error) {
    console.error("서비스 워커 등록 실패:", error);
  }
}

function requestPermission() {
  Notification.requestPermission()
    .then(function (result) {
      if (result !== 'granted') {
        alert(`앗, 알림이 허용되지 않았어요!\n\n(모바일) 알림 차단 해제\n* 안드로이드 : 5.0 버전 이상\n* iOS : 웹 사이트 홈화면에 추가, 16.4 버전 이상\n\n(PC) 시크릿 모드 해제, 마이페이지 > 푸시 알림 체크`);
        return;
      }
      registServiceWorker();
    })
    .catch(function (error) {
      console.error("알림 권한 요청 에러:", error);
    });
}

// 알림 권한 요청 모달
function getToastModalHTML() {
  return `
      <div id="requestPermissionDialog" style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; position: fixed;  bottom:40px; left:50%; transform: translate(calc(-50% - 20px), 20px); opacity:0; width:100%;  max-width:calc(100vw - 80px);  margin: 0 20px;  padding:24px;  border-radius: 30px;  background-color: white;  box-shadow:0px 5px 15px rgba(0, 50, 100, 0.15); transition: all .25s ease-out;">
        <p style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; font-size: 16px; font-weight:600; padding-bottom: 20px;">
          이 웹사이트에서 알림을 보내는 것을 허용할까요?
        </p>
        <div style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; display: flex; align-items: center; margin-top: 20px; gap:10px;">
          <button style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; width:100%; background: none; color: #007bff; border: none; padding: 10px 20px; border-radius: 6px; font-size:16px; font-weight:600; cursor: pointer;">허용 안 함</button>
          <span style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; display: block; width:1px; height:20px; background-color: #ced4da;"></span>
          <button style="font-family:SF Pro KR,SF Pro Display,SF Pro Icons,-apple-system,BlinkMacSystemFont,Basier Square,Apple SD Gothic Neo,Roboto,Noto Sans KR,Noto Sans,Helvetica Neue,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji; width:100%; color: #495057; background: none; border: none; padding: 10px 20px; border-radius: 6px; font-size:16px; font-weight:600; cursor: pointer;">허용</button>
        </div>
      </div>
    `;
}

function isMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // 모바일 기기 패턴
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Opera Mini/i,
    /IEMobile/i,
    /Mobile/i
  ];

  // 1. userAgent로 체크
  const isMobileUserAgent = mobilePatterns.some((pattern) => pattern.test(userAgent));

  // 2. 미디어 쿼리로 화면 크기 체크
  const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;

  // 3. 터치 이벤트로 체크
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

  // 이 세 가지 조건 중 하나라도 true면 모바일로 간주
  return isMobileUserAgent || isSmallScreen || isTouchDevice;
}

function initDialog() {
  const toastModal = document.createElement('div');
  toastModal.innerHTML = getToastModalHTML();
  document.body.appendChild(toastModal);

  showDialog();

  toastModal.querySelector('button:nth-child(1)').addEventListener('click', () => {
    saveAskedHistory();
    hideDialog();
  });

  toastModal.querySelector('button:nth-child(3)').addEventListener('click', () => {
    requestPermission();
    saveAskedHistory();
    hideDialog();
  });
}

function showDialog() {
  if (getAskedHistory() === 'true') return;
  const element = document.getElementById('requestPermissionDialog');

  setTimeout(() => {
    element.style.opacity = 1;
    element.style.transform = 'translate(calc(-50% - 20px), 0px)';
  }, 100);
}

function hideDialog() {
  const element = document.getElementById('requestPermissionDialog');

  element.style.opacity = 0;
  element.style.transform = 'translate(calc(-50% - 20px), 20px)';

  setTimeout(() => {
    document.body.removeChild(element);
  }, 250);
}

setTimeout(() => {
  if (isMobile()) {
    initDialog();
    // console.log("initDialog")
  } else {
    requestPermission();
    // console.log("requestPermission")
  }
}, 500);