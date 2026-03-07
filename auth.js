
const SUPABASE_URL = "https://umgwfemgagdbwdamvlnw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZ3dmZW1nYWdkYndkYW12bG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDI5NzYsImV4cCI6MjA4ODQ3ODk3Nn0._HQQr4TNPQF0Nk3G5YIax2j1tSrL0FJ4tjLN2UMr86M";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

if (loginBtn) loginBtn.onclick = login;
if (signupBtn) signupBtn.onclick = signup;
if (logoutBtn) logoutBtn.onclick = logout;

// Signup function
async function signup() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        alert(error.message);
    } else {
        alert("Account created! Now login.");
    }
}


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


async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("whole-app").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
}

// Start game / show game screen
function startGame() {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("whole-app").classList.remove("hidden");
}

// Check session on page load
async function checkSession() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
        startGame();
    }
}

// Run session check
checkSession();