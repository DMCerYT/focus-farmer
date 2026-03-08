const SUPABASE_URL = 'https://umgwfemgagdbwdamvlnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZ3dmZW1nYWdkYndkYW12bG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDI5NzYsImV4cCI6MjA4ODQ3ODk3Nn0._HQQr4TNPQF0Nk3G5YIax2j1tSrL0FJ4tjLN2UMr86M';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.focusFarmerSupabase = supabase;

const welcomeScreen = document.getElementById('welcome-screen');
const loginScreen = document.getElementById('login-screen');
const signupScreen = document.getElementById('signup-screen');
const titleSplashScreen = document.getElementById('title-splash-screen');
const wholeApp = document.getElementById('whole-app');

const startAuthBtn = document.getElementById('start-auth-btn');
const welcomeTitleArt = document.getElementById('welcome-title-art');
const loginTitleArt = document.getElementById('login-title-art');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const authScreens = [welcomeScreen, loginScreen, signupScreen, titleSplashScreen].filter(Boolean);
let isStartTransitioning = false;

function emitAuthChanged(session) {
  window.dispatchEvent(new CustomEvent('focusfarmer:auth-changed', { detail: { session } }));
}

function hideAuthScreens() {
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (signupScreen) signupScreen.classList.add('hidden');
  if (titleSplashScreen) titleSplashScreen.classList.add('hidden');
}

function waitForAnimation(animation) {
  return new Promise((resolve) => {
    if (!animation) {
      resolve();
      return;
    }
    animation.onfinish = resolve;
    animation.oncancel = resolve;
  });
}

function transitionTo(targetScreen) {
  const active = authScreens.find((screen) => !screen.classList.contains('hidden'));

  if (active && active !== targetScreen) {
    const fadeOut = active.animate(
      [
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: 'translateY(8px)' },
      ],
      { duration: 220, easing: 'ease' }
    );
    fadeOut.onfinish = () => {
      active.classList.add('hidden');
    };
  }

  if (!targetScreen) {
    return;
  }

  targetScreen.classList.remove('hidden');
  targetScreen.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0px)' },
    ],
    { duration: 260, easing: 'ease' }
  );
}

function fadeTo(targetScreen) {
  const active = authScreens.find((screen) => !screen.classList.contains('hidden'));
  if (!targetScreen) {
    return;
  }

  if (active && active !== targetScreen) {
    active.style.opacity = '1';
    const fadeOut = active.animate(
      [
        { opacity: 1 },
        { opacity: 0 },
      ],
      { duration: 180, easing: 'ease' }
    );
    fadeOut.onfinish = () => {
      active.classList.add('hidden');
      active.style.opacity = '';
    };
  }

  targetScreen.classList.remove('hidden');
  targetScreen.style.opacity = '1';
  targetScreen.animate(
    [
      { opacity: 0 },
      { opacity: 1 },
    ],
    { duration: 200, easing: 'ease' }
  );
}

function measureLoginTitleRect() {
  if (!loginScreen || !loginTitleArt) {
    return null;
  }

  const states = authScreens.map((screen) => ({
    screen,
    hidden: screen.classList.contains('hidden'),
    visibility: screen.style.visibility,
    pointerEvents: screen.style.pointerEvents,
  }));

  authScreens.forEach((screen) => screen.classList.add('hidden'));
  loginScreen.classList.remove('hidden');

  loginScreen.style.visibility = 'hidden';
  loginScreen.style.pointerEvents = 'none';
  const rect = loginTitleArt.getBoundingClientRect();
  states.forEach((entry) => {
    entry.screen.style.visibility = entry.visibility;
    entry.screen.style.pointerEvents = entry.pointerEvents;
    entry.screen.classList.toggle('hidden', entry.hidden);
  });

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return rect;
}

async function animateStartToLoginTitle() {
  if (!welcomeTitleArt || !loginTitleArt) {
    return;
  }

  const fromRect = welcomeTitleArt.getBoundingClientRect();
  const toRect = measureLoginTitleRect();
  if (!toRect || fromRect.width <= 0 || fromRect.height <= 0) {
    return;
  }

  const clone = welcomeTitleArt.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.left = `${fromRect.left}px`;
  clone.style.top = `${fromRect.top}px`;
  clone.style.width = `${fromRect.width}px`;
  clone.style.height = `${fromRect.height}px`;
  clone.style.margin = '0';
  clone.style.zIndex = '60';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);

  welcomeTitleArt.style.opacity = '0';
  loginTitleArt.style.opacity = '0';

  try {
    const animation = clone.animate(
      [
        {
          left: `${fromRect.left}px`,
          top: `${fromRect.top}px`,
          width: `${fromRect.width}px`,
          height: `${fromRect.height}px`,
          opacity: 1,
        },
        {
          left: `${toRect.left}px`,
          top: `${toRect.top}px`,
          width: `${toRect.width}px`,
          height: `${toRect.height}px`,
          opacity: 1,
        },
      ],
      {
        duration: 460,
        easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)',
        fill: 'forwards',
      }
    );
    await waitForAnimation(animation);
  } finally {
    clone.remove();
    welcomeTitleArt.style.opacity = '';
    loginTitleArt.style.opacity = '';
  }
}

function showWelcome() {
  transitionTo(welcomeScreen);
  if (wholeApp) wholeApp.classList.add('hidden');
}

function showLogin() {
  transitionTo(loginScreen);
  if (wholeApp) wholeApp.classList.add('hidden');
}

async function showTitleSplash(onComplete) {
  if (!titleSplashScreen) {
    onComplete();
    return;
  }

  hideAuthScreens();
  if (wholeApp) wholeApp.classList.add('hidden');
  titleSplashScreen.classList.remove('hidden');
  titleSplashScreen.style.opacity = '0';
  titleSplashScreen.style.transform = 'translateY(10px)';

  const fadeIn = titleSplashScreen.animate(
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0px)' },
    ],
    { duration: 320, easing: 'ease-out', fill: 'forwards' }
  );
  await waitForAnimation(fadeIn);
  await new Promise((resolve) => setTimeout(resolve, 760));

  const fadeOut = titleSplashScreen.animate(
    [
      { opacity: 1, transform: 'translateY(0px)' },
      { opacity: 0, transform: 'translateY(-8px)' },
    ],
    { duration: 280, easing: 'ease-in', fill: 'forwards' }
  );
  await waitForAnimation(fadeOut);
  titleSplashScreen.style.opacity = '';
  titleSplashScreen.style.transform = '';
  titleSplashScreen.classList.add('hidden');

  if (typeof onComplete === 'function') {
    onComplete();
  }
}

function startGame() {
  hideAuthScreens();
  if (wholeApp) wholeApp.classList.remove('hidden');
  wholeApp.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0px)' },
    ],
    { duration: 280, easing: 'ease-out' }
  );
}

async function signup() {
  const email = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert(error.message);
    return;
  }

  // Keep flow explicit: signup splash, then user returns to login.
  showTitleSplash(() => {
    alert('Account created. Please verify your email, then login.');
    if (signupScreen) signupScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
  });
}

async function login() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert(error.message);
    return;
  }

  emitAuthChanged(data?.session || null);
  showTitleSplash(startGame);
}

async function logout() {
  const shouldLogout = window.confirm('Are you sure you want to log out? Your progress is saved, and you can log back in anytime.');
  if (!shouldLogout) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    alert(error.message);
    return;
  }

  if (wholeApp) wholeApp.classList.add('hidden');
  showWelcome();
  emitAuthChanged(null);
}

async function onStartAuthClick() {
  if (isStartTransitioning) {
    return;
  }
  isStartTransitioning = true;
  if (startAuthBtn) {
    startAuthBtn.disabled = true;
  }

  try {
    await animateStartToLoginTitle();
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (wholeApp) wholeApp.classList.add('hidden');
    loginScreen.style.opacity = '1';
    loginScreen.style.transform = 'none';
    loginScreen?.animate(
      [
        { transform: 'translateY(8px)' },
        { transform: 'translateY(0px)' },
      ],
      { duration: 260, easing: 'ease-out' }
    );
  } catch {
    showLogin();
  } finally {
    isStartTransitioning = false;
    if (startAuthBtn) {
      startAuthBtn.disabled = false;
    }
  }
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  emitAuthChanged(data?.session || null);
  if (data?.session) {
    startGame();
  } else {
    showWelcome();
  }
}

if (startAuthBtn) startAuthBtn.addEventListener('click', () => {
  void onStartAuthClick();
});
if (loginForm) loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void login();
});
if (signupForm) signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void signup();
});
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (showSignupBtn) {
  showSignupBtn.addEventListener('click', () => {
    fadeTo(signupScreen);
  });
}
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', () => {
    fadeTo(loginScreen);
    if (wholeApp) wholeApp.classList.add('hidden');
  });
}

void checkSession();
