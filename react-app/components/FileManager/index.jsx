import React, { useCallback, useRef, useMemo } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  setChonkyDefaults
} from 'chonky';
import useSWRMutation from 'swr/mutation';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import xBlockContext from '@constants/xBlockContext';
import useXBlockActionButtons from '@hooks/useXBlockActionButtons';
import { uploadFiles } from '@services/directoriesService';

import { useCustomFileMap, useFiles, useFolderChain, useFileActionHandler } from './hooks';
import DemoFsMap from './default.json';

const prepareCustomFileMap = () => {
  const baseFileMap = DemoFsMap.fileMap;
  const rootFolderId = DemoFsMap.rootFolderId;
  return { baseFileMap, rootFolderId };
};

async function sendRequest(url, { arg }) {
  return uploadFiles(arg);
}

const FileManager = (props) => {
  setChonkyDefaults({ iconComponent: ChonkyIconFA });
  const fileInputRef = useRef(null);

  const addFile = () => {
    fileInputRef.current.click();
  };

  const {
    fileMap,
    currentFolderId,
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    createFile
  } = useCustomFileMap(prepareCustomFileMap);

  const handleFileChange = (event) => {
    const selectedFiles = [...event.target.files];
    if (selectedFiles.length > 0) {
      // You can handle the selected files here using forEach
      // console.log('selected files', selectedFiles);
      selectedFiles.forEach((file) => {
        // console.log('Selected file:', file.name);
        const currentFolderName = fileMap[currentFolderId].name || '';
        file.path = `/${currentFolderName}`;
        file.folderName = currentFolderName;
        const { name } = file;
        createFile(name, file);
      });
    }
  };

  const files = useFiles(fileMap, currentFolderId);
  const folderChain = useFolderChain(fileMap, currentFolderId);
  const handleFileAction = useFileActionHandler(setCurrentFolderId, deleteFiles, moveFiles, createFolder, addFile);
  const fileActions = [ChonkyActions.CreateFolder, ChonkyActions.UploadFiles, ChonkyActions.DeleteFiles];
  const thumbnailGenerator = useCallback(
    (file) => (file.thumbnailUrl ? `https://chonky.io${file.thumbnailUrl}` : null),
    []
  );

  const { trigger: triggerSwr, isMutating } =
    useSWRMutation('/api/user', sendRequest, {
      onError: () => {
        //setMutateError(true);
      },
      onSuccess: ({ data }) => {
        //setCustomerData(data);
        //setMutateError(false);
        //alert('data send success 😄');
        console.log('Looking good :D');
      }
    }) ?? {};

  const { xblockId } = xBlockContext;
  const xblockBottomButtons = useMemo(() => {
    return [
      {
        id: new Date().getTime(),
        xblockIdItem: xblockId,
        title: gettext('Save'),
        callback: () => {}
      }
    ];
  }, [xblockId]);

  const handleSaveButton = (idButton, fileMap, buttonRef) => {

    const filesToSave = { ...fileMap };
    const filesKeys = Object.keys(filesToSave);
    const formData = new FormData();
    let sizeFiles = 0;
    filesKeys.forEach((key) => {
      const isFile = filesToSave[key].isDir === false;
      if (isFile) {
        const { file } = filesToSave[key];
        formData.append('files', file);
        sizeFiles++;
      }

    });
    console.log('formData', formData);

    if (sizeFiles) triggerSwr(formData);

    //handleSaveImages(imagesList, imagesToDelete, buttonRef);
  };

  useXBlockActionButtons(xblockBottomButtons, false, fileMap, handleSaveButton);

  return (
    <>
      {/*
        <button onClick={resetFileMap} style={{ marginBottom: 15 }}>
        Reset file map
      </button>
      */}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} multiple />

      <div style={{ height: 400 }}>
        <FileBrowser
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          onFileAction={handleFileAction}
          defaultFileViewActionId={ChonkyActions.EnableListView.id}
          clearSelectionOnOutsideClick={true}
          disableDragAndDropProvider={false}>
          <FileNavbar />
          <FileToolbar />
          <FileList />
          <FileContextMenu />
        </FileBrowser>
      </div>
    </>
  );
};

export default FileManager;
