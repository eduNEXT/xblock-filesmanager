const ExampleFolderData = () => {
  return {
    files: [
      {
        id: "1",
        name: "Normal file.yml",
        isDir: false,
        size: 890,
        modDate: new Date("2012-01-01")
      },
      {
        id: "2",
        name: "Hidden file.mp4",
        isDir: false,
        isHidden: true,
        size: 50000
      },
      {
        id: "3",
        name: "Normal folder",
        isDir: true,
        childrenCount: 12
      },
      {
        id: "7zp",
        name: "Encrypted file.7z",
        isEncrypted: true
      },
      {
        id: "mEt",
        name: "Text File.txt",
        isDir: false
      }
    ],
    currentPath: [
      { id: "zxc", name: "Folder", isDir: true, childrenCount: 12 },
      { id: "asd", name: "Another Folder", isDir: true }
    ]
  };
};

export default ExampleFolderData;
