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
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');

function emitAuthChanged(session) {
  window.dispatchEvent(new CustomEvent('focusfarmer:auth-changed', { detail: { session } }));
}

function hideAuthScreens() {
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (signupScreen) signupScreen.classList.add('hidden');
  if (titleSplashScreen) titleSplashScreen.classList.add('hidden');
}

function showWelcome() {
  hideAuthScreens();
  if (wholeApp) wholeApp.classList.add('hidden');
  if (welcomeScreen) welcomeScreen.classList.remove('hidden');
}

function showLogin() {
  hideAuthScreens();
  if (wholeApp) wholeApp.classList.add('hidden');
  if (loginScreen) loginScreen.classList.remove('hidden');
}

function showTitleSplash(onComplete) {
  if (!titleSplashScreen) {
    onComplete();
    return;
  }

  hideAuthScreens();
  if (wholeApp) wholeApp.classList.add('hidden');
  titleSplashScreen.classList.remove('hidden');

  setTimeout(() => {
    titleSplashScreen.classList.add('hidden');
    onComplete();
  }, 1400);
}

function startGame() {
  hideAuthScreens();
  if (wholeApp) wholeApp.classList.remove('hidden');
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
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert(error.message);
    return;
  }

  if (wholeApp) wholeApp.classList.add('hidden');
  showWelcome();
  emitAuthChanged(null);
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

if (startAuthBtn) startAuthBtn.addEventListener('click', showLogin);
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
    hideAuthScreens();
    if (signupScreen) signupScreen.classList.remove('hidden');
  });
}
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', showLogin);
}

void checkSession();
