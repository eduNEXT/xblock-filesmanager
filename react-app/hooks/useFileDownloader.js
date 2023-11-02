import { useState } from 'react';
import { getBlobFile } from '@services/fileService';

const useFileDownloader = ({ onError, onDownloaded}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadFileHook = async (fileUrl, fileName) => {
    // Extract the file extension from the fileName
    //const fileExtension = fileName.split('.').pop().toLowerCase();
    setIsLoading(true);

    try {
      const { data } = await getBlobFile(fileUrl);
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);

      a.click();

      window.URL.revokeObjectURL(url);

      onDownloaded();

      // Clean up by removing the anchor element
      document.body.removeChild(a);
    } catch (error) {
      onError();
    }finally {
      setIsLoading(false);
    }
  };

  return { downloadFileHook, isLoading };
};

export default useFileDownloader;
