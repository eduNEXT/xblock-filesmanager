/* Javascript for FilesManagerXBlock. */
function FilesManagerXBlock(runtime, element) {

    var getDirectories = runtime.handlerUrl(element, 'get_directories');
    var clearDirectories = runtime.handlerUrl(element, 'clear_directories');
    var getAssetHandler = runtime.handlerUrl(element, 'get_content');
    var deleteContentHandler = runtime.handlerUrl(element, 'delete_content');
    var addDirectoryHandler = runtime.handlerUrl(element, 'add_directory');
    var uploadFilesHandler = runtime.handlerUrl(element, 'upload_files');
    var reorganizeContentHandler = runtime.handlerUrl(element, 'reorganize_content');


    $(element).find(`#get-directories`).click(function () {
        const data = {}
        $.post(getDirectories, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });

    $(element).find(`#clear-directories`).click(function () {
        const data = {}
        $.post(clearDirectories, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });

    $(element).find(`#file-upload`).submit(function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        $.post(
            {
                url: uploadFilesHandler,
                data: formData,
                processData: false,
                contentType: false,
                type: 'POST',
            }
        )
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });

    $(element).find(`#get-asset-by-path`).click(function () {
        const path = $(element).find("#content-path").val();
        const data = {
            "path": path,
        }
        $.post(getAssetHandler, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });

    $(element).find(`#delete-content`).click(function () {
        const paths = $(element).find("#content-delete-path").val();
        const data = {
            "paths": paths.split(",").map(path => path.trim()),
        }
        $.post(deleteContentHandler, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });

    $(element).find(`#reorganize-content`).click(function () {
        const source_path = $(element).find("#content-reorganize-source-path").val();
        const target_path = $(element).find("#content-reorganize-target-path").val();
        const new_index = $(element).find("#content-reorganize-index").val();
        const data = {
            "source_path": source_path,
            "target_path": target_path,
            "target_index": new_index,
        }
        $.post(reorganizeContentHandler, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error getting assets");
        });
    });


    $(element).find(`#add-directory`).click(function () {
        const directoryName = $(element).find("#directory-name").val();
        const directoryPath = $(element).find("#directory-path").val();
        const data = {
            "name": directoryName,
            "path": directoryPath,
        }
        $.post(addDirectoryHandler, JSON.stringify(data))
        .done(function (response) {
            console.log(response);
        })
        .fail(function () {
            console.log("Error adding directory");
        });
    });
}
