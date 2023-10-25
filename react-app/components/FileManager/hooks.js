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

export const useCustomFileMap = (prepareCustomFileMap) => {
  const { baseFileMap, rootFolderId } = useMemo(prepareCustomFileMap, []);
  console.log('baseFileMap', baseFileMap);

  const [fileMap, setFileMap] = useState(baseFileMap);
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId);

  const resetFileMap = useCallback(() => {
    setFileMap(baseFileMap);
    setCurrentFolderId(rootFolderId);
  }, [baseFileMap, rootFolderId]);

  const currentFolderIdRef = useRef(currentFolderId);
  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  const deleteFiles = useCallback((files) => {
    setFileMap((currentFileMap) => {
      const newFileMap = { ...currentFileMap };

      files.forEach((file) => {
        delete newFileMap[file.id];

        if (file.parentId) {
          const parent = newFileMap[file.parentId];
          const newChildrenIds = parent.childrenIds.filter((id) => id !== file.id);
          console.log('parent.children', parent.children);
          //const newChildrenNodes = parent.children.filter(({ id }) => id !== file.id);
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

      const newFolderId = `folder-${folderName}-${idCounter.current++}`;
      const newFolderContent = {
        id: newFolderId,
        name: folderName,
        isDir: true,
        modDate: new Date(),
        parentId: currentFolderIdRef.current,
        path: `/${parentName}`,
        isNew: true,
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

      const newFileId = `file-${fileName}-${idCounter.current++}`;
      const newFileContent = {
        id: newFileId,
        name: fileName,
        isDir: false,
        modDate: new Date(),
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

export const useFileActionHandler = (setCurrentFolderId, deleteFiles, moveFiles, createFolder, addFile) => {
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
      }

      //showActionNotification(data);
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId]
  );
};
