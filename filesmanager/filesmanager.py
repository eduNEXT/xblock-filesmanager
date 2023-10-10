"""Definition for the Files Manager XBlock."""
import logging

import pkg_resources
import re
from django.utils import translation
from xblock.core import XBlock
from xblock.fields import Integer, Scope, List
from xblock.fragment import Fragment
from xblockutils.resources import ResourceLoader

from urllib.parse import urljoin

from django.conf import settings

from http import HTTPStatus
from webob.response import Response

try:
    from cms.djangoapps.contentstore.exceptions import AssetNotFoundException
    from opaque_keys.edx.keys import AssetKey
    from openedx.core.djangoapps.site_configuration import helpers as configuration_helpers
    from xmodule.contentstore.content import StaticContent
    from xmodule.contentstore.django import contentstore
except ImportError:
    AssetNotFoundException = None
    configuration_helpers = None
    StaticContent = None
    contentstore = None
    AssetKey = None

log = logging.getLogger(__name__)

class FilesManagerXBlock(XBlock):
    """
    Xblock to manage files which live in the course assets.


    This xblock is intended to be used as a presentation layer for the course assets.
    It allows to add, delete and reorganize files and (virtual) directories in the course assets.
    It also allows to upload files to the course assets.

    Example of directories list:
    [
        {
            "name": "Folder 1",
            "type": "directory",
            "path": "Folder 1",
            "metadata": {
                "id": ..,
                ...
            },
            "children": [
                {
                    "name": "File 1",
                    "type": "file",
                    "path": "Folder 1/File 1"
                    "metadata": {
                        "id": ..,
                        "asset_key": ..,
                        "display_name": ..,
                        "url": ..,
                        "content_type": ..,
                        "file_size": ..,
                        "external_url": ..,
                        "thumbnail": ..,
                    },
                {
                    "name": "Folder 2",
                    "type": "directory",
                    "path": "Folder 1/Folder 2",
                    "metadata": {
                        "id": ..,
                        ...
                    },
                    "children": [
                        {
                            "name": "File 2",
                            "type": "file",
                            "path": "Folder 1/Folder 2/File 2"
                            "metadata": {
                                "id": ..,
                                "asset_key": ..,
                                "display_name": ..,
                                "url": ..,
                                "content_type": ..,
                                "file_size": ..,
                                "external_url": ..,
                                "thumbnail": ..,
                            },
                        }
                    ]
                }
            ]
    ]
    """

    directories = List(
        default=[],
        scope=Scope.settings,
        help="List of directories to be displayed in the Files Manager."
    )

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the FilesManagerXBlock, shown to students
        when viewing courses.
        """
        if context:
            pass  # TO-DO: do something based on the context.

        # Remove the bundle default generated by webpack
        script_to_remove = r'<script defer="defer" src="bundle.js"></script>'

        html = self.resource_string("static/html/index.html")
        html_without_script = re.sub(script_to_remove, '', html)
        frag = Fragment(html_without_script.format(self=self))
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        # Add i18n js
        # statici18n_js_url = self._get_statici18n_js_url()
        # if statici18n_js_url:
            #frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        # Adding the correct route of the bundle
        frag.add_javascript(self.resource_string("static/html/bundle.js"))
        frag.initialize_js('FilesManagerXBlock')

        return frag

    def studio_view(self, context=None):
        """
        The edit view of the FilesManagerXBlock in Studio.
        """
        html = self.resource_string("static/html/filesmanager.html")
        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
            frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        frag.add_javascript(self.resource_string("static/js/src/filesmanager.js"))
        frag.initialize_js('FilesManagerXBlock')
        return frag

    @XBlock.json_handler
    def get_directories(self, data, suffix=''):
        """Get the list of directories.


        Returns: the list of directories is stored in the XBlock settings.

        [
            {
                "name": "Folder 1",
                "type": "directory",
                "path": "Folder 1",
                "metadata": {
                    "id": ..,
                    ...
                },
                "children": [
                    ...
                ]
            }
        ]
        """
        return {
            "status": "success",
            "content": self.directories,
        }

    @XBlock.json_handler
    def clear_directories(self, data, suffix=''):
        """Clear the list of directories without removing files from course assets.

        This method is intended to be used for testing purposes.

        Returns: an empty list of directories.
        """
        self.directories = []
        return {
            "status": "success",
            "content": self.directories,
        }

    @XBlock.json_handler
    def get_content(self, data, suffix=''):
        """Get the content of a directory.

        Arguments:
            data: the path of the directory to be retrieved.

        Returns: the content of the directory if found, an empty sequence otherwise.
        """
        path = data.get("path")
        if not path:
            return {
                "status": "error",
                "message": "Path not found",
            }
        content, _, _ = self.get_content_by_path(path)
        return {
            "status": "success",
            "content": content,
        }

    @XBlock.json_handler
    def add_directory(self, data, suffix=''):
        """Add a directory to a target directory.

        The new directory will:
        - Be added to the target directory, if found. Otherwise, an error will be returned.
        - Be added to the root directory if no target directory is specified.
        - Have a unique incremental ID.
        - Have a path composed by the target directory path and the directory name.
        - Have an empty list of children.

        Arguments:
            name: the name and path of the directory to be added.
            path: the path of the target directory where the new directory will be added.
        """
        directory_name = data.get("name")
        path = data.get("path")
        target_directory = self.get_target_directory(path)
        if not target_directory:
            return {
                "status": "error",
                "message": "Target directory not found",
            }
        target_directory.append(
            {
                "name": directory_name,
                "type": "directory",
                "path": f"{path}/{directory_name}" if path else directory_name,
                "metadata": {},  # Empty for now but could be used to store the directory data needed by Chonky.
                "children": [],
            }
        )
        return {
            "status": "success",
            "content": target_directory,
        }

    @XBlock.handler
    def upload_files(self, request, suffix=''):  # pylint: disable=unused-argument
        """Handler for file upload to the course assets.

        Arguments:
            request: the request object containing the files to be uploaded and the
            target directory path.

        Returns: the content of the target directory.
        """
        # Temporary fix for supporting both contentstore assets management versions (master / Palm)
        try:
            from cms.djangoapps.contentstore.views.assets import update_course_run_asset  # pylint: disable=import-outside-toplevel
        except ImportError:
            from cms.djangoapps.contentstore.asset_storage_handler import update_course_run_asset  # pylint: disable=import-outside-toplevel
        path = request.params.get("path")
        target_directory = self.get_target_directory(path)
        if not target_directory:
            return Response(
                status=HTTPStatus.NOT_FOUND,
                json_body={
                    "status": "error",
                    "message": "Target directory not found",
                }
            )
        for content_type, file in request.params.items():
            if not content_type.startswith("file"):
                continue
            try:
                content = update_course_run_asset(self.course_id, file.file)
                target_directory.append(
                    {
                        "name": file.filename,
                        "type": "file",
                        "path": f"{path}/{file.filename}" if path else file.filename,
                        "metadata": self.get_asset_json_from_content(content),
                    }
                )
            except Exception as e:  # pylint: disable=broad-except
                log.exception(e)
                return Response(status=HTTPStatus.INTERNAL_SERVER_ERROR)

        return Response(
            status=HTTPStatus.OK,
            json_body=target_directory,
        )

    @XBlock.json_handler
    def reorganize_content(self, data, suffix=''):
        """Reorganize a content from a source path to a target path.

        Arguments:
            target_path: the path of the target directory where the content will be moved.
            source_path: the path of the source directory where the content is located.
            target_index: the index where the content will be inserted in the target directory.

        Returns: the content of the target directory.
        """
        target_path = data.get("target_path")
        source_path = data.get("source_path")
        target_index = data.get("target_index")
        if not target_path or not source_path:
            return {
                "status": "error",
                "message": "Path not found",
            }
        content, index, source_parent_directory = self.get_content_by_path(source_path)
        target_content, _, target_parent_directory = self.get_content_by_path(target_path)
        if not content or not target_content:
            return {
                "status": "error",
                "message": "Content not found",
            }
        new_content_path = f"{target_content['path']}/{content['name']}"
        del source_parent_directory[index]
        if target_index is None:
            target_content["children"].append(content)
        else:
            target_index = 0 if not target_index else int(target_index)
            new_target_content_directory_children = target_content["children"][:target_index]
            new_target_content_directory_children.append(content)
            new_target_content_directory_children.extend(target_content["children"][target_index:])
            target_content["children"] = new_target_content_directory_children
        self.update_content_path(content, new_content_path)
        return {
            "status": "success",
            "content": target_parent_directory,
        }

    @XBlock.json_handler
    def delete_content(self, data, suffix=''):
        """Delete a content from the course assets.

        Arguments:
            path: the path of the content to be deleted.

        Returns: the content of the parent directory.
        """
        paths = data.get("paths")
        if not paths:
            return {
                "status": "error",
                "message": "Path not found",
            }
        for path in paths:
            content, index, parent_directory = self.get_content_by_path(path)
            if content:
                del parent_directory[index]
                self.delete_content_from_assets(content)
        return {
            "status": "success",
        }

    def get_target_directory(self, path):
        """Get the target directory for a given path.

        Arguments:
            path: the path of the target directory.

        Returns: the target directory if found, the root directory otherwise.
        """
        target_directory = self.directories
        if path:
            target_directory, _, _ = self.get_content_by_path(path)
            if not target_directory:
                return {}
            target_directory = target_directory["children"]
        return target_directory

    def get_asset_json_from_content(self, content):
        """Serialize the content object to a JSON serializable object.

        Arguments:
            content: the content object to be serialized.

        Returns: the JSON serializable object.
        """
        asset_url = StaticContent.serialize_asset_key_with_slash(content.location)
        thumbnail_url = StaticContent.serialize_asset_key_with_slash(content.thumbnail_location)
        return {
            "id": str(content.get_id()),
            "asset_key": str(content.location),
            "display_name": content.name,
            "url": str(asset_url),
            "content_type": content.content_type,
            "file_size": content.length,
            "external_url": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), asset_url),
            "thumbnail": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), thumbnail_url),
        }

    def get_content_by_path(self, path):
        """Get the (content, index, parent directory) for a given content path.

        Arguments:
            path: the path of the content to be retrieved.

        Returns: the content, the index of the content in the parent directory and the parent directory.
        """
        path_tree = path.split("/")
        parent_directory = self.directories
        for directory in path_tree:
            for index, content in enumerate(parent_directory):
                if content["path"] == path:
                    return content, index, parent_directory
                if content["type"] == "directory" and content["name"] == directory:
                    parent_directory = content["children"]
                    break
        return None, None, None

    def update_content_path(self, content, path):
        """Update the path of a content.

        Arguments:
            content: the content to be updated.
            path: the new path of the content.

        Returns: the updated content.
        """
        content["path"] = path
        if content.get("type") == "directory":
            for child in content.get("children", []):
                self.update_content_path(child, f"{path}/{child['name']}")

    def delete_content_from_assets(self, content):
        """Delete a content from the course assets.

        Arguments:
            content: the content to be deleted.

        Returns: None.
        """
        if content.get("type") == "file":
            if asset_key := content.get("metadata", {}).get("asset_key"):
                self.delete_asset(asset_key)
                return
        for child in content.get("children", []):
            if asset_key := child.get("metadata", {}).get("asset_key"):
                self.delete_asset(asset_key)
                continue
            if child.get("type") == "directory":
                self.delete_content_from_assets(child)

    def delete_asset(self, asset_key):
        """Delete an asset from the course assets.

        Arguments:
            asset_key: the asset key of the asset to be deleted.

        Returns: None.
        """
        try:
            from cms.djangoapps.contentstore.views.assets import delete_asset  # pylint: disable=import-outside-toplevel
        except ImportError:
            from cms.djangoapps.contentstore.asset_storage_handler import delete_asset  # pylint: disable=import-outside-toplevel
        asset_key = AssetKey.from_string(asset_key)
        try:
            delete_asset(self.course_id, asset_key)
        except AssetNotFoundException as e:  # pylint: disable=broad-except
            log.exception(e)

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("FilesManagerXBlock",
             """<filesmanager/>
             """),
            ("Multiple FilesManagerXBlock",
             """<vertical_demo>
                <filesmanager/>
                <filesmanager/>
                <filesmanager/>
                </vertical_demo>
             """),
        ]

    @staticmethod
    def _get_statici18n_js_url():
        """
        Returns the Javascript translation file for the currently selected language, if any.
        Defaults to English if available.
        """
        locale_code = translation.get_language()
        if locale_code is None:
            return None
        text_js = 'public/js/translations/{locale_code}/text.js'
        lang_code = locale_code.split('-')[0]
        for code in (locale_code, lang_code, 'en'):
            loader = ResourceLoader(__name__)
            if pkg_resources.resource_exists(
                    loader.module_name, text_js.format(locale_code=code)):
                return text_js.format(locale_code=code)
        return None

    @staticmethod
    def get_dummy():
        """
        Dummy method to generate initial i18n
        """
        return translation.gettext_noop('Dummy')
