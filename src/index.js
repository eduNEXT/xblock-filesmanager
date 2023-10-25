import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

function FilesManagerXBlock(runtime, element, options) {
  const rootElement = document.getElementById('react-app-root');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export { FilesManagerXBlock };
