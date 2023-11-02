import _ from 'lodash';

const convertTreeToNewFileMap = (node, parent = null, newFileMapObject, isSaved = false) => {
  const isDirectory = node.type === 'directory';

  const fileMapEntry = {
    id: node.id,
    name: node.name,
    isDir: isDirectory,
    metadata: node.metadata || {},
    isSaved
  };

  if (isDirectory) {
    fileMapEntry.childrenIds = [];
    fileMapEntry.children = [];
    if (node.children) {
      for (const childNode of node.children) {
        const childEntry = convertTreeToNewFileMap(childNode, fileMapEntry, newFileMapObject, isSaved);
        fileMapEntry.childrenIds.push(childEntry.id);
        fileMapEntry.children.push(childEntry);
      }
    }
  }

  if (parent) {
    fileMapEntry.parentId = parent.id;
  }

  // Add the missing properties
  if (fileMapEntry.isDir) {
    fileMapEntry.childrenCount = fileMapEntry.childrenIds.length;
  } else {
    // Assuming you want to add size and modDate for files
    if (node.metadata) {
      fileMapEntry.size = node.metadata.file_size;
      //fileMapEntry.modDate = node.metadata.modDate;
    }
  }

  // Store the fileMapEntry in the newFileMapObject
  newFileMapObject[node.id] = fileMapEntry;

  return fileMapEntry;
};

export const convertTreeToNewFileMapFormat = (tree, isSaved = false) => {
  const newFileMapObject = {};
  const treeCloned = _.cloneDeep(tree);

  convertTreeToNewFileMap(treeCloned, null, newFileMapObject, isSaved);

  return newFileMapObject;
};

export const convertFileMapToTree = (rootId, parentPath = '', originalFileMapObject) => {
  const node = _.cloneDeep(originalFileMapObject[rootId]);

  // Check if the node is a directory (has childrenIds) or a file (no childrenIds)
  const isDirectory = node.isDir === true;
  const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;

  const tree = {
    id: node.id,
    name: node.name,
    type: isDirectory ? 'directory' : 'file',
    path: nodePath,
    metadata: node.metadata || {},
    parentId: node.parentId || ''
  };

  if (isDirectory && node.childrenIds) {
    tree.children = [];
    node.childrenIds.forEach((childId) => {
      const childNode = convertFileMapToTree(childId, nodePath, originalFileMapObject);
      tree.children.push(childNode);
    });
  }

  return tree;
};


export const  findNodeByIdInTree = (object, id) => {
  if (object.id === id) {
    return object;
  }

  if (object.children) {
    for (const child of object.children) {
      const foundObject = findNodeByIdInTree(child, id);
      if (foundObject) {
        return foundObject;
      }
    }
  }

  return null;
}
