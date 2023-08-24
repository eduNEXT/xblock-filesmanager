/* Javascript for FilesManagerXBlock. */
function FilesManagerXBlock(runtime, element) {

    function updateCount(result) {
        $('.count', element).text(result.count);
    }

    var handlerUrl = runtime.handlerUrl(element, 'increment_count');

    $('p', element).click(function(eventObject) {
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"hello": "world"}),
            success: updateCount
        });
    });

    $(function ($) {
        /*
        Use `gettext` provided by django-statici18n for static translations

        var gettext = FilesManagerXBlocki18n.gettext;
        */

        /* Here's where you'd do things on page load. */
        const root = ReactDOM.createRoot(element);  // or maybe in a child div of element
        root.render(<h1>Hello, world!</h1>);
    });
}
