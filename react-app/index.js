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
  const typeRuntime = elementSelector.getAttribute('data-runtime-class');
  xBlockContext.runtime = runtime;
  xBlockContext.element = elementSelector;
  xBlockContext.context = context;
  xBlockContext.isStudioView = elementSelector && typeRuntime !== 'LmsRuntime';
  xBlockContext.xblockId = context.xblock_id;
  xBlockContext.courseId = context.course_id;
  xBlockContext.userId = context.user_id;
  xBlockContext.userName = context.username;
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
