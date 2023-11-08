import apiConfig from '@config/api';

export const getBlobFile = (url) => {
  return apiConfig.get(url, {}, {
    responseType: "blob",
  });
}
