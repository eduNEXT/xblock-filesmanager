import { v4 as uuidv4 } from 'uuid';

export const prepareCustomFileMap = () => {
  const rootFolderId = uuidv4();
  const baseFileMap = {
    [rootFolderId]: {
      id: rootFolderId,
      name: 'Root',
      isDir: true,
      childrenIds: [],
      childrenCount: 0,
      children: []
    }
  };

  return { baseFileMap, rootFolderId };
};
