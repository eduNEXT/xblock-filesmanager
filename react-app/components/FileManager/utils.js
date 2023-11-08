import _ from 'lodash';

/**
 * Converts a tree structure to a new file map format and stores it in an object.
 *
 * @param {Object} node - The current node in the tree.
 * @param {Object} parent - The parent node.
 * @param {Object} newFileMapObject - The object to store the new file map format.
 * @param {boolean} isSaved - Indicates if the node is saved.
 * @returns {Object} - The file map entry for the current node.
 */
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

/**
 * Converts a tree structure to a new file map format.
 *
 * @param {Object} tree - The tree structure to convert.
 * @param {boolean} isSaved - Indicates if the nodes are saved.
 * @returns {Object} - The new file map format.
 */
export const convertTreeToNewFileMapFormat = (tree, isSaved = false) => {
  const newFileMapObject = {};
  const treeCloned = _.cloneDeep(tree);

  convertTreeToNewFileMap(treeCloned, null, newFileMapObject, isSaved);

  return newFileMapObject;
};

/**
 * Converts a file map to a tree structure.
 *
 * @param {string} rootId - The ID of the root node.
 * @param {string} parentPath - The path of the parent node.
 * @param {Object} originalFileMapObject - The original file map object.
 * @returns {Object} - The tree structure.
 */
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

/**
 * Finds a node by its ID in a tree structure.
 *
 * @param {Object} object - The tree structure to search.
 * @param {string} id - The ID of the node to find.
 * @returns {Object|null} - The found node or null if not found.
 */
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

/**
 * Recursively extracts asset keys from a tree structure of nodes.
 *
 * @param {Object} node - The current node in the tree to process.
 * @returns {string[]} An array of asset keys found in the tree.
 */
export const extractAssetKeys = (node) => {
  const assetKeys = [];

  if (node.metadata && node.metadata.asset_key) {
    assetKeys.push(node.metadata.asset_key);
  }

  if (node.children && node.children.length) {
    node.children.forEach((child) => {
      assetKeys.push(...extractAssetKeys(child));
    });
  }

  return assetKeys;
}
