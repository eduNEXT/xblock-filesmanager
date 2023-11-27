export const basicFeatures = ['View a list of folders and files', 'Navigate through folders', 'Download files', 'Preview files', 'Search files by name', 'Select files and/or folders'];
export const basicShortCuts = ['Open a file (Ctrl + O)', 'Select multiple files or folders (Ctrl + click)'];
export const basicNotes = ['Preview is only allowed for image files (JPEG/JPG, PNG, SVG) and PDFs'];

export const advancedFeatures = [
  ...basicFeatures,
  'Select files and/or folders',
  'Upload files',
  'Create folders',
  'Rename folders',
  'Delete folders',
  'Delete files',
  'Move files between folders',
  'Move folders'
];

export const advancedShortCuts = [
  ...basicShortCuts,
  'Delete a folder (Del, Ctrl + Backspace)',
  'Rename a folder (Ctrl + R)',
  'Open a file (Ctrl + O)'
];

export const advancedNotes = [
  ...basicNotes,
  "The 'Unpublished' folder contains course files that are not within the file tree.",
  'When a folder is deleted, the files contained within it move to the "Unpublished" folder.',
  'Files deleted from the tree structure are moved to the "Unpublished" folder and are not permanently deleted.'
];
