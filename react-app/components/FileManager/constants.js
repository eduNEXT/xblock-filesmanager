import { v4 as uuidv4 } from 'uuid';
import { ChonkyActions, ChonkyIconName, defineFileAction } from 'chonky';
import { faCalendarDays, faCalendarXmark } from '@fortawesome/free-solid-svg-icons';

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

// Custom action to add a date for a file/folder of visibility
export const addDateVisibilityFiles = defineFileAction({
  id: 'add_date_visibility_files',
  button: {
    name: 'Set file visibility with date',
    toolbar: true,
    contextMenu: true,
    group: 'Actions',
    icon: faCalendarDays
  }
});

// Custom action to remove a date set for a file/folder of visibility
export const removeDateVisibilityFiles = defineFileAction({
  id: 'remove_date_visibility_files',
  button: {
    name: 'Remove date visibility',
    toolbar: true,
    contextMenu: true,
    group: 'Actions',
    icon: faCalendarXmark
  }
});

export const defaultFileActions = [ChonkyActions.CreateFolder, ChonkyActions.UploadFiles, ChonkyActions.DownloadFiles];

export const customFileActions = ({
  hasFolderSelected,
  hasFileSelected,
  hasMoreThanOneFolderSelected,
  hasFileSelectedDate
}) => {
  if (hasFolderSelected) {
    const visibilityDates = hasFileSelectedDate
      ? [addDateVisibilityFiles, removeDateVisibilityFiles]
      : [addDateVisibilityFiles];

    return [deleteFolderAction, renameFolderAction, ...visibilityDates, ...defaultFileActions];
  }

  if (hasMoreThanOneFolderSelected) {
    return [deleteFolderAction, ...defaultFileActions];
  }

  if (hasFileSelected) {
    const visibilityDates = hasFileSelectedDate
      ? [addDateVisibilityFiles, removeDateVisibilityFiles]
      : [addDateVisibilityFiles];

    return [...defaultFileActions, ...visibilityDates, openFileAction];
  }

  return defaultFileActions;
};
