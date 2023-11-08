import apiConfig from '@config/api';
import xBlockContext from '@constants/xBlockContext';

export const getDirectories = () => {
  const { element: globalElement } = xBlockContext;
  const directoriesGetterHandler = xBlockContext.runtime.handlerUrl(globalElement, 'get_directories');
  return apiConfig.post(directoriesGetterHandler, { paths: ['Root']});
}

export const syncContent = (formData) => {
  const { element: globalElement } = xBlockContext;
  const createContentHandler = xBlockContext.runtime.handlerUrl(globalElement, 'sync_content');
  return apiConfig.post(createContentHandler, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

export const deleteContent = (assetKeysToDelete) => {
  const { element: globalElement } = xBlockContext;
  const createContentHandler = xBlockContext.runtime.handlerUrl(globalElement, 'delete_content');
  return apiConfig.post(createContentHandler, assetKeysToDelete);
}

export const downloadContent = (assetKeysToDownload) => {
  const { element: globalElement } = xBlockContext;
  const handler = xBlockContext.runtime.handlerUrl(globalElement, 'download_content');
  return apiConfig.post(handler, assetKeysToDownload);
}

export const downloadStatus = (taskID) => {
  const { element: globalElement } = xBlockContext;
  const handler = xBlockContext.runtime.handlerUrl(globalElement, 'download_status');
  return apiConfig.post(handler, { task_id: taskID });
}
