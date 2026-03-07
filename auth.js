
const SUPABASE_URL = "https://umgwfemgagdbwdamvlnw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZ3dmZW1nYWdkYndkYW12bG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDI5NzYsImV4cCI6MjA4ODQ3ODk3Nn0._HQQr4TNPQF0Nk3G5YIax2j1tSrL0FJ4tjLN2UMr86M"; // replace with your anon key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("login-screen");
const signupScreen = document.getElementById("signup-screen");
const wholeApp = document.getElementById("whole-app");

const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const showSignupBtn = document.getElementById("show-signup-btn");
const showLoginBtn = document.getElementById("show-login-btn");

// Event listeners
if (loginBtn) loginBtn.onclick = login;
if (signupBtn) signupBtn.onclick = signup;
if (logoutBtn) logoutBtn.onclick = logout;
if (showSignupBtn) showSignupBtn.onclick = () => {
    loginScreen.classList.add("hidden");
    signupScreen.classList.remove("hidden");
};
if (showLoginBtn) showLoginBtn.onclick = () => {
    signupScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
};

// Signup function
async function signup() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        alert(error.message);
    } else {
        alert("Account created! Please login.");
        signupScreen.classList.add("hidden");
        loginScreen.classList.remove("hidden");
    }
}

// Login function
async function login() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert(error.message);
        return;
    }
    startGame();
}

// Logout function
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert(error.message);
        return;
    }
    wholeApp.classList.add("hidden");
    loginScreen.classList.remove("hidden");
}

// Show the game screen
function startGame() {
    loginScreen.classList.add("hidden");
    signupScreen.classList.add("hidden");
    wholeApp.classList.remove("hidden");
}

// Check session on page load
async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) startGame();
}

checkSession();