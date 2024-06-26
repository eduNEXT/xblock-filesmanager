import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  setChonkyDefaults} from 'chonky';
import _ from 'lodash';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import { StatusCodes } from 'http-status-codes';
import PropTypes from 'prop-types';
import { camelizeKeys } from 'humps';
import xBlockContext from '@constants/xBlockContext';
import useXBlockActionButtons from '@hooks/useXBlockActionButtons';
import useFileDownloader from '@hooks/useFileDownloader';
import useAddErrorMessageToModal from '@hooks/useAddErrorMessageToModal';
import { syncContent, downloadContent, downloadStatus } from '@services/directoriesService';
import ErrorMessage from '@components/ErrorMessage';
import DatePickerInput from '@components/DatePickerInput';
import { sendTrackingLogEvent } from '@services/analyticsService';

import { useCustomFileMap, useFiles, useFolderChain, useFileActionHandler } from './hooks';
import { convertFileMapToTree, getMetadataFiles } from './utils';
import { prepareCustomFileMap, defaultFileActions, customFileActions, openFileAction } from './constants';

ChonkyActions.ToggleHiddenFiles.button.toolbar = false;

import './styles.css';

const FileManager = (props) => {
  setChonkyDefaults({ iconComponent: ChonkyIconFA });
  const fileInputRef = useRef(null);
  const [saveSyncErrorMessage, setSaveSyncErrorMessage] = useState(null);
  const [, setIsFetchLoading] = useState(false);
  const [downloadFileErrorMessage, setDownloadFileErrorMessage] = useState(null);
  const [reloadPage, setReloadPage] = useState(false);
  const downloadFilesData = useRef(null);
  const dateInputRef = useRef(null);

  const onFileDownloaded = (listOfFiles) => {
    setDownloadFileErrorMessage(null);
    const fileContents = downloadFilesData.current;
    if (listOfFiles !== null && fileContents === null) {
      var filesMetadata = getMetadataFiles(listOfFiles);
    }else{
      var filesMetadata = getMetadataFiles(fileContents);
    }
    const { isStudioView, xblockId, courseId, userId, userName } = xBlockContext;
    if (!isStudioView) {
      sendTrackingLogEvent('edunext.xblock.filesmanager.files.downloaded', {
        course_id: courseId,
        xblock_id: xblockId,
        user_id: userId,
        username: userName,
        files_downloaded_metadata: filesMetadata,
        created_at: new Date().toISOString()
      });
    }
  };

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
      metadata: { url },
      name,
      isDir,
    } = fileData;
    const { hostname, port, protocol } = window.location;
    downloadFilesData.current = fileData;
    const fullUrl = port ? `${protocol}//${hostname}:${port}${url}` : `${protocol}//${hostname}${url}`;
    if (isDir){
        downloadFiles([fileData])
        return
    }
    downloadFileHook(fullUrl, name, false, null);
  };

  const downloadFiles = (filesToDownload) => {
    downloadFilesZip(filesToDownload)
  };

  const downloadFilesZip = async (filesToDownload) => {
    try {
        const createContentData = await downloadContent({ contents: filesToDownload });
        if (createContentData.status !== StatusCodes.OK) {
          throw new Error('Download content has failed:  Unexpected status code');
        }
        let data = createContentData.data;
        getStatusFromZipTask(data.task_id, filesToDownload)

        return Promise.resolve('Download was successful');
      } catch (error) {
        return Promise.reject('An error has ocurred while downloading assets');
      }
  };

  const getStatusFromZipTask = async (taskID, filesToDownload) => {
    const createContentData = await downloadStatus(taskID);
    if (createContentData.status !== StatusCodes.OK) {
        throw new Error('Fetching task status has failed:  Unexpected status code');
    }
    let data = createContentData.data;
    if (data.status === 'SUCCESS') {
        downloadFileHook(data.result, "download.zip", true, filesToDownload)
    } else if (data.status === 'ERROR') {
        onError()
    } else {
        setTimeout(() => {
            getStatusFromZipTask(taskID)
        }, 1000)
    }
    return Promise.resolve('Fetching download was successful');
  }

  const {
    fileMap,
    currentFolderId,
    assetsKeyToDelete,
    rootFolderIdFixed,
    fileDateSelected,
    setCurrentFolderId,
    setFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    createFile,
    deleteFolders,
    renameFolder,
    filesDates,
    setFileDateSelected,
    addDateVisibilityFiles,
    removeDateVisibilityFiles
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

  const handleClearSelection = () => {
    const fileBrowserRefObj =  fileBrowserRef.current;
    if(fileBrowserRefObj){
      fileBrowserRefObj.requestFileAction(ChonkyActions.ClearSelection);
    }
  }

  const handleDatePickerChange = (dates) => {
    const [dateFrom, dateTo] = dates;
    if (dateFrom && dateTo && fileBrowserRef.current && dateInputRef.current) {
      const newFileSelection = fileBrowserRef.current.getFileSelection();
      const filesSelected = Array.from(newFileSelection);
      addDateVisibilityFiles(filesSelected, { dateFrom, dateTo });
      handleClearSelection();
    }
  };

  const setDate = (fileSelected) => {
    if (dateInputRef.current) {
      const { id } = fileSelected;
      const dateRangeMetadata =
        id in filesDates ? filesDates[id].date_range: { dateFrom: null, dateTo: null };
      const datesSelected = fileSelected?.metadata?.date_range || dateRangeMetadata;
      const datesSelectedFormat = camelizeKeys(datesSelected);
      setFileDateSelected(datesSelectedFormat);
      dateInputRef.current.input.click();
    }
  };


  const files = useFiles(fileMap, currentFolderId);
  const folderChain = useFolderChain(fileMap, currentFolderId);
  const handleFileAction = useFileActionHandler(
    fileMap,
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    addFile,
    setDate,
    downloadFile,
    deleteFolders,
    renameFolder,
    downloadFiles,
    removeDateVisibilityFiles,
    handleClearSelection
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

  const handleSaveButton = async (_, rootFolderId, fileMap, filesToDelete, buttonSaveRef, filesDates) => {
    const filesToSave = { ...fileMap };
    const filesKeys = Object.keys(filesToSave);
    const formData = new FormData();

    const hasAssetsKeyToDelete = filesToDelete.length > 0;
    let sizeFiles = 0;

    filesKeys.forEach((key) => {
      const isFile = filesToSave[key].isDir === false;
      const isSavedFile = filesToSave[key]?.metadata?.asset_key ?? false;
      const hasFileLoaded = 'file' in filesToSave[key];
      if (isFile && hasFileLoaded && !isSavedFile) {
        const { file } = filesToSave[key];
        formData.append('files', file);
        sizeFiles++;
      }

      const oldMetadata = filesToSave[key].metadata || {};
      const datesMetadata = filesDates[key] || {};

      filesToSave[key] = {
        ...filesToSave[key],
        metadata: {
          ...oldMetadata,
          ...datesMetadata
        }
      };
    });

    const contentFormat = convertFileMapToTree(rootFolderId, '', filesToSave);
    const contentString = JSON.stringify({ rootFolderId, treeFolders: contentFormat });
    formData.append('contents', contentString);

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

  useXBlockActionButtons(xblockActionButtons, false, fileMap, assetsKeyToDelete, rootFolderIdFixed, filesDates, handleSaveButton);

  useAddErrorMessageToModal(
    saveSyncErrorMessage ? <ErrorMessage message={saveSyncErrorMessage} className="error-message-edit" /> : null
  );

  const fileBrowserRef = useRef(null);
  const [fileSelection, setFileSelection] = useState(null);
  const [hasFilesSelected, setHasFilesSelected] = useState(false);
  const [hasOneFolderSelected, setHasOneFolderSelected] = useState(false);
  const [hasMoreThanOneFolderSelected, setHasMoreThanOneFolderSelected] = useState(false);
  const [hasOneFileSelected, setHasOneFileSelected] = useState(false);
  const [hasFileSelectedDate, setHasFileSelectedDate] = useState(false);
  const disabledActions = hasFilesSelected ? [ChonkyActions.DownloadFiles.id] : undefined;
  const fileActionsList = hasOneFolderSelected || hasOneFileSelected || hasMoreThanOneFolderSelected || hasFilesSelected
    ? customFileActions({
        hasFolderSelected: hasOneFolderSelected,
        hasFileSelected: hasOneFileSelected,
        hasMoreThanOneFolderSelected,
        hasFileSelectedDate
    })
    : defaultFileActions;

  const defaultActions =  hasOneFileSelected ? [ChonkyActions.DownloadFiles, openFileAction] : [ChonkyActions.DownloadFiles];
  const fileActions = isEditView ? fileActionsList : defaultActions;

  const checkFileSelection = () => {
    if (fileBrowserRef.current) {
      const newFileSelection = fileBrowserRef.current.getFileSelection();
      if (!_.isEqual(newFileSelection, fileSelection)) {
        const selections = Array.from(newFileSelection);
        const hasOneSelection = selections.length === 1;
        const hasFoldersSelected = selections.length > 1;
        const hasFilesSelected = selections.some((fileId) => !fileMap[fileId].isDir);
        const hasOneFolderSelected = hasOneSelection && !hasFilesSelected;
        const hasMoreThanOneFolderSelected = hasFoldersSelected && !hasFilesSelected;
        const hasOneFileSelected = hasOneSelection && hasFilesSelected;
        setHasOneFileSelected(hasOneFileSelected);
        setHasOneFolderSelected(hasOneFolderSelected);
        setHasFilesSelected(hasFilesSelected);
        setFileSelection(newFileSelection);
        setHasMoreThanOneFolderSelected(hasMoreThanOneFolderSelected);
        if(hasOneSelection) {
          const [fileSelectedId] = selections;
          const fileSelection = fileMap[fileSelectedId];
          const hasDateSet = typeof fileSelection?.metadata?.date_range !== 'undefined';
          setHasFileSelectedDate(hasDateSet);
        }
      }
    }
  };

  useEffect(() => {
    // Initially check file selection
    checkFileSelection();

    // On each render, check for changes in file selection
    const interval = setInterval(checkFileSelection, 150);

    // Clean-up interval on unmount or changes to the fileSelection dependency
    return () => clearInterval(interval);
  }, [fileSelection, fileBrowserRef, fileMap, hasOneFolderSelected, hasOneFileSelected, hasMoreThanOneFolderSelected, hasFileSelectedDate]);

  const thumbnailGenerator = useCallback(
    ({ isSaved, metadata }) =>
      isSaved && metadata.thumbnail && !metadata.thumbnail.includes('None') ? metadata.thumbnail : null,
    []
  );

  useEffect(() => {
    if (reloadPage) {
      window.location.reload();
    }
  }, [reloadPage]);

  return (
    <>
      {isEditView && (
        <>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} multiple />
          <DatePickerInput ref={dateInputRef} onChangePicker={handleDatePickerChange} {...fileDateSelected} />
        </>
      )}
      {downloadFileErrorMessage && <ErrorMessage message={downloadFileErrorMessage} />}

      <div className="filesmanager__content">
        <FileBrowser
          ref={fileBrowserRef}
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          disableDefaultFileActions={isLoadingDownloadFile ? [ChonkyActions.DownloadFiles.id] : disabledActions}
          onFileAction={handleFileAction}
          thumbnailGenerator={thumbnailGenerator}
          defaultFileViewActionId={ChonkyActions.EnableListView.id}
          clearSelectionOnOutsideClick={false}
          disableDragAndDropProvider={!isEditView}>
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
