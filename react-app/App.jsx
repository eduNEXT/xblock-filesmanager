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

  const { data: xblockHandlerResponse } = data || {};
  const { contents } = xblockHandlerResponse || { contents: {} };
  const contentHasId = 'id' in contents && contents.id !== null;
  const directoryTree = contentHasId ? convertTreeToNewFileMapFormat(contents, true) : {};
  const rootFolderId = contentHasId ? contents.id : null;
  const errorHandlerDirectoriesMessage = gettext('There was an error during processing the directories tree');

  if (error) return <ErrorMessage message={errorHandlerDirectoriesMessage} />;
  if (isLoading) return <Spinner />;

  return (
    <div className="filesmanager__app">
      <FileManager rootFolderId={rootFolderId} baseFileMap={directoryTree} />
    </div>
  );
};

export default App;
