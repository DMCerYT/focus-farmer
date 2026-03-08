import { supabase } from './supabaseclient.js';

const coinText = document.getElementById('coin-count');
const pullBtn = document.getElementById('pull-btn');
const gachaResult = document.getElementById('gacha-result');
const eggList = document.getElementById('egg-list');
const petList = document.getElementById('pet-list');

let state = {
    coins: 0,
    sessions: 0,
};

const eggColors = {
    common: 'gray',
    rare: 'blue',
    epic: 'purple',
    legendary: 'gold'
};


const penguinColors = {
    common: 'gray',
    rare: 'blue',
    epic: 'purple',
    legendary: 'gold'
};

// Load latest player state from DB
export async function loadPlayerState(state) {
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) return;

        const userId = sessionData.session.user.id;

        const { data, error } = await supabase
            .from('playerstats')
            .select('coins, session_count')
            .eq('auth_id', userId)
            .single();

        if (error) {
            console.error('Error loading player stats:', error);
            return;
        }

        if (data) {
            state.coins = data.coins;
            state.sessions = data.session_count;
            coinText.textContent = state.coins;
        }
    } catch (err) {
        console.error('Failed to load player state:', err);
    }
}

// Perform a gacha pull
async function pullEgg() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;

    const userId = sessionData.session.user.id;

    await loadPlayerState(state); // Always refresh coins first

    if (state.coins < 10) {
        alert('Not enough coins!');
        return;
    }

    // Deduct 10 coins
    const { error: updateError } = await supabase
        .from('playerstats')
        .update({ coins: state.coins - 10 })
        .eq('auth_id', userId);

    if (updateError) {
        console.error('Error updating coins:', updateError);
        return;
    }

    // Random gacha logic
    const roll = Math.random();
    let eggType = 'common';
    if (roll > 0.95) eggType = 'legendary';
    else if (roll > 0.8) eggType = 'epic';
    else if (roll > 0.5) eggType = 'rare';

    gachaResult.textContent = `You pulled a ${eggType} egg!`;

    // Add egg to DB
    const { error: eggError } = await supabase
        .from('eggs')
        .insert({ auth_id: userId, egg_type: eggType, hatched: false });

    if (eggError) console.error('Error adding egg:', eggError);

    // Reload coins after pull
    await loadPlayerState(state);

    // Reload egg list
    loadEggs();
}

// Load eggs
async function loadEggs() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const userId = sessionData.session.user.id;

    const { data: eggs, error } = await supabase
        .from('eggs')
        .select('*')
        .eq('auth_id', userId);

    if (error) {
        console.error('Error loading eggs:', error);
        return;
    }

    eggList.innerHTML = '';

    eggs.forEach(egg => {
        const li = document.createElement('li');

        // Placeholder colored circle
        const eggSpan = document.createElement('span');
        eggSpan.textContent = '🥚'; // Egg emoji
        eggSpan.style.color = eggColors[egg.egg_type] || 'black';
        eggSpan.style.fontSize = '2rem';
        eggSpan.style.marginRight = '0.5rem';

        li.appendChild(eggSpan);
        li.appendChild(document.createTextNode(`${egg.egg_type} egg ${egg.hatched ? '(Hatched)' : ''}`));

        eggList.appendChild(li);
    });
}

// Hatch all eggs
async function hatchAllEggs() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const userId = sessionData.session.user.id;

    // Get all eggs for the user
    const { data: eggs, error: eggError } = await supabase
        .from('eggs')
        .select('*')
        .eq('auth_id', userId);

    if (eggError) {
        console.error('Error fetching eggs for hatch all:', eggError);
        return;
    }

    if (!eggs || eggs.length === 0) {
        alert('No eggs to hatch!');
        return;
    }

    // Hatch each egg sequentially
    for (const egg of eggs) {
        const color = penguinColors[egg.egg_type];

        // Add pet (penguin) to DB
        const { error: petError } = await supabase
            .from('pets')
            .insert({ auth_id: userId, color, rarity: egg.egg_type });

        if (petError) console.error('Error creating pet:', petError);

        // Remove egg from DB
        const { error: delError } = await supabase
            .from('eggs')
            .delete()
            .eq('id', egg.id);

        if (delError) console.error('Error deleting egg:', delError);
    }

    await loadEggs();
    await loadPets();

    alert(`${eggs.length} eggs hatched!`);
}


async function loadPets() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const userId = sessionData.session.user.id;

    const { data: pets, error } = await supabase
        .from('pets')
        .select('*')
        .eq('auth_id', userId);

    if (error) {
        console.error('Error loading pets:', error);
        return;
    }

    petList.innerHTML = '';

    pets.forEach(pet => {
        const li = document.createElement('li');

        // Colored penguin emoji placeholder
        const penguinSpan = document.createElement('span');
        penguinSpan.textContent = '🐧';
        penguinSpan.style.color = pet.color || 'black';
        penguinSpan.style.fontSize = '2rem';
        penguinSpan.style.marginRight = '0.5rem';

        li.appendChild(penguinSpan);
        li.appendChild(document.createTextNode(`${pet.rarity} penguin`));

        petList.appendChild(li);
    });
}


// Initialize game
async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    await loadPlayerState(state);
    await loadEggs();
    await loadPets()

    const hatchAllBtn = document.getElementById('hatch-all-btn');
    hatchAllBtn.onclick = hatchAllEggs;
}

pullBtn.onclick = pullEgg;

init();