export const basicDescriptionInstructionsCms = 'Use this component to upload and organize files that students can access directly in the unit.';
export const basicDescriptionInstructionsLms = 'Use this component to view a file tree.';
export const advancedDescriptionInstructions = `${basicDescriptionInstructionsCms} Any files you upload will be added to the "File & Uploads" or "Files" section. Extracting files from the "Unpublished" folder leaves them visible to students, returning them to the folder hides them.`;

export const basicShortCuts = ['Open a file (Ctrl + O)', 'Select multiple files or folders (Ctrl + click)'];
export const basicNotes = ['Preview is only allowed for image files (JPEG/JPG, PNG, SVG) and PDFs'];


export const advancedShortCuts = [
  ...basicShortCuts,
  'Delete a folder (Del, Ctrl + Backspace)',
  'Rename a folder (Ctrl + R)',
  'Open a file (Ctrl + O)'
];

export const advancedNotes = [
  ...basicNotes,
  'The "Unpublished" folder contains course files that are not within the file tree.',
  'When a folder is deleted, the files contained within it move to the "Unpublished" folder.',
  'Files deleted from the tree structure are moved to the "Unpublished" folder and are not permanently deleted.'
];
