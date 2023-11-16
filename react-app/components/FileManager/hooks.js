import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ChonkyActions, FileHelper } from 'chonky';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

import { convertFileMapToTree, findNodeByIdInTree, extractAssetKeys } from './utils';

export const useCustomFileMap = (prepareCustomFileMap) => {
  const { baseFileMap, rootFolderId } = useMemo(prepareCustomFileMap, []);
  const rootFolderIdFixed = rootFolderId;

  const [fileMap, setFileMap] = useState(baseFileMap);
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId);
  const [assetsKeyToDelete, setAssetsKeyToDelete] = useState([]);

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
      const currentFolderKeys = Object.keys(newFileMap);
      const parentId = currentFolderIdRef.current;

      const isFileAdded = currentFolderKeys.some(
        (key) => newFileMap[key].name === fileName && newFileMap[key].parentId === parentId
      );

      if (isFileAdded) {
        return newFileMap;
      }

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
    deleteFolders
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
  setCurrentFolderId,
  deleteFiles,
  moveFiles,
  createFolder,
  addFile,
  downloadFile,
  deleteFolders
) => {
  return useCallback(
    (data) => {
      if (data.id === ChonkyActions.OpenFiles.id) {
        const { targetFile, files } = data.payload;
        const fileToOpen = targetFile ?? files[0];
        if (fileToOpen && FileHelper.isDirectory(fileToOpen)) {
          setCurrentFolderId(fileToOpen.id);
          return;
        }
      } else if (data.id === 'delete_folder') {
        const hasPublishFolder = data.state.selectedFiles.some(({ id }) => id === 'unpublished');
        if (hasPublishFolder) {
          alert('You can not delete Unpublished folder');
        } else {
          deleteFolders(data.state.selectedFiles);
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
          alert('You must select a one file to download');
        }
      }
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId]
  );
};
