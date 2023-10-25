import apiConfig from '@config/api';
import xBlockContext from '@constants/xBlockContext';

export const getDirectories = () => {
  const { element: globalElement } = xBlockContext;
  const directoriesGetterHandler = xBlockContext.runtime.handlerUrl(globalElement, 'get_directories');
  return apiConfig.post(directoriesGetterHandler, {});
}

export const uploadFiles = (formData) => {
  const { element: globalElement } = xBlockContext;
  const uploadFilesHandler = xBlockContext.runtime.handlerUrl(globalElement, 'upload_files');
  return apiConfig.post(uploadFilesHandler, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}
