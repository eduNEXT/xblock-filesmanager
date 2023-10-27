const fileMapObject = {
    qwerty123456: {
      id: 'qwerty123456',
      name: 'Root',
      isDir: true,
      childrenIds: ['abc123', 'def456', 'ghi789'],
      childrenCount: 3,
      children: []
    },
    abc123: {
      id: 'abc123',
      name: 'Graphic',
      isDir: true,
      childrenIds: ['xyz111', 'uvw222'],
      childrenCount: 2,
      children: [],
      parentId: 'qwerty123456'
    },
    def456: {
      id: 'def456',
      name: 'Videos',
      isDir: true,
      childrenIds: [],
      childrenCount: 0,
      children: [],
      parentId: 'qwerty123456'
    },
    ghi789: {
      id: 'ghi789',
      name: 'Images',
      isDir: true,
      childrenIds: ['mno333'],
      childrenCount: 1,
      children: [],
      parentId: 'qwerty123456'
    },
    xyz111: {
      id: 'xyz111',
      name: 'PNG',
      isDir: true,
      childrenIds: [],
      childrenCount: 0,
      children: [],
      parentId: 'abc123'
    },
    uvw222: {
      id: 'uvw222',
      name: 'Videos',
      isDir: true,
      childrenIds: [],
      childrenCount: 0,
      children: [],
      parentId: 'abc123'
    },
    mno333: {
      id: 'mno333',
      name: 'JPEG',
      isDir: true,
      childrenIds: ['f9b3b8472664'],
      childrenCount: 1,
      children: [],
      parentId: 'mno333'
    },
    f9b3b8472664: {
      id: 'f9b3b8472664',
      isDir: false,
      name: 'lerna-debug.log',
      size: 1119,
      modDate: '2020-10-24T17:48:39.866Z',
      parentId: 'mno333',
      metadata: {
        id: 'asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png',
        asset_key: 'asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png',
        display_name: 'Creo que mgta.png',
        url: '/asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png',
        content_type: 'image/png',
        file_size: '781136',
        external_url:
          'http://local.overhang.io:8000/asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png',
        thumbnail:
          'http://local.overhang.io:8000/asset-v1:demo+filemanager-v1+2023+type@thumbnail+block@Creo_que_mgta-png.jpg'
      }
    }
  };


  /*

   {
  "rootFolderId": "qwerty123456",
  "fileMap": {
    "qwerty123456": {
      "id": "qwerty123456",
      "name": "Root",
      "isDir": true,
      "childrenIds": ["f9b3b8472664"],
      "childrenCount": 6,
      "children": []
    },
    "f9b3b8472664": {
      "id": "f9b3b8472664",
      "isDir": false,
      "name": "lerna-debug.log",
      "size": 1119,
      "modDate": "2020-10-24T17:48:39.866Z",
      "parentId": "qwerty123456",
      "metadata": {
        "id": "asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png",
        "asset_key": "asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png",
        "display_name": "Creo que mgta.png",
        "url": "/asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png",
        "content_type": "image/png",
        "file_size": "781136",
        "external_url": "http://local.overhang.io:8000/asset-v1:demo+filemanager-v1+2023+type@asset+block@Creo_que_mgta.png",
        "thumbnail": "http://local.overhang.io:8000/asset-v1:demo+filemanager-v1+2023+type@thumbnail+block@Creo_que_mgta-png.jpg"
      }
    }
  }
}


  */

  /*

    /*const tree = convertFileMapToTree('qwerty123456', '', fileMapObject);

  console.log('convertFileMapToTree', tree);
  console.log('convertTreToNewFileMapFormat', convertTreToNewFileMapFormat(tree, fileMapObject));
  console.log(findNodeByIdInTree(tree, 'abc123'));
  console.log(JSON.stringify(tree, null, 2));

  /*function convertFileMapToTree(rootId, parentPath = '') {
    const node = fileMapObject[rootId];

    // Check if the node is a directory (has childrenIds) or a file (no childrenIds)
    const isDirectory = node.isDir === true;
    const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;

    const tree = {
      id: node.id,
      name: node.name,
      type: isDirectory ? 'directory' : 'file',
      path: nodePath,
      metadata: {},
      parentId: node.parentId || ''
    };

    if (isDirectory && node.childrenIds) {
      tree.children = [];
      node.childrenIds.forEach((childId) => {
        const childNode = convertFileMapToTree(childId, nodePath);
        tree.children.push(childNode);
      });
    }

    return tree;
  }

  function convertTreeToNewFileMap(node, parent = null, existingFileMap = {}) {
    const isDirectory = node.type === 'directory';

    const fileMapEntry = {
      id: node.id,
      name: node.name,
      isDir: isDirectory
    };

    if (isDirectory) {
      fileMapEntry.childrenIds = [];
      if (node.children) {
        for (const childNode of node.children) {
          const childEntry = convertTreeToNewFileMap(childNode, fileMapEntry, existingFileMap);
          fileMapEntry.childrenIds.push(childEntry.id);
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
      fileMapEntry.size = node.size;
      fileMapEntry.modDate = node.modDate;
    }

    existingFileMap[node.id] = fileMapEntry;

    return fileMapEntry;
  }

  // Usage example:
  const tree = convertFileMapToTree('qwerty123456');
  const newFileMapObject = {};
  convertTreeToNewFileMap(tree, null, newFileMapObject);
  const sortedFileMapObject = {};
  const originalKeys = Object.keys(fileMapObject);
  for (const key of originalKeys) {
    if (newFileMapObject[key]) {
      sortedFileMapObject[key] = newFileMapObject[key];
    }
  }

  console.log('sortedFileMapObject: ', sortedFileMapObject);
  console.log('fileMapObject: ', fileMapObject);
  const areEqual = _.isEqual(sortedFileMapObject, fileMapObject);

  console.log('Are the objects equal?', areEqual);

  function findDifferences(obj1, obj2) {
    for (const key in obj1) {
      if (_.isObject(obj1[key])) {
        if (!_.isEqual(obj1[key], obj2[key])) {
          //console.log(`Key: ${key}, Obj1:`, obj1[key], "Obj2:", obj2[key]);
          console.log('first if');
          console.log(JSON.stringify(obj1[key], null, 2));
          console.log(JSON.stringify(obj2[key], null, 2));
        }
      } else if (obj1[key] !== obj2[key]) {
        console.log('else if');
        console.log(JSON.stringify(obj1[key], null, 2));
        console.log(JSON.stringify(obj2[key], null, 2));
        console.log(`Key: ${key}, Value in Obj1:`, obj1[key], "Value in Obj2:", obj2[key]);
      }
    }
  } */

  //findDifferences(sortedFileMapObject, fileMapObject);

  //console.log(JSON.stringify(fileMapObject, null, 2));
  //console.log(JSON.stringify(sortedFileMapObject, null, 2));

  //const treeToFileMap = convertTreeToNewFileMap(tree);
  //console.log(tree);
  //console.log('**********************');
  //console.log(JSON.stringify(treeToFileMap, null, 2));

  // You can compare the generated treeToFileMap with the original fileMapObject
  //console.log(JSON.stringify(treeToFileMap) === JSON.stringify(fileMapObject));


