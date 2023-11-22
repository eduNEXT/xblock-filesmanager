import { v4 as uuidv4 } from 'uuid';
import { ChonkyActions, ChonkyIconName, defineFileAction } from 'chonky';

export const prepareCustomFileMap = () => {
  const rootFolderId = uuidv4();
  const baseFileMap = {
    [rootFolderId]: {
      id: rootFolderId,
      name: 'Root',
      isDir: true,
      childrenIds: [],
      childrenCount: 0,
      children: []
    }
  };

  return {
    baseFileMap,
    rootFolderId
  };
};

// Custom action to delete folders
export const deleteFolderAction = defineFileAction({
  id: 'delete_folder',
  hotkeys: ['delete', 'ctrl+backspace'],
  button: {
    name: 'Delete folders',
    toolbar: false,
    contextMenu: true,
    icon: ChonkyIconName.trash
  }
});

// Custom action to rename folders
export const renameFolderAction = defineFileAction({
  id: 'rename_folder',
  hotkeys: ['ctrl+r'],
  button: {
    name: 'Rename folder',
    toolbar: false,
    contextMenu: true,
    icon: ChonkyIconName.config
  }
});

// Custom action to open preview of a file
export const openFileAction = defineFileAction({
  id: 'open_file_custom',
  hotkeys: ['ctrl+o'],
  button: {
    name: 'Open file in a new tab',
    toolbar: false,
    contextMenu: true,
    icon: ChonkyIconName.symlink
  }
});

export const defaultFileActions = [ChonkyActions.CreateFolder, ChonkyActions.UploadFiles, ChonkyActions.DownloadFiles];

export const customFileActions = (hasFolderSelected = false, hasFileSelected = false) => {
  let customActions = hasFolderSelected ? [deleteFolderAction, renameFolderAction, ...defaultFileActions] : defaultFileActions;
  customActions = hasFileSelected ? [...customActions, openFileAction] : customActions;
  return customActions;
};
