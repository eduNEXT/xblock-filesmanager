import React, { useEffect, useState } from "react";
import { setChonkyDefaults, FullFileBrowser, ChonkyActions } from "chonky";
import { ChonkyIconFA } from "chonky-icon-fontawesome";
import data from "./data";
import folderSearch from "./folderSearch.js";
import handleAction from "./chonkyActionHandler.js";
import { customActions } from "./chonkyCustomActions.js";

function ChonkyComponent() {
  // Define the handleActionWrapper function
  const handleActionWrapper = (data) => {
    handleAction(data, setCurrentFolder);
  };

  // Initialize Chonky defaults
  setChonkyDefaults({ iconComponent: ChonkyIconFA });

  // State variables
  const [currentFolder, setCurrentFolder] = useState("0");
  const [files, setFiles] = useState(null);
  const [folderChain, setFolderChain] = useState(null);

  // Define available file actions
  const fileActions = [...customActions, ChonkyActions.DownloadFiles];

  // Effect to update files and folder chain when current folder changes
  useEffect(() => {
    let folderChainTemp = [];
    let filesTemp = [];

    const [found, filesTemp1, folderChainTemp1] = folderSearch(
      data,
      folderChainTemp,
      currentFolder
    );

    if (found) {
      filesTemp = filesTemp1;
      folderChainTemp = folderChainTemp1;
    }

    setFolderChain(folderChainTemp);
    setFiles(filesTemp);
  }, [currentFolder]);

  return (
    <div className="App">
      <h1>Chonky example</h1>
      <FullFileBrowser
        files={files}
        folderChain={folderChain}
        defaultFileViewActionId={ChonkyActions.EnableListView.id}
        fileActions={fileActions}
        onFileAction={handleActionWrapper}
        disableDefaultFileActions={true}
      />
    </div>
  );
}

export default ChonkyComponent;

