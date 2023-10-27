import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  setChonkyDefaults
} from 'chonky';
import _ from 'lodash';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import xBlockContext from '@constants/xBlockContext';
import useXBlockActionButtons from '@hooks/useXBlockActionButtons';
import { createContent, deleteContent } from '@services/directoriesService';

import { useCustomFileMap, useFiles, useFolderChain, useFileActionHandler } from './hooks';
import DemoFsMap from './default.json';
import { convertFileMapToTree } from './utils';

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
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFetchLoading, setIsFetchLoading] = useState(false);

  const addFile = () => {
    fileInputRef.current.click();
  };

  const {
    fileMap,
    currentFolderId,
    pathsToDelete,
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
        const { name } = file;
        createFile(name, file);
      });
    }
  };

  const files = useFiles(fileMap, currentFolderId);
  const folderChain = useFolderChain(fileMap, currentFolderId);
  const handleFileAction = useFileActionHandler(setCurrentFolderId, deleteFiles, moveFiles, createFolder, addFile);
  // remove from here ChonkyActions.DeleteFiles
  const fileActions = [
    ChonkyActions.CreateFolder,
    ChonkyActions.UploadFiles,
    ChonkyActions.DeleteFiles,
    ChonkyActions.DownloadFiles
  ];
  const thumbnailGenerator = useCallback(
    (file) => (file.thumbnailUrl ? `https://chonky.io${file.thumbnailUrl}` : null),
    []
  );

  const saveContent = async (formData) => {
    try {
      const createContentData = createContent(formData);

      if (createContentData.status !== StatusCodes.OK) {
        throw new Error('Create content has failed');
      }

      return Promise.resolve('Save content successfully');
    } catch (error) {
      return Promise.reject('Error creating content');
    }
  };

  const removeContent = async (pathsToDelete) => {
    try {
      const createContentData = deleteContent({ paths: pathsToDelete });

      if (createContentData.status !== StatusCodes.OK) {
        throw new Error('Delete content has failed');
      }

      return Promise.resolve('Delete content successfully');
    } catch (error) {
      return Promise.reject('Error deleting content');
    }
  };

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

  const handleSaveButton = async (idButton, fileMap, buttonRef) => {
    const filesToSave = { ...fileMap };
    const filesKeys = Object.keys(filesToSave);
    const contentFormat = convertFileMapToTree('qwerty123456', '', filesToSave);
    const contentString = JSON.stringify([contentFormat]);
    const formData = new FormData();
    formData.append('contents', contentString);
    const hasPathsToDelete = pathsToDelete.length > 0;
    let sizeFiles = 0;

    filesKeys.forEach((key) => {
      const isFile = filesToSave[key].isDir === false;
      const isSavedFile = 'metadata' in filesToSave[key];
      if (isFile && !isSavedFile) {
        const { file } = filesToSave[key];
        formData.append('files', file);
        sizeFiles++;
      }
    });


    console.log('formData', formData);

    setIsFetchLoading(true);

    try {
      if (sizeFiles) {
        await saveContent(formData);
      }

      if (hasPathsToDelete) {
        await removeContent(formData);
      }
    } catch (error) {
    } finally {
      setIsFetchLoading(false);
    }

    //handleSaveImages(imagesList, imagesToDelete, buttonRef);
  };

  useXBlockActionButtons(xblockBottomButtons, false, fileMap, handleSaveButton);

  console.log('fileMap', fileMap);
  console.log('pathsToDelete', pathsToDelete);

  return (
    <>
      {/*
        <button onClick={resetFileMap} style={{ marginBottom: 15 }}>
        Reset file map
          disableDefaultFileActions={[
            ChonkyActions.OpenSelection.id,
            ChonkyActions.SelectAllFiles.id,
            ChonkyActions.ClearSelection.id
          ]}

      </button>
      */}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} multiple />

      <div style={{ height: 400 }}>
        <FileBrowser
          setFileSelection={(select, rest) => {
            console.log('select', select);
          }}
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          onFileAction={handleFileAction}
          defaultFileViewActionId={ChonkyActions.EnableListView.id}
          disableDefaultFileActions={[
            ChonkyActions.OpenSelection.id,
            ChonkyActions.SelectAllFiles.id,
            ChonkyActions.ClearSelection.id,
            ChonkyActions.DeleteFiles.id
          ]}
          clearSelectionOnOutsideClick={false}
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
