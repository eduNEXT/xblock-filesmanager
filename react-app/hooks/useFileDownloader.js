import { useState } from 'react';
import { getBlobFile } from '@services/fileService';

/**
 * A custom React hook for downloading files from a given URL.
 *
 * @param {object} options - Hook configuration options.
 * @param {function} options.onError - Callback function to handle errors during the download process.
 * @param {function} options.onFileDownloaded - Callback function to execute after a file is successfully downloaded.
 *
 * @returns {object} - An object with the following properties:
 *   - downloadFileHook: A function that initiates the file download process.
 *   - isLoading: A boolean indicating whether the download process is in progress.
 */
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

      link.click();

      window.URL.revokeObjectURL(url);

      onFileDownloaded();
      // Clean up by removing the anchor element
      document.body.removeChild(link);
    } catch (error) {
      onError();
    }finally {
      setIsLoading(false);
    }
  };

  return { downloadFileHook, isLoading };
};

export default useFileDownloader;
