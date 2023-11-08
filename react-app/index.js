import React from 'react';
import ReactDOM from 'react-dom/client';
import xBlockContext from '@constants/xBlockContext';

import App from './App';

// Check the environment
if (process.env.NODE_ENV === 'development') {
  // Development mode rendering
  const rootElement = document.getElementById('files-manager-app-root');
  const root = ReactDOM.createRoot(rootElement);

  if (!window.gettext) {
    window.gettext = (text) => text;
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Production mode rendering
function FilesManagerXBlock(runtime, _, context) {
  const xblockId = context.xblock_id;
  const elementSelector = document.querySelector(`[data-usage-id="${xblockId}"]`);
  xBlockContext.runtime = runtime;
  xBlockContext.element = elementSelector;
  xBlockContext.context = context;
  xBlockContext.isEditView = context.is_edit_view;
  const rootElement = document.getElementById('files-manager-app-root');
  const root = ReactDOM.createRoot(rootElement);

  if (!window.gettext) {
    window.gettext = (text) => text;
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export { FilesManagerXBlock };
