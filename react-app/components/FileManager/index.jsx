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
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import xBlockContext from '@constants/xBlockContext';
import useXBlockActionButtons from '@hooks/useXBlockActionButtons';
import useFileDownloader from '@hooks/useFileDownloader';
import { syncContent, deleteContent } from '@services/directoriesService';

import { useCustomFileMap, useFiles, useFolderChain, useFileActionHandler } from './hooks';
import DemoFsMap from './default.json';
import { convertFileMapToTree } from './utils';

const prepareCustomFileMap = () => {
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


const FileManager = (props) => {
  setChonkyDefaults({ iconComponent: ChonkyIconFA });
  const fileInputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFetchLoading, setIsFetchLoading] = useState(false);

  const onDownloaded = () => {
    console.log('fine');
  };

  const onError = () => {
    console.log('error :/');
  };

  const { downloadFileHook, isLoading: isLoadingDownloadFile } = useFileDownloader({ onDownloaded, onError });

  const fileMapData = () => props;
  const { rootFolderId } = props;

  const addFile = () => {
    fileInputRef.current.click();
  };

  const downloadFile = (fileData) => {
    //console.log('trying to download the file :)', fileData);
    const {
      metadata: { display_name, url }
    } = fileData;
    const { hostname, port, protocol } = window.location;
    const fullUrl = port ? `${protocol}//${hostname}:${port}${url}` : `${protocol}//${hostname}${url}`;
    //console.log('fullUrl', fullUrl);
    downloadFileHook(fullUrl, display_name);
  };

  const {
    fileMap,
    currentFolderId,
    assetsKeyToDelete,
    rootFolderIdFixed,
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    createFile
  } = useCustomFileMap(rootFolderId ? fileMapData : prepareCustomFileMap);


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
  const handleFileAction = useFileActionHandler(
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    addFile,
    downloadFile
  );
  // remove from here ChonkyActions.DeleteFiles
  const fileActions = [
    ChonkyActions.CreateFolder,
    ChonkyActions.UploadFiles,
    ChonkyActions.DeleteFiles,
    ChonkyActions.DownloadFiles
  ];

  const saveContent = async (formData) => {
    try {
      const syncContentData = await syncContent(formData);

      if (syncContentData.status !== StatusCodes.OK) {
        throw new Error('Sync content has failed');
      }

      return Promise.resolve('Synchronizing content successfully');
    } catch (error) {
      return Promise.reject('Error synchronizing content');
    }
  };

  const removeContent = async (assetsKeyToDelete) => {
    try {
      const createContentData = await deleteContent({ contents: assetsKeyToDelete });

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

  const handleSaveButton = async (idButton, rootFolderId, fileMap, filesToDelete, buttonRef) => {
    const filesToSave = { ...fileMap };
    const filesKeys = Object.keys(filesToSave);
    //console.log('test', rootFolderId);
    const contentFormat = convertFileMapToTree(rootFolderId, '', filesToSave);
    const contentString = JSON.stringify({ rootFolderId, treeFolders: contentFormat });
    console.log('format: ', { rootFolderId, treeFolders: contentFormat });
    //console.log('assetsKeyToDelete', filesToDelete);
    //console.log('filesToSave', filesToSave);
    const formData = new FormData();

    formData.append('contents', contentString);
    const hasAssetsKeyToDelete = filesToDelete.length > 0;
    let sizeFiles = 0;
    const fileNames = new Set();

    filesKeys.forEach((key) => {
      const isFile = filesToSave[key].isDir === false;
      const fileName = filesToSave[key].name;
      const isSavedFile = 'metadata' in filesToSave[key];
      const hasFileLoaded = 'file' in filesToSave[key];
      if (isFile && hasFileLoaded && !isSavedFile && !fileNames.has(fileName)) {
        fileNames.add(fileName);
        const { file } = filesToSave[key];
        formData.append('files', file);
        sizeFiles++;
      }
    });

    //console.log('formData', formData);
    //console.log('hasassetsKeyToDelete', hasassetsKeyToDelete);

    //setIsFetchLoading(true);

    try {
      /*if (sizeFiles) {
        await saveContent(formData);
      }*/
      const promisesAll = [];

      //promisesAll.push(saveContent(formData));

      await saveContent(formData);

      if (hasAssetsKeyToDelete) {

        await removeContent(filesToDelete);
        //promisesAll.push(saveContent(formData));
      }

      /*await Promise.all(promisesAll)
        .then(() => {
          console.log('Is everthing good');
        })
        .catch((err) => console.log('eerror', err)); */

      // await saveContent(formData);
    } catch (error) {
      console.log('This is the error: ', error.message);
      setErrorMessage('Show an error');
    } finally {
      setIsFetchLoading(false);
    }

    //handleSaveImages(imagesList, imagesToDelete, buttonRef);
  };

  useXBlockActionButtons(xblockBottomButtons, false, fileMap, assetsKeyToDelete, rootFolderIdFixed, handleSaveButton);

  // console.log('fileMap', fileMap);
  // console.log('assetsKeyToDelete', assetsKeyToDelete);

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
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          disableDefaultFileActions={isLoadingDownloadFile ? [ChonkyActions.DownloadFiles.id] : undefined}
          onFileAction={handleFileAction}
          defaultFileViewActionId={ChonkyActions.EnableListView.id}
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
