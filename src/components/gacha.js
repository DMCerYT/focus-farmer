const EGG_COST = 10;
const EGG_FRAME_SIZE = 96; // 32px sprite x3 scale

const rarityWeights = [
  { tier: 'common', weight: 50 },
  { tier: 'rare', weight: 30 },
  { tier: 'epic', weight: 15 },
  { tier: 'legendary', weight: 5 },
];

const eggSheetByTier = {
  common: './assets/egg_base_wobble.png',
  rare: './assets/egg_rare_wobble1.png',
  epic: './assets/egg_epic_wobble1.png',
  legendary: './assets/egg_legendary_wobble1.png',
};

const rewardByTier = {
  common: [
    { name: 'Smile and Wave Penguin', rarity: 'common', src: './assets/Piskel Penguin Wave_Kangadrew.gif' },
  ],
  rare: [
    { name: 'The Penguin with the Yellow Hat', rarity: 'rare', src: './assets/Piskel Penguin with a Yellow Hat.png' },
  ],
  epic: [
    { name: 'Matcha Latte Penguin', rarity: 'epic', src: './assets/Piskel Penguin with Matcha Latte v1.1.png' },
  ],
  legendary: [
    { name: 'Wizard Penguin', rarity: 'legendary', src: './assets/Piskel Wizard Penguin_03-07-2026.gif' },
    { name: 'Surfs Up Penguin', rarity: 'legendary', src: './assets/Piskel Penguin Surfer Bro WhiteAndGold_Kangadrew.png' },
  ],
};

const colorByRarity = {
  common: 'gray',
  rare: 'blue',
  epic: 'purple',
  legendary: 'gold',
};

const defaultVisualByTier = {
  common: './assets/Piskel Penguin Wave_Kangadrew.gif',
  rare: './assets/Piskel Penguin with a Yellow Hat.png',
  epic: './assets/Piskel Penguin with Matcha Latte v1.1.png',
  legendary: './assets/Piskel Wizard Penguin_03-07-2026.gif',
};

const tierOrder = ['legendary', 'epic', 'rare', 'common'];

const tierDisplayName = {
  common: 'Common Shelf',
  rare: 'Rare Shelf',
  epic: 'Epic Shelf',
  legendary: 'Legendary Shelf',
};

function pickTier() {
  const total = rarityWeights.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;

  for (const row of rarityWeights) {
    roll -= row.weight;
    if (roll <= 0) {
      return row.tier;
    }
  }

  return 'common';
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

  function resolvePetVisual(pet) {
  const name = String(pet?.name || '').toLowerCase();
  if (name.includes('surfs up') || name.includes('surfer')) {
    return './assets/Piskel Penguin Surfer Bro WhiteAndGold_Kangadrew.png';
  }
  if (name.includes('wizard')) {
    return './assets/Piskel Wizard Penguin_03-07-2026.gif';
  }
  if (name.includes('matcha')) {
    return './assets/Piskel Penguin with Matcha Latte v1.1.png';
  }
  if (name.includes('yellow hat')) {
    return './assets/Piskel Penguin with a Yellow Hat.png';
  }

  return defaultVisualByTier[pet?.rarity] || defaultVisualByTier.common;
}

function createShelfElement(tier, pets) {
  const section = document.createElement('section');
  section.className = 'shelf';

  const title = document.createElement('h4');
  title.className = `shelf-title ${tier}`;
  title.textContent = tierDisplayName[tier] || `${titleCase(tier)} Shelf`;
  section.appendChild(title);

  if (!pets || pets.length === 0) {
    const emptyText = document.createElement('p');
    emptyText.className = 'shelf-empty';
    emptyText.textContent = 'No penguins on this shelf yet.';
    section.appendChild(emptyText);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'gacha-list';
  pets.forEach((pet) => {
    const li = document.createElement('li');
    li.className = 'penguin-item';

    const img = document.createElement('img');
    img.className = 'penguin-thumb';
    img.src = resolvePetVisual(pet);
    img.alt = pet.name || 'Penguin';

    const name = pet.name || 'Penguin';
    const tierLabel = titleCase(pet.rarity || 'common');
    const text = document.createElement('span');
    text.textContent = `${name} • ${tierLabel}`;

    li.appendChild(img);
    li.appendChild(text);
    list.appendChild(li);
  });

  section.appendChild(list);
  return section;
}

export function createGachaController({ els, state, updateStats, getSupabaseClient }) {
  let eggAnimId = null;

  function setResult(text) {
    if (els.gachaResult) {
      els.gachaResult.textContent = text;
    }
  }

  function syncCoins() {
    if (els.gachaCoinCount) {
      els.gachaCoinCount.textContent = String(state.coins);
    }
  }

  function openGacha() {
    syncCoins();
    els.gachaModal?.classList.remove('hidden');
  }

  function closeGacha() {
    els.gachaModal?.classList.add('hidden');
  }

  function openPenguins() {
    void loadPets();
    els.penguinModal?.classList.remove('hidden');
  }

  function closePenguins() {
    els.penguinModal?.classList.add('hidden');
  }

  function resetHatchStage() {
    if (eggAnimId) {
      clearInterval(eggAnimId);
      eggAnimId = null;
    }

    if (els.hatchEgg) {
      els.hatchEgg.classList.remove('crack');
      els.hatchEgg.style.backgroundImage = 'none';
      els.hatchEgg.style.backgroundPosition = '0 0';
      els.hatchEgg.style.backgroundSize = '0 0';
    }

    if (els.hatchPenguin) {
      els.hatchPenguin.classList.remove('revealed');
      els.hatchPenguin.src = '';
    }
  }

  function playEggAnimation(tier, rewardSrc) {
    resetHatchStage();

    const eggSheet = eggSheetByTier[tier] || eggSheetByTier.common;
    if (!els.hatchEgg || !els.hatchPenguin) {
      return Promise.resolve();
    }

    els.hatchEgg.style.backgroundImage = `url(${eggSheet})`;
    els.hatchEgg.style.backgroundSize = `${EGG_FRAME_SIZE * 3}px ${EGG_FRAME_SIZE}px`;

    let frame = 0;
    eggAnimId = setInterval(() => {
      frame = (frame + 1) % 3;
      els.hatchEgg.style.backgroundPosition = `-${frame * EGG_FRAME_SIZE}px 0`;
    }, 140);

    return new Promise((resolve) => {
      setTimeout(() => {
        if (eggAnimId) {
          clearInterval(eggAnimId);
          eggAnimId = null;
        }

        els.hatchPenguin.src = rewardSrc;
        els.hatchPenguin.classList.add('revealed');
        els.hatchEgg.classList.add('crack');
        resolve();
      }, 1200);
    });
  }

  async function getUserId() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  }

  async function loadPets() {
    const supabase = getSupabaseClient();
    const userId = await getUserId();
    if (!supabase || !userId || !els.petList) {
      return;
    }

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('auth_id', userId)
      .order('id', { ascending: false });

    if (error) {
      return;
    }

    els.petList.innerHTML = '';
    const grouped = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };

    (data || []).forEach((pet) => {
      const tier = String(pet?.rarity || 'common').toLowerCase();
      if (grouped[tier]) {
        grouped[tier].push(pet);
      } else {
        grouped.common.push(pet);
      }
    });

    tierOrder.forEach((tier) => {
      els.petList.appendChild(createShelfElement(tier, grouped[tier]));
    });
  }

  async function pullEgg() {
    const supabase = getSupabaseClient();
    const userId = await getUserId();
    if (!supabase || !userId) {
      setResult('Please log in first.');
      return;
    }

    if (state.coins < EGG_COST) {
      setResult('Not enough coins to pull an egg.');
      return;
    }

    const tier = pickTier();
    const reward = randomFrom(rewardByTier[tier] || rewardByTier.common);

    state.coins -= EGG_COST;
    updateStats();
    syncCoins();

    await playEggAnimation(tier, reward.src);

    // Try richer payload first; if schema doesn't support it, fallback.
    let { error } = await supabase.from('pets').insert({
      auth_id: userId,
      rarity: reward.rarity,
      color: colorByRarity[reward.rarity] || 'gray',
      name: reward.name,
    });

    if (error && /name|column/i.test(error.message || '')) {
      const fallback = await supabase.from('pets').insert({
        auth_id: userId,
        rarity: reward.rarity,
        color: colorByRarity[reward.rarity] || 'gray',
      });
      error = fallback.error;
    }

    if (error) {
      state.coins += EGG_COST;
      updateStats();
      syncCoins();
      setResult(`Hatch failed to save (${error.message}). Your coins were refunded.`);
      return;
    }

    setResult(`You hatched a ${titleCase(tier)} ${reward.name}`);
    await loadPets();
  }

  function init() {
    els.openGachaBtn?.addEventListener('click', openGacha);
    els.closeGachaBtn?.addEventListener('click', closeGacha);
    els.viewPenguinsBtn?.addEventListener('click', openPenguins);
    els.closePenguinsBtn?.addEventListener('click', closePenguins);
    els.closePenguinsXBtn?.addEventListener('click', closePenguins);

    els.penguinModal?.addEventListener('click', (event) => {
      if (event.target === els.penguinModal) {
        closePenguins();
      }
    });

    els.pullBtn?.addEventListener('click', () => {
      void pullEgg();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (els.penguinModal && !els.penguinModal.classList.contains('hidden')) {
        closePenguins();
      }
      if (els.gachaModal && !els.gachaModal.classList.contains('hidden')) {
        closeGacha();
      }
    });

    window.addEventListener('focusfarmer:auth-changed', () => {
      syncCoins();
      void loadPets();
    });

    syncCoins();
    void loadPets();
  }

  return {
    init,
    syncCoins,
  };
}
