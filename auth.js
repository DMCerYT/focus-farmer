// auth.js
import { supabase } from "./supabaseclient.js"; // import Supabase client

const loginBtn = document.getElementById("login-btn");
const wholeApp = document.getElementById("whole-app");

// Function to update login/logout button dynamically
async function updateLoginButton() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (user) {
        // User is logged in → show Logout button
        loginBtn.textContent = "Logout";
        loginBtn.onclick = async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                alert(error.message);
            } else {
                // Reload page to reset state
                window.location.reload();
            }
        };
        // Optionally show the game
    } else {
        // User is not logged in → show Login button
        loginBtn.textContent = "Login";
        loginBtn.onclick = () => {
            window.location.href = "login.html";
        };
        // Hide game until login
    }
}

// Initialize on page load
updateLoginButton();

// Optional: reactively update button if auth state changes
supabase.auth.onAuthStateChange((_event, _session) => {
    updateLoginButton();
});