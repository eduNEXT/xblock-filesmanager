import useSWRImmutable from 'swr/immutable';
import FileManager from '@components/FileManager';
import { getDirectories } from '@services/directoriesService';
import { convertTreeToNewFileMapFormat } from '@components/FileManager/utils';
import ErrorMessage from '@components/ErrorMessage';
import Spinner from '@components/Spinner';
import Collapse from '@components/Collapse';
import xBlockContext from '@constants/xBlockContext';

import {
  basicDescriptionInstructionsCms,
  basicDescriptionInstructionsLms,
  advancedDescriptionInstructions,
  basicShortCuts,
  basicNotes,
  advancedShortCuts,
  advancedNotes
} from './constants';
import { addIdToItems } from './utils';
import './App.scss';

const App = () => {
  const { data, error, isLoading } = useSWRImmutable('/api/directories', getDirectories, {
    errorRetryCount: 0
  });

  const { isEditView } = xBlockContext;
  const { data: xblockHandlerResponse } = data || {};
  const { contents } = xblockHandlerResponse || { contents: {} };
  const contentHasId = 'id' in contents && contents.id !== null;
  const directoryTree = contentHasId ? convertTreeToNewFileMapFormat(contents, true, isEditView) : {};
  const rootFolderId = contentHasId ? contents.id : null;
  const errorHandlerDirectoriesMessage = gettext('There was an error while processing the directories tree');
  const shortCutsList = isEditView ? addIdToItems(advancedShortCuts) : addIdToItems(basicShortCuts);
  const notesList = isEditView ? addIdToItems(advancedNotes) : addIdToItems(basicNotes);
  const basicDescriptionInstructions = isEditView ? basicDescriptionInstructionsCms : basicDescriptionInstructionsLms;
  const descriptionInstructions = isEditView ? advancedDescriptionInstructions : basicDescriptionInstructions;

  if (error) return <ErrorMessage message={errorHandlerDirectoriesMessage} />;
  if (isLoading) return <Spinner />;

  return (
    <div className="filesmanager__app">
      <Collapse title={gettext('Instructions')}>
        <p className="instructions-description">{gettext(descriptionInstructions)}</p>
        <h4 className="instructions-title">{gettext('Shortcuts')}</h4>
        <ul className="instructions-list">
          {shortCutsList.map(({ id, name }) => (
            <li key={id}>{gettext(name)}</li>
          ))}
        </ul>
        <h4 className="instructions-title">{gettext('Notes')}</h4>
        <ul className="instructions-list">
          {notesList.map(({ id, name }) => (
            <li key={id}>{gettext(name)}</li>
          ))}
        </ul>
      </Collapse>
      <FileManager rootFolderId={rootFolderId} baseFileMap={directoryTree} />
    </div>
  );
};

export default App;
