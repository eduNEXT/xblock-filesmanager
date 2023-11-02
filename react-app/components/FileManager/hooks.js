import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileHelper,
  FileList,
  FileNavbar,
  FileToolbar,
  defineFileAction,
  setChonkyDefaults
} from 'chonky';
import { v4 as uuidv4 } from 'uuid';

import { convertFileMapToTree, convertTreToNewFileMapFormat, findNodeByIdInTree } from './utils';

export const useCustomFileMap = (prepareCustomFileMap) => {
  const { baseFileMap, rootFolderId } = useMemo(prepareCustomFileMap, []);
  const rootFolderIdFixed = rootFolderId;
  console.log('rootFolderIdFixed', rootFolderIdFixed);
  //console.log('baseFileMap', baseFileMap);

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
        // If the node has metadata means that was saved previously
        if (file.isSaved) {
          const { metadata: { asset_key } } = nodeTree;
          setAssetsKeyToDelete((prevPaths) => [...prevPaths, asset_key]);
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

  const moveFiles = useCallback((files, source, destination) => {
    setFileMap((currentFileMap) => {
      const newFileMap = { ...currentFileMap };
      const moveFileIds = new Set(files.map((f) => f.id));

      const newSourceChildrenIds = source.childrenIds.filter((id) => !moveFileIds.has(id));
      newFileMap[source.id] = {
        ...source,
        childrenIds: newSourceChildrenIds,
        childrenCount: newSourceChildrenIds.length
      };

      const newDestinationChildrenIds = [...destination.childrenIds, ...files.map((f) => f.id)];
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

  const idCounter = useRef(0);
  const createFolder = useCallback((folderName) => {
    setFileMap((currentFileMap) => {
      const newFileMap = { ...currentFileMap };
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
      //`folder-${folderName}-${idCounter.current++}`;
      //  modDate: new Date(),
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
      const newFileMap = { ...currentFileMap };
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
      //`file-${fileName}-${idCounter.current++}`;
      //  modDate: new Date(),
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

      console.log('newFileContent', newFileContent);

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
    createFile
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
  downloadFile
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
      } else if (data.id === ChonkyActions.DeleteFiles.id) {
        deleteFiles(data.state.selectedFilesForAction);
      } else if (data.id === ChonkyActions.MoveFiles.id) {
        moveFiles(data.payload.files, data.payload.source, data.payload.destination);
      } else if (data.id === ChonkyActions.CreateFolder.id) {
        const folderName = prompt('Provide the name for your new folder:');
        if (folderName) createFolder(folderName);
      } else if (data.id === ChonkyActions.UploadFiles.id) {
        // moveFiles(data.payload.files, data.payload.source, data.payload.destination);
        console.log('Hello My friend :D');
        addFile();
      } else if (data.id === ChonkyActions.DownloadFiles.id) {
        const { selectedFiles } = data.state;
        if (selectedFiles.length === 1) {
          // Download the file
          const [fileData] = selectedFiles;
          downloadFile(fileData);
        } else {
          alert('You must select a one file to download');
        }
        console.log('Download Folder Action - data: ', data);
      }

      //showActionNotification(data);
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId]
  );
};
