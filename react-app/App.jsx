import { useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';
import FileManager from '@components/FileManager';
import { getDirectories } from '@services/directoriesService';
import xBlockContext from '@constants/xBlockContext';
import { convertTreeToNewFileMapFormat } from '@components/FileManager/utils';

import './App.css';

// {data: {}, error: null, isLoading: false};
const App = () => {
  const { data, error, isLoading } = useSWRImmutable('/api/content', getDirectories);
  const { isEditView } = xBlockContext;
  const { data: apiResponse } = data || {};
  const { contents } = apiResponse || { contents: {} };
  const contentHasId = 'id' in contents && contents.id !== null;
  const formatResponse = contentHasId ? convertTreeToNewFileMapFormat(contents, true) : {};
  const rootFolderId = contentHasId ? contents.id : null;

  if (!isEditView) return <div>Xblock FIles manager</div>;
  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return (
    <div className="test-div">
      <h1 className="title">Files Manager</h1>
      <FileManager rootFolderId={rootFolderId} baseFileMap={formatResponse} />
    </div>
  );
};

export default App;
