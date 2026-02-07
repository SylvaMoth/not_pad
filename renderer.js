const { ipcRenderer } = require('electron');

let currentFile = null;
let originalContent = '';
let config = {};

let currentSearchQuery = '';
let lastSearchPos = 0;
let searchStartPos = 0;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load config and apply theme
  config = await ipcRenderer.invoke('get-config');
  document.body.className = config.theme;
  
  // Get all elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const filename = document.getElementById('filename');
  const btnOpen = document.getElementById('btn-open');
  const btnHistory = document.getElementById('btn-history');
  const historyMenu = document.getElementById('history-menu');
  const btnSave = document.getElementById('btn-save');
  const btnClose = document.getElementById('btn-close');
  const btnPreview = document.getElementById('btn-preview');
  const btnPrint = document.getElementById('btn-print');

  let isPreviewMode = false;
  
  const searchBar = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');
  const btnSearchPrev = document.getElementById('btn-search-prev');
  const btnSearchNext = document.getElementById('btn-search-next');
  const searchCount = document.getElementById('search-count');
  const btnToggleReplace = document.getElementById('btn-toggle-replace');
  const btnCloseSearch = document.getElementById('btn-close-search');
  const replaceBar = document.getElementById('replace-bar');
  const replaceInput = document.getElementById('replace-input');
  const btnReplace = document.getElementById('btn-replace');
  const btnReplaceAll = document.getElementById('btn-replace-all');
  
  const saveDialog = document.getElementById('save-dialog');
  const saveNew = document.getElementById('save-new');
  const savePrepend = document.getElementById('save-prepend');
  const saveAppend = document.getElementById('save-append');
  const saveAddDate = document.getElementById('save-add-date');
  const saveDateText = document.getElementById('save-date-text');
  const btnSaveConfirm = document.getElementById('btn-save-confirm');
  const btnSaveCancel = document.getElementById('btn-save-cancel');
  
  const messageDialog = document.getElementById('message-dialog');
  const messageTitle = document.getElementById('message-title');
  const messageText = document.getElementById('message-text');
  const btnMessageOk = document.getElementById('btn-message-ok');
  
  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmText = document.getElementById('confirm-text');
  const btnConfirmYes = document.getElementById('btn-confirm-yes');
  const btnConfirmNo = document.getElementById('btn-confirm-no');
  
  const preferencesDialog = document.getElementById('preferences-dialog');
  const prefThemeDark = document.getElementById('pref-theme-dark');
  const prefThemeLight = document.getElementById('pref-theme-light');
  const prefOpenDir = document.getElementById('pref-open-dir');
  const prefSaveDir = document.getElementById('pref-save-dir');
  const btnBrowseOpen = document.getElementById('btn-browse-open');
  const btnClearOpen = document.getElementById('btn-clear-open');
  const btnBrowseSave = document.getElementById('btn-browse-save');
  const btnClearSave = document.getElementById('btn-clear-save');
  const prefDateShort = document.getElementById('pref-date-short');
  const prefDateLong = document.getElementById('pref-date-long');
  const prefIncludeDate = document.getElementById('pref-include-date');
  const prefDateText = document.getElementById('pref-date-text');
  const btnPrefSave = document.getElementById('btn-pref-save');
  const btnPrefCancel = document.getElementById('btn-pref-cancel');
  
  // Function to add date line if checkbox is checked
  function getContentWithDate(content) {
    if (!saveAddDate.checked) {
      return content;
    }
    
    const lineLength = 80;
    let centerText = '';
    
    // Build date string if include_date is enabled in preferences
    if (config.include_date) {
      const today = new Date();
      
      if (config.date_format === 'YYYY-Month-DD') {
        const year = today.getFullYear();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[today.getMonth()];
        const day = String(today.getDate()).padStart(2, '0');
        centerText = `${year}-${month}-${day}`;
      } else {
        // YY-MM-DD format
        const year = String(today.getFullYear()).slice(-2);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        centerText = `${year}-${month}-${day}`;
      }
    }
    
    // Get custom text from save dialog (overrides preference default)
    const customText = saveDateText.value.trim();
    
    // Add custom text
    if (customText) {
      if (centerText) {
        // Combine date and text with underscore
        centerText = `${centerText}_${customText}`;
      } else {
        // Just text, no date
        centerText = customText;
      }
    }
    
    // If neither date nor text, just make a separator line (empty center)
    if (!centerText) {
      centerText = '';
    }
    
    // Truncate if too long (leave minimum 4 characters for underscores)
    const maxTextLength = lineLength - 4;
    if (centerText.length > maxTextLength) {
      centerText = centerText.substring(0, maxTextLength);
    }
    
    // Create centered line with underscores
    const totalUnderscores = lineLength - centerText.length;
    const leftUnderscores = '_'.repeat(Math.floor(totalUnderscores / 2));
    const rightUnderscores = '_'.repeat(Math.ceil(totalUnderscores / 2));
    const dateLine = `${leftUnderscores}${centerText}${rightUnderscores}`;
    
    // Add date line at both beginning and end
    return dateLine + '\n\n' + content + '\n\n' + dateLine;
  }
  
  // Focus editor
  editor.focus();

  // Right-click context menu on the editor and preview
  editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('show-context-menu');
  });
  preview.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('show-context-menu');
  });

  // Ctrl+F for search - use bubble phase, not capture
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      e.stopPropagation();
      
      // Don't allow search in preview mode
      if (isPreviewMode) {
        // System beep
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyy3ksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgszyFg');
        audio.play().catch(() => {}); // Ignore if audio fails
        return;
      }
      
      toggleSearch();
    }
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      e.stopPropagation();
      
      // Don't allow replace in preview mode
      if (isPreviewMode) {
        // System beep
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyy3ksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgszyFg');
        audio.play().catch(() => {}); // Ignore if audio fails
        return;
      }
      
      if (searchBar.classList.contains('hidden')) {
        toggleSearch();
      }
      if (replaceBar.classList.contains('hidden')) {
        replaceBar.classList.remove('hidden');
        replaceInput.focus();
      }
    }
    if (e.key === 'Escape') {
      closeSearch();
    }
  }, false); // Use bubble phase instead of capture
  
  let searchIsOpen = false;

  // While search is open, editor has focus (for selection highlight) but is readOnly.
  // Intercept keystrokes on the editor and route them to the search input.
  editor.addEventListener('keydown', (e) => {
    if (!searchIsOpen) return;

    // Let Ctrl+F, Ctrl+H, Escape, and standard Ctrl shortcuts (copy/select all) through
    if (e.key === 'Escape' || (e.ctrlKey && (e.key === 'f' || e.key === 'h'))) return;
    if (e.ctrlKey && (e.key === 'c' || e.key === 'a')) return;

    // Ctrl+Z/Y/V/X: close search first, then let the action through
    if (e.ctrlKey && (e.key === 'z' || e.key === 'y' || e.key === 'v' || e.key === 'x')) {
      closeSearch();
      return;
    }

    e.preventDefault();

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevMatch();
      } else {
        nextMatch();
      }
    } else if (e.key === 'Backspace') {
      searchInput.value = searchInput.value.slice(0, -1);
      performSearch();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Printable character — append to search input
      searchInput.value += e.key;
      performSearch();
    }
  });

  // Search functions
  function toggleSearch() {
    if (searchBar.classList.contains('hidden')) {
      // Save cursor position when opening search
      searchStartPos = editor.selectionStart;
      lastSearchPos = searchStartPos;
      searchBar.classList.remove('hidden');
      replaceBar.classList.add('hidden');
      searchIsOpen = true;
      editor.readOnly = true;
      searchInput.value = '';
      currentSearchQuery = '';
      searchCount.textContent = '';
      searchInput.focus();
      searchInput.select();
    } else {
      closeSearch();
    }
  }

  function closeSearch() {
    searchBar.classList.add('hidden');
    replaceBar.classList.add('hidden');
    currentSearchQuery = '';
    lastSearchPos = 0;
    searchIsOpen = false;
    editor.readOnly = false;
    editor.focus();
  }
  
  function performSearch() {
    const query = searchInput.value;
    
    if (!query) {
      searchCount.textContent = '';
      return;
    }
    
    // If query changed, search from original cursor position
    if (query !== currentSearchQuery) {
      currentSearchQuery = query;
      lastSearchPos = searchStartPos;
      nextMatch();
    }
  }
  
  function nextMatch() {
    const query = searchInput.value;
    if (!query) return;

    const text = editor.value;
    const startPos = lastSearchPos;

    // Search forward from last position
    const index = text.toLowerCase().indexOf(query.toLowerCase(), startPos);

    if (index !== -1) {
      lastSearchPos = index + query.length;
      scrollToMatch(index, query.length);
      searchCount.textContent = 'Found';
    } else {
      // No match found forward, try from beginning (wrap around)
      const wrapIndex = text.toLowerCase().indexOf(query.toLowerCase(), 0);
      if (wrapIndex !== -1 && wrapIndex < startPos) {
        lastSearchPos = wrapIndex + query.length;
        scrollToMatch(wrapIndex, query.length);
        searchCount.textContent = 'Wrapped';
      } else {
        searchCount.textContent = 'No matches';
      }
    }
  }

  function prevMatch() {
    const query = searchInput.value;
    if (!query) return;

    const text = editor.value;
    // Search backward from before current match
    const startPos = lastSearchPos - (currentSearchQuery ? currentSearchQuery.length : 0) - 1;

    // Find last occurrence before current position
    let index = -1;
    let searchPos = 0;
    while (true) {
      const found = text.toLowerCase().indexOf(query.toLowerCase(), searchPos);
      if (found === -1 || found >= startPos) break;
      index = found;
      searchPos = found + 1;
    }

    if (index !== -1) {
      lastSearchPos = index + query.length;
      scrollToMatch(index, query.length);
      searchCount.textContent = 'Found';
    } else {
      // No match found backward, try from end (wrap around)
      let wrapIndex = -1;
      let pos = Math.max(0, startPos + 1);
      while (true) {
        const found = text.toLowerCase().indexOf(query.toLowerCase(), pos);
        if (found === -1) break;
        wrapIndex = found;
        pos = found + 1;
      }

      if (wrapIndex !== -1) {
        lastSearchPos = wrapIndex + query.length;
        scrollToMatch(wrapIndex, query.length);
        searchCount.textContent = 'Wrapped';
      } else {
        searchCount.textContent = 'No matches';
      }
    }
  }
  
  function scrollToMatch(index, length) {
    if (index < 0) return;

    // Focus editor so selection highlight is visible (editor is readOnly while searching)
    editor.focus();
    editor.setSelectionRange(index, index + length);

    // Let the browser auto-scroll to make the selection visible,
    // then adjust to center the match in the viewport
    requestAnimationFrame(() => {
      // Create a temporary span to measure the exact pixel position of the match.
      // We use a mirror div technique: copy text up to the match into a hidden div
      // with the same font/size, and measure its height.
      const mirror = document.createElement('div');
      const style = window.getComputedStyle(editor);
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.width = style.width;
      mirror.style.fontSize = style.fontSize;
      mirror.style.fontFamily = style.fontFamily;
      mirror.style.lineHeight = style.lineHeight;
      mirror.style.padding = style.padding;
      mirror.style.border = style.border;
      mirror.style.boxSizing = style.boxSizing;
      mirror.textContent = editor.value.substring(0, index);
      document.body.appendChild(mirror);

      const matchTop = mirror.scrollHeight;
      document.body.removeChild(mirror);

      editor.scrollTop = Math.max(0, matchTop - editor.clientHeight * 0.2);
    });
  }
  
  // Helper: replace text in editor while preserving undo history
  function editorReplaceRange(start, end, replacement) {
    editor.readOnly = false;
    editor.focus();
    editor.setSelectionRange(start, end);
    document.execCommand('insertText', false, replacement);
    editor.readOnly = true;
  }

  function replaceMatch() {
    const query = searchInput.value;
    if (!query) return;

    // Use lastSearchPos to find where the current match is
    // (the match starts at lastSearchPos - query.length)
    const matchStart = lastSearchPos - query.length;
    const selectedText = editor.value.substring(matchStart, matchStart + query.length);

    // Only replace if current match actually matches the query
    if (selectedText.toLowerCase() === query.toLowerCase()) {
      editorReplaceRange(matchStart, matchStart + query.length, replaceInput.value);

      // Move to next match
      lastSearchPos = matchStart + replaceInput.value.length;
      nextMatch();
    }
  }

  function replaceAll() {
    const query = searchInput.value;
    const replacement = replaceInput.value;

    if (!query) return;

    // Find all matches and replace from end to start to preserve positions
    const text = editor.value;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matches = [];
    let pos = 0;
    while (true) {
      const found = lowerText.indexOf(lowerQuery, pos);
      if (found === -1) break;
      matches.push(found);
      pos = found + 1;
    }

    if (matches.length === 0) {
      searchCount.textContent = 'No matches';
      return;
    }

    // Replace from end to start so positions stay valid
    editor.readOnly = false;
    editor.focus();
    for (let i = matches.length - 1; i >= 0; i--) {
      editor.setSelectionRange(matches[i], matches[i] + query.length);
      document.execCommand('insertText', false, replacement);
    }
    editor.readOnly = true;

    searchCount.textContent = `Replaced ${matches.length}`;
  }
  
  // Search event listeners - Block ALL event propagation
  searchInput.addEventListener('input', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    performSearch();
  });
  searchInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevMatch();
      } else {
        nextMatch();
      }
    }
  });
  
  // Block ALL keyboard events from propagating
  searchInput.addEventListener('keypress', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  searchInput.addEventListener('keyup', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  searchInput.addEventListener('click', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  searchInput.addEventListener('focus', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  searchInput.addEventListener('blur', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  
  // Same for replace input
  replaceInput.addEventListener('input', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('keypress', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('keyup', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('click', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('focus', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  replaceInput.addEventListener('blur', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  
  btnSearchPrev.addEventListener('click', prevMatch);
  btnSearchNext.addEventListener('click', nextMatch);
  btnCloseSearch.addEventListener('click', closeSearch);
  
  btnToggleReplace.addEventListener('click', () => {
    replaceBar.classList.toggle('hidden');
    if (!replaceBar.classList.contains('hidden')) {
      replaceInput.focus();
    }
  });
  
  btnReplace.addEventListener('click', replaceMatch);
  btnReplaceAll.addEventListener('click', replaceAll);
  
  // Open file
  btnOpen.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('open-file');
    if (!result) return;
    
    currentFile = result.filepath;
    editor.value = result.content;
    // Store what the textarea actually has (it normalizes \r\n to \n)
    originalContent = editor.value;

    await ipcRenderer.invoke('add-recent-file', result.filepath);
    updateTitle();

    editor.setSelectionRange(0, 0);
    editor.scrollTop = 0;
    editor.focus();
  });
  
  // History menu
  btnHistory.addEventListener('click', async () => {
    if (!historyMenu.classList.contains('hidden')) {
      historyMenu.classList.add('hidden');
      return;
    }
    
    config = await ipcRenderer.invoke('get-config');
    historyMenu.innerHTML = '';
    
    if (config.recent_files && config.recent_files.length > 0) {
      for (const filepath of config.recent_files) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = filepath;
        item.title = filepath;
        item.addEventListener('click', async () => {
          const content = await ipcRenderer.invoke('read-file', filepath);
          currentFile = filepath;
          editor.value = content;
          // Store what the textarea actually has (it normalizes \r\n to \n)
          originalContent = editor.value;
          updateTitle();
          historyMenu.classList.add('hidden');
          editor.focus();
        });
        historyMenu.appendChild(item);
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No recent files';
      historyMenu.appendChild(empty);
    }
    
    historyMenu.classList.remove('hidden');
  });
  
  // Close history when clicking outside
  document.addEventListener('click', (e) => {
    if (!historyMenu.contains(e.target) && e.target !== btnHistory) {
      historyMenu.classList.add('hidden');
    }
  });
  
  // Quick save (Ctrl+S) - overwrite current file, or open dialog if no file
  async function quickSave() {
    const content = editor.value.trim();
    if (!content) {
      showMessage('Nothing to save', 'The editor is empty.');
      return;
    }

    if (currentFile) {
      // Overwrite current file silently
      try {
        await ipcRenderer.invoke('write-file', currentFile, content);
        originalContent = editor.value;
        showMessage('Saved', `File saved to ${currentFile.split(/[/\\]/).pop()}`);
      } catch (err) {
        showMessage('Error', `Could not save file: ${err.message}`);
      }
    } else {
      // No file open — fall through to save dialog
      showSaveDialog();
    }
  }

  // Show the save dialog (Save As / Ctrl+Shift+S / Save button)
  function showSaveDialog() {
    const content = editor.value.trim();
    if (!content) {
      showMessage('Nothing to save', 'The editor is empty.');
      return;
    }
    // Populate date text input with default from preferences
    saveDateText.value = config.date_text || '';
    saveDialog.classList.remove('hidden');
  }

  // Save button opens the full save dialog (same as Save As)
  btnSave.addEventListener('click', showSaveDialog);
  
  // Save dialog buttons
  btnSaveConfirm.addEventListener('click', async () => {
    saveDialog.classList.add('hidden');
    
    if (saveNew.checked) {
      await saveAsNewFile();
    } else if (savePrepend.checked) {
      await prependToFile();
    } else if (saveAppend.checked) {
      await appendToFile();
    }
  });
  
  btnSaveCancel.addEventListener('click', () => {
    saveDialog.classList.add('hidden');
    editor.focus();
  });
  
  // Prepend to file
  async function prependToFile() {
    const content = editor.value.trim();
    
    // Always ask which file to prepend to
    const result = await ipcRenderer.invoke('open-file');
    if (!result) {
      editor.focus();
      return;
    }
    
    const targetFile = result.filepath;
    const targetContent = result.content;
    
    // Check if user is trying to prepend file to itself with no changes
    if (currentFile && currentFile === targetFile && content === originalContent) {
      showConfirm('No changes detected', 'You are about to prepend a file to itself with no changes. Continue anyway?', async (confirmed) => {
        if (confirmed) {
          await doPrepend(targetFile, content, targetContent);
        } else {
          editor.focus();
        }
      });
      return;
    }
    
    await doPrepend(targetFile, content, targetContent);
  }
  
  async function doPrepend(targetFile, content, targetContent) {
    // Add date line to content if checkbox is checked
    const contentToSave = getContentWithDate(content);
    const newContent = contentToSave + '\n\n' + targetContent;
    
    try {
      await ipcRenderer.invoke('write-file', targetFile, newContent);
      
      currentFile = targetFile;
      originalContent = newContent;
      editor.value = newContent;
      
      await ipcRenderer.invoke('add-recent-file', targetFile);
      updateTitle();
      
      editor.setSelectionRange(0, 0);
      editor.scrollTop = 0;
      editor.focus();
      
      showMessage('Success', 'Content prepended successfully.');
    } catch (err) {
      showMessage('Error', `Could not save file: ${err.message}`);
    }
  }
  
  // Save as new file
  async function saveAsNewFile() {
    const content = editor.value.trim();
    const contentToSave = getContentWithDate(content);
    
    const filepath = await ipcRenderer.invoke('save-file-dialog');
    
    if (!filepath) {
      editor.focus();
      return;
    }
    
    try {
      await ipcRenderer.invoke('write-file', filepath, contentToSave);
      
      currentFile = filepath;
      originalContent = contentToSave;
      
      await ipcRenderer.invoke('add-recent-file', filepath);
      updateTitle();
      
      editor.setSelectionRange(0, 0);
      editor.scrollTop = 0;
      editor.focus();
      
      showMessage('Success', 'File saved successfully.');
    } catch (err) {
      showMessage('Error', `Could not save file: ${err.message}`);
    }
  }
  
  // Append to file
  async function appendToFile() {
    const content = editor.value.trim();
    
    // Always ask which file to append to
    const result = await ipcRenderer.invoke('open-file');
    if (!result) {
      editor.focus();
      return;
    }
    
    const targetFile = result.filepath;
    const targetContent = result.content;
    
    // Check if user is trying to append file to itself with no changes
    if (currentFile && currentFile === targetFile && content === originalContent) {
      showConfirm('No changes detected', 'You are about to append a file to itself with no changes. Continue anyway?', async (confirmed) => {
        if (confirmed) {
          await doAppend(targetFile, content, targetContent);
        } else {
          editor.focus();
        }
      });
      return;
    }
    
    await doAppend(targetFile, content, targetContent);
  }
  
  async function doAppend(targetFile, content, targetContent) {
    // Add date line to content if checkbox is checked
    const contentToSave = getContentWithDate(content);
    const newContent = targetContent + '\n\n' + contentToSave;
    
    try {
      await ipcRenderer.invoke('write-file', targetFile, newContent);
      
      currentFile = targetFile;
      originalContent = newContent;
      editor.value = newContent;
      
      await ipcRenderer.invoke('add-recent-file', targetFile);
      updateTitle();
      
      const endPos = editor.value.length;
      editor.setSelectionRange(endPos, endPos);
      editor.scrollTop = editor.scrollHeight;
      editor.focus();
      
      showMessage('Success', 'Content appended successfully.');
    } catch (err) {
      showMessage('Error', `Could not save file: ${err.message}`);
    }
  }
  
  // Close button
  btnClose.addEventListener('click', () => {
    // Close search bar first if open, so editor is back to normal state
    if (searchIsOpen) {
      closeSearch();
    }

    const hasUnsavedChanges = editor.value.trim() !== originalContent.trim();

    if (hasUnsavedChanges && editor.value.trim()) {
      showConfirm('Close file?', 'Unsaved changes will be lost.', (confirmed) => {
        if (confirmed) {
          currentFile = null;
          originalContent = '';
          editor.value = '';
          updateTitle();
          
          // Switch back to text mode
          if (isPreviewMode) {
            editor.classList.remove('hidden');
            preview.classList.add('hidden');
            btnPreview.textContent = 'Preview';
            btnPrint.classList.add('hidden');
            isPreviewMode = false;
          }
        }
        editor.focus();
      });
    } else {
      currentFile = null;
      originalContent = '';
      editor.value = '';
      updateTitle();

      // Switch back to text mode
      if (isPreviewMode) {
        editor.classList.remove('hidden');
        preview.classList.add('hidden');
        btnPreview.textContent = 'Preview';
        btnPrint.classList.add('hidden');
        isPreviewMode = false;
      }
      
      editor.focus();
    }
  });
  
  // Preview button - toggles between Text and Markdown
  btnPreview.addEventListener('click', () => {
    if (isPreviewMode) {
      // Switch to Text mode
      editor.classList.remove('hidden');
      preview.classList.add('hidden');
      btnPreview.textContent = 'Preview';
      btnPrint.classList.add('hidden');
      isPreviewMode = false;
      editor.focus();
    } else {
      // Switch to Markdown mode
      const content = editor.value.trim();

      if (!content) {
        showMessage('Nothing to preview', 'The editor is empty.');
        return;
      }

      const html = renderMarkdownToHTML(content);
      preview.innerHTML = html;
      editor.classList.add('hidden');
      preview.classList.remove('hidden');
      btnPreview.textContent = 'Text';
      btnPrint.classList.remove('hidden');
      isPreviewMode = true;
    }
  });

  // Print button (visible in preview mode)
  btnPrint.addEventListener('click', () => {
    window.print();
  });
  
  // Simple markdown renderer
  function renderMarkdownToHTML(text) {
    let html = '';
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          html += `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }
      
      if (line.startsWith('### ')) {
        html += `<h3>${processInline(line.slice(4))}</h3>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${processInline(line.slice(3))}</h2>`;
      } else if (line.startsWith('# ')) {
        html += `<h1>${processInline(line.slice(2))}</h1>`;
      } else if (line.startsWith('> ')) {
        html += `<blockquote>${processInline(line.slice(2))}</blockquote>`;
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        html += `<ul><li>${processInline(line.trim().slice(2))}</li></ul>`;
      } else if (line.trim()) {
        html += `<p>${processInline(line)}</p>`;
      } else {
        html += '<br>';
      }
    }
    
    return html;
  }
  
  function processInline(text) {
    text = escapeHtml(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    return text;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Update title
  function updateTitle() {
    if (currentFile) {
      const name = currentFile.split(/[/\\]/).pop();
      filename.textContent = name;
    } else {
      filename.textContent = 'Ready to write';
    }
  }
  
  // Message dialog
  function showMessage(title, text) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageDialog.classList.remove('hidden');
  }
  
  btnMessageOk.addEventListener('click', () => {
    messageDialog.classList.add('hidden');
    editor.focus();
  });
  
  // Confirm dialog
  let confirmCallback = null;
  
  function showConfirm(title, text, callback) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmCallback = callback;
    confirmDialog.classList.remove('hidden');
  }
  
  btnConfirmYes.addEventListener('click', () => {
    confirmDialog.classList.add('hidden');
    if (confirmCallback) confirmCallback(true);
    confirmCallback = null;
  });
  
  btnConfirmNo.addEventListener('click', () => {
    confirmDialog.classList.add('hidden');
    if (confirmCallback) confirmCallback(false);
    confirmCallback = null;
    editor.focus();
  });
  
  // Preferences dialog
  async function showPreferences() {
    config = await ipcRenderer.invoke('get-config');
    
    if (config.theme === 'dark') {
      prefThemeDark.checked = true;
    } else {
      prefThemeLight.checked = true;
    }
    
    prefOpenDir.value = config.default_open_dir || '';
    prefSaveDir.value = config.default_save_dir || '';
    
    // Set date format
    if (config.date_format === 'YYYY-Month-DD') {
      prefDateLong.checked = true;
    } else {
      prefDateShort.checked = true;
    }
    
    // Set include date checkbox
    prefIncludeDate.checked = config.include_date !== false; // Default to true
    
    // Set default date text
    prefDateText.value = config.date_text || '';
    
    preferencesDialog.classList.remove('hidden');
  }
  
  btnBrowseOpen.addEventListener('click', async () => {
    const dir = await ipcRenderer.invoke('select-directory', 'Select Default Open Directory');
    if (dir) {
      prefOpenDir.value = dir;
    }
  });
  
  btnClearOpen.addEventListener('click', () => {
    prefOpenDir.value = '';
  });
  
  btnBrowseSave.addEventListener('click', async () => {
    const dir = await ipcRenderer.invoke('select-directory', 'Select Default Save Directory');
    if (dir) {
      prefSaveDir.value = dir;
    }
  });
  
  btnClearSave.addEventListener('click', () => {
    prefSaveDir.value = '';
  });
  
  btnPrefSave.addEventListener('click', async () => {
    const newTheme = prefThemeDark.checked ? 'dark' : 'light';
    const newOpenDir = prefOpenDir.value;
    const newSaveDir = prefSaveDir.value;
    const newDateFormat = prefDateLong.checked ? 'YYYY-Month-DD' : 'YY-MM-DD';
    const newIncludeDate = prefIncludeDate.checked;
    const newDateText = prefDateText.value.trim();
    
    await ipcRenderer.invoke('save-config', {
      theme: newTheme,
      default_open_dir: newOpenDir,
      default_save_dir: newSaveDir,
      date_format: newDateFormat,
      include_date: newIncludeDate,
      date_text: newDateText
    });
    
    config = await ipcRenderer.invoke('get-config');
    document.body.className = config.theme;
    
    preferencesDialog.classList.add('hidden');
    editor.focus();
  });
  
  btnPrefCancel.addEventListener('click', () => {
    preferencesDialog.classList.add('hidden');
    editor.focus();
  });
  
  // Menu handlers
  ipcRenderer.on('menu-new', () => {
    currentFile = null;
    originalContent = '';
    editor.value = '';
    updateTitle();
    editor.focus();
  });
  
  ipcRenderer.on('menu-open', () => {
    btnOpen.click();
  });
  
  ipcRenderer.on('menu-quick-save', () => {
    quickSave();
  });

  ipcRenderer.on('menu-save-as', () => {
    showSaveDialog();
  });
  
  ipcRenderer.on('menu-close', () => {
    btnClose.click();
  });
  
  ipcRenderer.on('menu-preview', () => {
    btnPreview.click();
  });
  
  ipcRenderer.on('menu-find', () => {
    if (isPreviewMode) {
      // System beep
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyy3ksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgszyFg');
      audio.play().catch(() => {});
      return;
    }
    toggleSearch();
  });
  
  ipcRenderer.on('menu-replace', () => {
    if (isPreviewMode) {
      // System beep
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyy3ksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgszyFg');
      audio.play().catch(() => {});
      return;
    }
    if (searchBar.classList.contains('hidden')) {
      toggleSearch();
    }
    if (replaceBar.classList.contains('hidden')) {
      replaceBar.classList.remove('hidden');
      replaceInput.focus();
    }
  });
  
  ipcRenderer.on('menu-preferences', () => {
    showPreferences();
  });

  ipcRenderer.on('menu-print', () => {
    const content = editor.value.trim();
    if (!content) {
      showMessage('Nothing to print', 'The editor is empty.');
      return;
    }

    // If not already in preview mode, switch to it first
    if (!isPreviewMode) {
      btnPreview.click();
    }

    // Print after a short delay so the preview renders fully
    setTimeout(() => {
      window.print();
    }, 100);
  });
});
