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

  return { baseFileMap, rootFolderId };
};

// Custom action
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

export const defaultFileActions = [ChonkyActions.CreateFolder, ChonkyActions.UploadFiles, ChonkyActions.DownloadFiles];

export const customFileActions = [
  ChonkyActions.CreateFolder,
  ChonkyActions.UploadFiles,
  deleteFolderAction,
  ChonkyActions.DownloadFiles
];
