import useSWRImmutable from 'swr/immutable';
import FileManager from '@components/FileManager';
import { getDirectories } from '@services/directoriesService';
import { convertTreeToNewFileMapFormat } from '@components/FileManager/utils';
import ErrorMessage from '@components/ErrorMessage';
import Spinner from '@components/Spinner';

import './App.scss';

const App = () => {
  const { data, error, isLoading } = useSWRImmutable('/api/directories', getDirectories, {
    errorRetryCount: 0
  });

  const { data: apiResponse } = data || {};
  const { contents } = apiResponse || { contents: {} };
  const contentHasId = 'id' in contents && contents.id !== null;
  const formatResponse = contentHasId ? convertTreeToNewFileMapFormat(contents, true) : {};
  const rootFolderId = contentHasId ? contents.id : null;

  if (error) return <ErrorMessage message="failed to load" />;
  if (isLoading) return <Spinner />;

  return (
    <div className="filesmanager__app">
      <h1 className="title">Files Manager</h1>
      <FileManager rootFolderId={rootFolderId} baseFileMap={formatResponse} />
    </div>
  );
};

export default App;
