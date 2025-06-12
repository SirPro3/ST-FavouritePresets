import { t } from '../../../i18n.js';
import { main_api } from '../../../../script.js';

const path = 'third-party/Extension-FavoriteButton';

let isUpdating = false;
let originalOrder = [];

/**
 * Checks if the current API is for chat completions.
 * @returns {boolean}
 */
function isChatCompletion() {
    // This logic is based on the reference extension.
    return main_api === 'openai';
}

/**
 * Retrieves the list of favorite presets from localStorage.
 * @returns {string[]}
 */
function getFavoritePresets() {
    return JSON.parse(localStorage.getItem('favoritePresets')) || [];
}

/**
 * Saves the list of favorite presets to localStorage.
 * @param {string[]} presets
 */
function saveFavoritePresets(presets) {
    localStorage.setItem('favoritePresets', JSON.stringify(presets));
}

/**
 * Updates the favorite button's icon and title based on the preset's status.
 * @param {HTMLElement} button The favorite button element.
 * @param {string} presetName The name of the currently selected preset.
 */
function updateFavoriteButtonIcon(button, presetName) {
    const icon = button.querySelector('i');
    const favorites = getFavoritePresets();

    if (favorites.includes(presetName)) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        button.title = t`Remove from favorites`;
    } else {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
        button.title = t`Add to favorites`;
    }
}

/**
 * Reorders the preset dropdown to show favorites at the top.
 * @param {HTMLSelectElement} presetDropdown
 */
function updatePresetOrder(presetDropdown) {
    const selectedValue = presetDropdown.value;
    const favorites = getFavoritePresets();
    const options = Array.from(presetDropdown.options);
    const favoriteOptions = [];
    const otherOptions = [];

    if (originalOrder.length === 0) {
        originalOrder = options.map(opt => opt.text);
    }

    for (const option of options) {
        if (favorites.includes(option.text)) {
            favoriteOptions.push(option);
        } else {
            otherOptions.push(option);
        }
    }

    presetDropdown.innerHTML = '';

    const favoritesGroup = document.createElement('optgroup');
    favoritesGroup.label = 'Favorites';
    for (const option of favoriteOptions) {
        favoritesGroup.appendChild(option);
    }

    const presetsGroup = document.createElement('optgroup');
    presetsGroup.label = 'Presets';
    otherOptions.sort((a, b) => originalOrder.indexOf(a.text) - originalOrder.indexOf(b.text));
    for (const option of otherOptions) {
        presetsGroup.appendChild(option);
    }

    if (favoriteOptions.length > 0) {
        presetDropdown.appendChild(favoritesGroup);
    }
    
    presetDropdown.appendChild(presetsGroup);

    if (Array.from(presetDropdown.options).some(option => option.value === selectedValue)) {
        presetDropdown.value = selectedValue;
    }
}

/**
 * Injects the extension's stylesheet into the document head.
 */
function loadStylesheet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `extensions/${path}/style.css`;
    document.head.appendChild(link);
}

/**
 * Creates and adds the favorite button to the UI.
 */
function addFavoriteButton() {
    if (!isChatCompletion()) {
        return;
    }

    if (document.getElementById('favorite_preset_button')) {
        return; // Button already exists
    }

    const presetDropdown = document.getElementById('settings_preset_openai');
    const savePresetButton = document.getElementById('update_oai_preset');

    if (!savePresetButton || !presetDropdown) {
        console.error('Favorite Button Extension: Could not find preset controls (save button or preset dropdown).');
        return;
    }

    const favoriteButton = document.createElement('div');
    favoriteButton.id = 'favorite_preset_button';
    favoriteButton.classList.add('menu_button', 'menu_button_icon');
    
    const icon = document.createElement('i');
    icon.className = 'fa-regular fa-star';
    favoriteButton.appendChild(icon);

    savePresetButton.insertAdjacentElement('afterend', favoriteButton);

    favoriteButton.addEventListener('click', () => {
        isUpdating = true;
        const selectedPreset = (/** @type {HTMLSelectElement} */ (presetDropdown)).options[(/** @type {HTMLSelectElement} */ (presetDropdown)).selectedIndex].text;
        let favorites = getFavoritePresets();
        const index = favorites.indexOf(selectedPreset);

        if (index > -1) {
            favorites.splice(index, 1); // Remove from favorites
        } else {
            favorites.push(selectedPreset); // Add to favorites
        }

        saveFavoritePresets(favorites);
        updateFavoriteButtonIcon(favoriteButton, selectedPreset);
        updatePresetOrder(/** @type {HTMLSelectElement} */ (presetDropdown));
        isUpdating = false;
    });

    presetDropdown.addEventListener('change', (event) => {
        updateFavoriteButtonIcon(favoriteButton, (/** @type {HTMLSelectElement} */ (event.target)).options[(/** @type {HTMLSelectElement} */ (event.target)).selectedIndex].text);
    });

    // Set the initial state of the button and dropdown order when the script loads
    updateFavoriteButtonIcon(favoriteButton, (/** @type {HTMLSelectElement} */ (presetDropdown)).options[(/** @type {HTMLSelectElement} */ (presetDropdown)).selectedIndex].text);
    updatePresetOrder(/** @type {HTMLSelectElement} */ (presetDropdown));

}

(function init() {
    // Extensions are typically loaded after the main UI is ready.
    setTimeout(() => {
        loadStylesheet();
        addFavoriteButton();
    }, 1000);
})();