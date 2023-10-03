/* Javascript for FilesManagerXBlock. */
function FilesManagerXBlock(runtime, element) {

    var getDirectories = runtime.handlerUrl(element, 'get_directories');
    var getAssetHandler = runtime.handlerUrl(element, 'get_content');
    var addDirectoryHandler = runtime.handlerUrl(element, 'add_directory');


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

    $(element).find(`#get-asset-by-id`).click(function () {
        const id = $(element).find("#content-id").val();
        const type = $(element).find("#content-type").val();
        const path = $(element).find("#content-path").val();
        const data = {
            "content_id": id,
            "type": type,
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
