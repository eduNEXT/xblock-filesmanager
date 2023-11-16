import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  setChonkyDefaults,
  ChonkyIconName,
  FileViewMode,
  defineFileAction
} from 'chonky';
import _ from 'lodash';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import { StatusCodes } from 'http-status-codes';
import PropTypes from 'prop-types';
import xBlockContext from '@constants/xBlockContext';
import useXBlockActionButtons from '@hooks/useXBlockActionButtons';
import useFileDownloader from '@hooks/useFileDownloader';
import useAddErrorMessageToModal from '@hooks/useAddErrorMessageToModal';
import { syncContent } from '@services/directoriesService';
import ErrorMessage from '@components/ErrorMessage';

import { useCustomFileMap, useFiles, useFolderChain, useFileActionHandler } from './hooks';
import { convertFileMapToTree } from './utils';
import { prepareCustomFileMap, defaultFileActions, customFileActions } from './constants';

import './styles.css';

const FileManager = (props) => {
  setChonkyDefaults({ iconComponent: ChonkyIconFA });
  const fileInputRef = useRef(null);
  const [saveSyncErrorMessage, setSaveSyncErrorMessage] = useState(null);
  const [, setIsFetchLoading] = useState(false);
  const [downloadFileErrorMessage, setDownloadFileErrorMessage] = useState(null);
  const [reloadPage, setReloadPage] = useState(false);

  const onFileDownloaded = () => setDownloadFileErrorMessage(null);

  const onError = () => {
    const errorMessage = gettext('There was an error downloading the file');
    setDownloadFileErrorMessage(errorMessage);
  };

  const { downloadFileHook, isLoading: isLoadingDownloadFile } = useFileDownloader({ onFileDownloaded, onError });

  const fileMapData = () => props;
  const { rootFolderId } = props;

  const addFile = () => {
    fileInputRef.current.click();
  };

  const downloadFile = (fileData) => {
    const {
      metadata: { display_name, url }
    } = fileData;
    const { hostname, port, protocol } = window.location;
    const fullUrl = port ? `${protocol}//${hostname}:${port}${url}` : `${protocol}//${hostname}${url}`;
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
    createFile,
    deleteFolders
  } = useCustomFileMap(rootFolderId ? fileMapData : prepareCustomFileMap);

  const handleFileChange = (event) => {
    const inputElement = event.target;
    if (inputElement.offsetWidth > 0 && inputElement.offsetHeight > 0) {
      return;
    }

    const selectedFiles = [...inputElement.files];
    if (selectedFiles.length > 0) {
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
    downloadFile,
    deleteFolders
  );

  const { xblockId, isEditView } = xBlockContext;

  const saveContent = async (formData) => {
    try {
      const syncContentData = await syncContent(formData);

      if (syncContentData.status !== StatusCodes.OK) {
        throw new Error('Sync content has failed: Unexpected status code');
      }

      return Promise.resolve('Synchronizing content was successful');
    } catch (error) {
      return Promise.reject('An error has ocurred while  we tried to synchronizing content');
    }
  };

  const xblockActionButtons = useMemo(() => {
    return [
      {
        id: new Date().getTime(),
        xblockIdItem: xblockId,
        title: gettext('Save'),
        callback: () => {}
      }
    ];
  }, [xblockId]);

  const handleSaveButton = async (_, rootFolderId, fileMap, filesToDelete, buttonSaveRef) => {
    const filesToSave = { ...fileMap };
    const filesKeys = Object.keys(filesToSave);
    const contentFormat = convertFileMapToTree(rootFolderId, '', filesToSave);
    const contentString = JSON.stringify({ rootFolderId, treeFolders: contentFormat });
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

    buttonSaveRef.disabled = 'disabled';
    buttonSaveRef.classList.add('disabled-button');

    try {
      await saveContent(formData);

      setReloadPage(true);
    } catch (error) {
      const errorMessage = gettext('An unexpected error has occurred');
      setSaveSyncErrorMessage(errorMessage);
      buttonSaveRef.classList.remove('disabled-button');
      buttonSaveRef.removeAttribute('disabled');
    } finally {
      setIsFetchLoading(false);
    }
  };

  useXBlockActionButtons(xblockActionButtons, false, fileMap, assetsKeyToDelete, rootFolderIdFixed, handleSaveButton);

  useAddErrorMessageToModal(
    saveSyncErrorMessage ? <ErrorMessage message={saveSyncErrorMessage} className="error-message-edit" /> : null
  );

  const fileBrowserRef = useRef(null);
  const [fileSelection, setFileSelection] = useState(null);
  const [hasFilesSelected, setHasFilesSelected] = useState(false);
  const disabledActions = hasFilesSelected ? [ChonkyActions.DownloadFiles.id] : undefined;
  const fileActionsList = hasFilesSelected ? defaultFileActions : customFileActions;

  const fileActions = isEditView ? fileActionsList : [ChonkyActions.DownloadFiles];

  const checkFileSelection = () => {
    if (fileBrowserRef.current) {
      const newFileSelection = fileBrowserRef.current.getFileSelection();
      if (!_.isEqual(newFileSelection, fileSelection)) {
        const selections = Array.from(newFileSelection);
        const hasFilesSelected = selections.some((fileId) => !fileMap[fileId].isDir);
        setHasFilesSelected(hasFilesSelected);
        setFileSelection(newFileSelection);
      }
    }
  };

  useEffect(() => {
    // Initially check file selection
    checkFileSelection();

    // On each render, check for changes in file selection
    const interval = setInterval(checkFileSelection, 500);

    // Clean-up interval on unmount or changes to the fileSelection dependency
    return () => clearInterval(interval);
  }, [fileSelection, fileBrowserRef, fileMap]);

  useEffect(() => {
    if (reloadPage) {
      window.location.reload();
    }
  }, [reloadPage]);

  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} multiple />

      {downloadFileErrorMessage && <ErrorMessage message={downloadFileErrorMessage} />}

      <div className="filesmanager__content">
        <FileBrowser
          ref={fileBrowserRef}
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          disableDefaultFileActions={isLoadingDownloadFile ? [ChonkyActions.DownloadFiles.id] : disabledActions}
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

FileManager.propTypes = {
  rootFolderId: PropTypes.string.isRequired,
  baseFileMap: PropTypes.object.isRequired
};

export default FileManager;
