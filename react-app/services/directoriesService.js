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
