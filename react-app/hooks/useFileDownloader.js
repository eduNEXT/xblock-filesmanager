import { useState } from 'react';
import { getBlobFile } from '@services/fileService';

const useFileDownloader = ({ onError, onFileDownloaded}) => {
  const [, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadFileHook = async (fileUrl, fileName) => {

    setIsLoading(true);

    try {
      const { data } = await getBlobFile(fileUrl);
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);

      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);

      a.click();

      window.URL.revokeObjectURL(url);

      onFileDownloaded();
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
