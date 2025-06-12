import { t } from '../../../i18n.js';
  import { main_api } from '../../../../script.js';
  
  const path = 'third-party/Extension-FavoritePresets';
  
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
   * Updates the preset manager button's icon.
   * @param {HTMLElement} button The preset manager button element.
   */
  function updatePresetManagerButtonIcon(button) {
      const icon = button.querySelector('i');
      icon.className = 'fa-solid fa-gear';
      button.title = t`Preset Manager`;
  }
  
  /**
   * Reorders the preset dropdown based on custom sections.
   * @param {HTMLSelectElement} presetDropdown
   */
  function updatePresetOrder(presetDropdown) {
      const selectedValue = presetDropdown.value;
      const sections = JSON.parse(localStorage.getItem('presetSections')) || [];
      const allOptions = Array.from(presetDropdown.options);
  
      if (originalOrder.length === 0) {
          originalOrder = allOptions.map(opt => opt.text);
      }
  
      presetDropdown.innerHTML = '';
  
      const allManagedPresets = sections.flatMap(s => s.presets);
      const unmanagedOptions = allOptions.filter(opt => !allManagedPresets.includes(opt.text));
  
      for (const sectionData of sections) {
          const group = document.createElement('optgroup');
          group.label = sectionData.title;
          for (const presetName of sectionData.presets) {
              const option = allOptions.find(o => o.text === presetName);
              if (option) {
                  group.appendChild(option);
              }
          }
          if (group.children.length > 0) {
              presetDropdown.appendChild(group);
          }
      }
  
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = 'Other';
      unmanagedOptions.sort((a, b) => originalOrder.indexOf(a.text) - originalOrder.indexOf(b.text));
      for (const option of unmanagedOptions) {
          otherGroup.appendChild(option);
      }
  
      if (otherGroup.children.length > 0) {
          presetDropdown.appendChild(otherGroup);
      }
  
  
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
      link.href = `extensions/${path}/style2.css`;
      document.head.appendChild(link);
  }
  
  /**
   * Creates and adds the preset manager button to the UI.
   */
  function addPresetManagerButton() {
      if (!isChatCompletion()) {
          return;
      }
  
      if (document.getElementById('preset_manager_button')) {
          return; // Button already exists
      }
  
      const presetDropdown = /** @type {HTMLSelectElement} */ (document.getElementById('settings_preset_openai'));
      const savePresetButton = document.getElementById('update_oai_preset');
  
      if (!savePresetButton || !presetDropdown) {
          console.error('Preset Manager Extension: Could not find preset controls (save button or preset dropdown).');
          return;
      }
  
      const presetManagerButton = document.createElement('div');
      presetManagerButton.id = 'preset_manager_button';
      presetManagerButton.classList.add('menu_button', 'menu_button_icon');
      
      const icon = document.createElement('i');
      presetManagerButton.appendChild(icon);
  
      savePresetButton.insertAdjacentElement('afterend', presetManagerButton);
  
      presetManagerButton.addEventListener('click', () => {
          createPresetManagerPopup();
      });
  
  
      // Set the initial state of the button and dropdown order when the script loads
      updatePresetManagerButtonIcon(presetManagerButton);
      updatePresetOrder(/** @type {HTMLSelectElement} */ (presetDropdown));
  }
  
  function createPresetManagerPopup() {
      const popup = document.createElement('div');
      popup.id = 'preset_manager_popup';
      popup.innerHTML = `
          <div class="preset-manager-popup-content">
              <span class="close-preset-manager-popup">&times;</span>
              <h2>Preset Manager</h2>
              <div class="preset-manager-controls">
                  <input type="text" id="new_section_title" placeholder="New section title">
                  <button id="add_section_button">Add Section</button>
              </div>
              <div id="preset_sections_container"></div>
          </div>
      `;
      document.body.appendChild(popup);
  
      const closeButton = popup.querySelector('.close-preset-manager-popup');
      closeButton.addEventListener('click', () => {
          popup.remove();
      });
  
      const addSectionButton = popup.querySelector('#add_section_button');
      const newSectionTitleInput = /** @type {HTMLInputElement} */ (popup.querySelector('#new_section_title'));
      const sectionsContainer = popup.querySelector('#preset_sections_container');
  
      addSectionButton.addEventListener('click', () => {
          const title = newSectionTitleInput.value.trim();
          if (title) {
              const section = createSectionElement(title);
              sectionsContainer.appendChild(section);
              newSectionTitleInput.value = '';
              saveSections();
          }
      });
  
      function createPresetItem(presetName) {
          const presetItem = document.createElement('div');
          presetItem.className = 'preset-item';
          presetItem.textContent = presetName;
          presetItem.dataset.presetName = presetName; // for easier selection
  
          const deleteButton = document.createElement('span');
          deleteButton.className = 'delete-preset-item';
          deleteButton.innerHTML = '&times;';
          deleteButton.addEventListener('click', () => {
              presetItem.remove();
              saveSections();
              updatePresetOrder(/** @type {HTMLSelectElement} */ (document.getElementById('settings_preset_openai')));
          });
  
          presetItem.appendChild(deleteButton);
          return presetItem;
      }
  
      function createSectionElement(title, presets = []) {
          const section = document.createElement('div');
          section.className = 'preset-section';
          section.innerHTML = `
              <h3 class="preset-section-title">${title}</h3>
              <div class="preset-list"></div>
              <div class="add-preset-flyout-anchor">
                  <button class="add-preset-button">+</button>
              </div>
          `;
  
          const titleElement = section.querySelector('h3');
          const deleteButton = document.createElement('span');
          deleteButton.className = 'delete-section';
          deleteButton.innerHTML = '&times;';
          deleteButton.title = 'Delete section';
          deleteButton.addEventListener('click', () => {
              section.remove();
              saveSections();
              updatePresetOrder(/** @type {HTMLSelectElement} */ (document.getElementById('settings_preset_openai')));
          });
          titleElement.appendChild(deleteButton);
  
          const presetList = section.querySelector('.preset-list');
          const addPresetButton = section.querySelector('.add-preset-button');
  
          addPresetButton.addEventListener('click', (event) => {
              event.stopPropagation();
              const flyout = createAddPresetFlyout(section);
              const anchor = section.querySelector('.add-preset-flyout-anchor');
              anchor.appendChild(flyout);
          });
  
          for (const presetName of presets) {
              const presetItem = createPresetItem(presetName);
              presetList.appendChild(presetItem);
          }
          return section;
      }
  
      function saveSections() {
          const sections = [];
          sectionsContainer.querySelectorAll('.preset-section').forEach(sectionEl => {
              const title = sectionEl.querySelector('h3').firstChild.textContent.trim();
              const presets = [];
              sectionEl.querySelectorAll('.preset-item').forEach(presetEl => {
                  presets.push((/** @type {HTMLElement} */ (presetEl)).dataset.presetName);
              });
              sections.push({ title, presets });
          });
          localStorage.setItem('presetSections', JSON.stringify(sections));
      }
  
      function loadSections() {
          const sections = JSON.parse(localStorage.getItem('presetSections')) || [];
          for (const sectionData of sections) {
              const section = createSectionElement(sectionData.title, sectionData.presets);
              sectionsContainer.appendChild(section);
          }
      }
  
      function createAddPresetFlyout(section) {
          const flyout = document.createElement('div');
          flyout.className = 'add-preset-flyout';
  
          const presetDropdown = /** @type {HTMLSelectElement} */ (document.getElementById('settings_preset_openai'));
          const allPresets = Array.from(presetDropdown.options).map(opt => opt.text).filter(Boolean);
          const currentPresets = Array.from(section.querySelectorAll('.preset-item')).map(item => (/** @type {HTMLElement} */ (item)).dataset.presetName);
          const availablePresets = allPresets.filter(p => !currentPresets.includes(p));
  
          for (const presetName of availablePresets) {
              const flyoutItem = document.createElement('div');
              flyoutItem.className = 'flyout-item';
              flyoutItem.textContent = presetName;
              flyoutItem.addEventListener('click', () => {
                  const presetItem = createPresetItem(presetName);
                  section.querySelector('.preset-list').appendChild(presetItem);
                  saveSections();
                  updatePresetOrder(presetDropdown);
                  flyout.remove();
              });
              flyout.appendChild(flyoutItem);
          }
  
          document.addEventListener('click', (event) => {
              if (!flyout.contains(/** @type {Node} */ (event.target))) {
                  flyout.remove();
              }
          }, { once: true });
  
          return flyout;
      }
  
      loadSections();
  }
  
  (function init() {
      // Extensions are typically loaded after the main UI is ready.
      setTimeout(() => {
          loadStylesheet();
          addPresetManagerButton();
      }, 1000);
  })();