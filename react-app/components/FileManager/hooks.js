import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ChonkyActions, FileHelper } from 'chonky';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import { decamelizeKeys } from 'humps';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import { convertFileMapToTree, findNodeByIdInTree, extractAssetKeys, getFilesFromATree } from './utils';

dayjs.extend(isBetween);

export const useCustomFileMap = (prepareCustomFileMap) => {
  const { baseFileMap, rootFolderId } = useMemo(prepareCustomFileMap, []);
  const rootFolderIdFixed = rootFolderId;

  const [fileMap, setFileMap] = useState(baseFileMap);
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId);
  const [assetsKeyToDelete, setAssetsKeyToDelete] = useState([]);
  const [filesDates, setFilesDates] = useState({});
  const [fileDateSelected, setFileDateSelected] = useState({ dateFrom: null, dateTo: null });

  const resetFileMap = useCallback(() => {
    setFileMap(baseFileMap);
    setCurrentFolderId(rootFolderId);
    setAssetsKeyToDelete([]);
  }, [baseFileMap, rootFolderId]);

  const currentFolderIdRef = useRef(currentFolderId);
  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  const deleteFiles = useCallback((files) => {
    setFileMap((currentFileMap) => {
      const newFileMap = { ...currentFileMap };
      const fileMapToTree = convertFileMapToTree(rootFolderId, '', fileMap);

      files.forEach((file) => {
        const nodeTree = findNodeByIdInTree(fileMapToTree, file.id) || { metadata: {}, path: '' };

        if (file.isSaved) {
          const {
            metadata: { asset_key }
          } = nodeTree;
          if (file.isDir) {
            const { id: folderId } = file;
            const folderToFileMapToTree = convertFileMapToTree(folderId, '', fileMap);
            const assetKeysToDelete = extractAssetKeys(folderToFileMapToTree);
            setAssetsKeyToDelete((prevPaths) => [...prevPaths, ...assetKeysToDelete]);
          } else {
            setAssetsKeyToDelete((prevPaths) => [...prevPaths, asset_key]);
          }
        }

        if (file.parentId) {
          const parent = newFileMap[file.parentId];
          const newChildrenIds = parent.childrenIds.filter((id) => id !== file.id);

          newFileMap[file.parentId] = {
            ...parent,
            childrenIds: newChildrenIds,
            childrenCount: newChildrenIds.length
          };
        }
      });

      return newFileMap;
    });
  }, []);

  const deleteFolders = useCallback((folders) => {
    setFileMap((currentFileMap) => {
      const newFileMap = _.cloneDeep(currentFileMap);

      folders.forEach((file) => {
        const folderId = file.id;
        delete newFileMap[folderId];

        if (file.parentId) {
          const parent = newFileMap[file.parentId];
          const newChildrenIds = parent.childrenIds.filter((id) => id !== file.id);

          newFileMap[file.parentId] = {
            ...parent,
            childrenIds: newChildrenIds,
            childrenCount: newChildrenIds.length
          };
        }
      });

      return newFileMap;
    });
  }, []);

  const renameFolder = useCallback((folder, folderName) => {
    setFileMap((currentFileMap) => {
      const newFileMap = _.cloneDeep(currentFileMap);

      const { id: folderId } = folder;
      newFileMap[folderId].name = folderName;

      return newFileMap;
    });
  }, []);
  const moveFiles = useCallback((files, source, destination) => {
    setFileMap((currentFileMap) => {
      const newFileMap = _.cloneDeep(currentFileMap);
      const moveFileIds = new Set(files.map((file) => file.id));

      const newSourceChildrenIds = source.childrenIds.filter((id) => !moveFileIds.has(id));
      newFileMap[source.id] = {
        ...source,
        childrenIds: newSourceChildrenIds,
        childrenCount: newSourceChildrenIds.length
      };

      const newDestinationChildrenIds = [...destination.childrenIds, ...files.map((file) => file.id)];
      newFileMap[destination.id] = {
        ...destination,
        childrenIds: newDestinationChildrenIds,
        childrenCount: newDestinationChildrenIds.length
      };

      files.forEach((file) => {
        newFileMap[file.id] = {
          ...file,
          parentId: destination.id
        };
      });

      return newFileMap;
    });
  }, []);

  const createFolder = useCallback((folderName) => {
    setFileMap((currentFileMap) => {
      const newFileMap = _.cloneDeep(currentFileMap);
      const parentId = currentFolderIdRef.current;
      const currentFolderKeys = Object.keys(newFileMap);
      const parentName = newFileMap[currentFolderIdRef.current].name || '';
      const isDirectoryAdded = currentFolderKeys.some(
        (key) => newFileMap[key].name === folderName && newFileMap[key].parentId === parentId
      );

      if (isDirectoryAdded) {
        return newFileMap;
      }

      const newFolderId = uuidv4();

      const newFolderContent = {
        id: newFolderId,
        name: folderName,
        isDir: true,
        parentId: currentFolderIdRef.current,
        path: `/${parentName}`,
        isNew: true,
        isSaved: false,
        childrenIds: [],
        childrenCount: 0,
        children: []
      };

      newFileMap[newFolderId] = newFolderContent;

      const parent = newFileMap[currentFolderIdRef.current];
      newFileMap[currentFolderIdRef.current] = {
        ...parent,
        childrenIds: [...parent.childrenIds, newFolderId],
        children: [...parent.children, newFolderContent]
      };

      return newFileMap;
    });
  }, []);

  const createFile = useCallback((fileName, file) => {
    setFileMap((currentFileMap) => {
      const newFileMap = _.cloneDeep(currentFileMap);
      const parentName = newFileMap[currentFolderIdRef.current].name || '';

      const newFileId = uuidv4();
      const newFileContent = {
        id: newFileId,
        name: fileName,
        isDir: false,
        isSaved: false,
        parentId: currentFolderIdRef.current,
        path: `/${parentName}`,
        isNew: true,
        file
      };

      newFileMap[newFileId] = newFileContent;

      const parent = newFileMap[currentFolderIdRef.current];

      newFileMap[currentFolderIdRef.current] = {
        ...parent,
        childrenIds: [...parent.childrenIds, newFileId],
        children: [...parent.children, newFileContent]
      };

      return newFileMap;
    });
  }, []);

  const addDateVisibilityFiles = useCallback((filesSelected, dates) => {
    const { dateFrom, dateTo } = dates;
    const datesFormat = 'YYYY-MM-DD';
    const formatDayFrom = dayjs(dateFrom).format(datesFormat);
    const formatDayTo = dayjs(dateTo).format(datesFormat);
    const dateFormat = decamelizeKeys({ dateRange: { dateFrom, dateTo } });
    const currentDate = dayjs();

    filesSelected.forEach((fileKey) => {
      setFilesDates((prev) => ({ ...prev, [fileKey]: dateFormat }));
      setFileMap((currentFileMap) => {
        const newFileMap = _.cloneDeep(currentFileMap);
        const { isHidden = null, ...fileSelected } = newFileMap[fileKey];
        const fileMetadata = fileSelected?.metadata || {};
        fileSelected.metadata = { ...fileMetadata, ...dateFormat };
        const isFileNodeVisible = currentDate.isBetween(formatDayFrom, formatDayTo, 'day', '[]');
        if (!isFileNodeVisible) {
          fileSelected.isHidden = true;
        }

        newFileMap[fileKey] = fileSelected;

        return newFileMap;
      });
    });
  }, []);

  const removeDateVisibilityFiles = useCallback((filesSelected) => {
    const currentDatesSelected = filesDates;
    setFileDateSelected({ dateFrom: null, dateTo: null });

    filesSelected.forEach((file) => {
      const { id } = file;
      const { [id]: omitKey, ...filesDatesNew } = currentDatesSelected;
      setFilesDates(filesDatesNew);
      setFileMap((currentFileMap) => {
        const newFileMap = _.cloneDeep(currentFileMap);
        const { isHidden = null, ...fileSelected } = file;
        const fileMetadata = fileSelected?.metadata || {};
        const { date_range = null, ...metadataFormat } = fileMetadata;
        fileSelected.metadata = metadataFormat;

        newFileMap[id] = fileSelected;

        return newFileMap;
      });
    });
  }, []);

  return {
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
    deleteFolders,
    renameFolder,
    setFileMap,
    filesDates,
    fileDateSelected,
    setFileDateSelected,
    addDateVisibilityFiles,
    removeDateVisibilityFiles
  };
};

export const useFiles = (fileMap, currentFolderId) => {
  return useMemo(() => {
    const currentFolder = fileMap[currentFolderId];
    const childrenIds = currentFolder.childrenIds;
    const files = childrenIds.map((fileId) => fileMap[fileId]);
    return files;
  }, [currentFolderId, fileMap]);
};

export const useFolderChain = (fileMap, currentFolderId) => {
  return useMemo(() => {
    const currentFolder = fileMap[currentFolderId];
    const folderChain = [currentFolder];
    let parentId = currentFolder.parentId;
    while (parentId) {
      const parentFile = fileMap[parentId];
      if (parentFile) {
        folderChain.unshift(parentFile);
        parentId = parentFile.parentId;
      } else {
        break;
      }
    }
    return folderChain;
  }, [currentFolderId, fileMap]);
};

export const useFileActionHandler = (
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
  removeDateVisibityFiles,
  handleClearSelection
) => {
  return useCallback(
    (data) => {
      const hasPublishFolder = data.state.selectedFiles.some(({ id }) => id === 'unpublished');

      if (data.id === ChonkyActions.OpenFiles.id) {
        const { targetFile, files } = data.payload;
        const fileToOpen = targetFile ?? files[0];
        if (fileToOpen && FileHelper.isDirectory(fileToOpen)) {
          setCurrentFolderId(fileToOpen.id);
          return;
        }
      } else if (data.id === 'delete_folder') {
        if (hasPublishFolder) {
          alert('You can not delete Unpublished folder');
        } else {
          const { selectedFiles } = data.state;

          selectedFiles.forEach((folder) => {
            const { id } = folder;
            const folderToFileMapToTree = convertFileMapToTree('root', '', fileMap);
            const nodeTree = findNodeByIdInTree(folderToFileMapToTree, id);
            const files = getFilesFromATree(nodeTree);
            const formatFiles = files.map(({ metadata, ...rest }) =>
              'asset_key' in metadata ? { metadata, ...rest } : { ...rest, isDir: false }
            );
            moveFiles(formatFiles, folder, fileMap.unpublished);
          });

          deleteFolders(selectedFiles);
        }
      } else if (data.id === 'rename_folder') {
        if (hasPublishFolder) {
          alert('You can not rename Unpublished folder');
        } else {
          const [currentFolderToRename] = data.state.selectedFiles;
          const { name: folderName } = currentFolderToRename;
          const newFolderName = prompt('Please enter a new name for the folder', folderName);
          const newFolderNameLength = newFolderName.trim().length;
          if (newFolderNameLength && newFolderName.trim() !== folderName) {
            renameFolder(currentFolderToRename, newFolderName);
          }
        }
      } else if (data.id === 'open_file_custom') {
        const [fileSelected] = data.state.selectedFiles;
        const { isSaved, metadata = {} } = fileSelected;
        if (isSaved) {
          const { external_url } = metadata;
          window.open(external_url, '_blank');
        } else {
          alert('Please select a file that has been saved previously');
        }
      } else if (data.id === ChonkyActions.DeleteFiles.id) {
        deleteFiles(data.state.selectedFilesForAction);
      } else if (data.id === ChonkyActions.MoveFiles.id) {
        moveFiles(data.payload.files, data.payload.source, data.payload.destination);
      } else if (data.id === ChonkyActions.CreateFolder.id) {
        const folderName = prompt('Provide the name for your new folder:');
        if (folderName) createFolder(folderName);
      } else if (data.id === ChonkyActions.UploadFiles.id) {
        addFile();
      } else if (data.id === ChonkyActions.DownloadFiles.id) {
        const { selectedFiles } = data.state;
        if (selectedFiles.length === 1 && selectedFiles[0].isSaved) {
          const [fileData] = selectedFiles;
          downloadFile(fileData);
        }

        if (selectedFiles.length === 1 && !selectedFiles[0].isSaved) {
          alert('The file to download must be saved');
        }

        if (selectedFiles.length > 1) {
          downloadFiles(selectedFiles);
        }
      } else if (data.id === 'add_date_visibility_files') {
        if (hasPublishFolder) {
          alert('You can not set dates for Unpublished folder');
        } else {
          const [fileSelected] = data.state.selectedFiles;
          const fileSelectedFormatted = decamelizeKeys(fileSelected);
          setDate(fileSelected);
        }
      } else if (data.id === 'remove_date_visibility_files') {
        const { selectedFiles } = data.state;
        removeDateVisibityFiles(selectedFiles);
        handleClearSelection();
      }
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId, fileMap]
  );
};
