import useSWRImmutable from 'swr/immutable';
import FileManager from '@components/FileManager';
import { getDirectories } from '@services/directoriesService';
import xBlockContext from '@constants/xBlockContext';

import './App.css';


// {data: {}, error: null, isLoading: false};
const App = () => {
  const { data, error, isLoading } = useSWRImmutable('/api/content', getDirectories);
  const { isEditView } = xBlockContext;

  if(!isEditView) return <div>Xblock FIles manager</div>;
  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return (
    <div className="test-div">
      <h1 className="title">Files Manager</h1>
      <FileManager />
    </div>
  );
};

export default App;
