import apiConfig from '@config/api';

export const getBlobFile = (url) => {
  return apiConfig.post(url, {}, {
    responseType: "blob",
  });
}
