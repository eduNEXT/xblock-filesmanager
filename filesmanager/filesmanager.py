"""Definition for the Files Manager XBlock."""
import logging
import os
import pkg_resources
import re
from django.conf import settings
from django.utils import translation
from webob.response import Response
from xblock.core import XBlock
from xblock.fields import List, Scope
from xblock.fragment import Fragment
from xblockutils.resources import ResourceLoader

from http import HTTPStatus
from urllib.parse import urljoin


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
COURSE_ASSETS_PAGE_SIZE = 100


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
        default=[
            {
                "name": "unpublished",
                "type": "directory",
                "path": "unpublished",
                "metadata": {},
                "children": [],
            }
        ],
        scope=Scope.settings,
        help="List of directories to be displayed in the Files Manager."
    )

    content_ids = List(
        default=[],
        scope=Scope.settings,
        help="List of content IDs to be displayed in the Files Manager."
    )

    @property
    def block_id(self):
        """
        Return the usage_id of the block.
        """
        return str(self.scope_ids.usage_id)

    @property
    def block_id_parsed(self):
        """
        Return the usage_id of the block parsed which means all after '@' symbol.
        """
        return str(self.scope_ids.usage_id.block_id)

    def read_file(self, path: str):
        """Helper for reading a file using a relative path"""
        file_content = ''
        BASE_DIR = os.path.abspath(os.path.dirname(__file__))
        file_path = os.path.join(BASE_DIR, path)

        try:
            with open(file_path, 'r') as file_data:
                file_content = file_data.read()

        except FileNotFoundError as e:
            log.exception(e)

        return file_content

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
        # Main function name for the XBlock
        js_xblock_function = f"XBlockMain{self.block_id_parsed}"
        react_app_root_id = f"files-manager-app-root-{self.block_id_parsed}"

        # Read the JavaScript content from the bundle file
        js_content = self.read_file("static/html/bundle.js")
        if js_content:
            # Replace the default React app root with the new one and update the main function name
            new_content = js_content.replace('files-manager-app-root', react_app_root_id)
            js_content = new_content.replace('FilesManagerXBlock', js_xblock_function)

        # Create the HTML fragment with the React app and JavaScript
        html = f"<div id='{react_app_root_id}'></div><script defer='defer'>{js_content}</script>"
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        # Define the main function for the XBlock
        js_main_function = f"Main_{js_xblock_function}"

        # Define the parsed JavaScript content
        js_content_parsed = (
           f"function {js_main_function}(runtime, element, context) {{"
           f"{js_xblock_function}(runtime, element, context);"
           "}")

        # Handle the case where there's an error getting the bundle file
        if not js_content:
            js_content_parsed = (
                f"function {js_main_function}(runtime, element, context) {{"
                "console.error('Something went wrong with XBlock rendering');"
                "}")

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
           frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        js_context  = {
           "xblock_id": self.block_id,
            "is_edit_view": False
        }

        frag.add_javascript(js_content_parsed)
        frag.initialize_js(js_main_function, json_args=js_context)
        return frag

    def studio_view(self, context=None):
        """
        The edit view of the FilesManagerXBlock in Studio.
        """
        if context:
           pass  # TO-DO: do something based on the context.

        # Main function name for the XBlock
        js_xblock_function = f"XBlockMainEdit{self.block_id_parsed}"
        react_app_root_id = f"files-manager-app-root-{self.block_id_parsed}-edit"

        # Read the JavaScript content from the bundle file
        js_content = self.read_file("static/html/bundle.js")
        if js_content:
            # Replace the default React app root with the new one and update the main function name
            new_content = js_content.replace('files-manager-app-root', react_app_root_id)
            js_content = new_content.replace('FilesManagerXBlock', js_xblock_function)

        # Create the HTML fragment with the React app and JavaScript
        html = f"<div id='{react_app_root_id}'></div><script defer='defer'>{js_content}</script>"
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        # Define the main function for the XBlock
        js_main_function = f"Main_{js_xblock_function}"

        # Define the parsed JavaScript content
        js_content_parsed = (
           f"function {js_main_function}(runtime, element, context) {{"
           f"{js_xblock_function}(runtime, element, context);"
           "}")

        # Handle the case where there's an error getting the bundle file
        if not js_content:
            js_content_parsed = (
                f"function {js_main_function}(runtime, element, context) {{"
                "console.error('Something went wrong with XBlock rendering');"
                "}")

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
           frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        js_context  = {
           "xblock_id": self.block_id,
            "is_edit_view": True
        }

        frag.add_javascript(js_content_parsed)
        frag.initialize_js(js_main_function, json_args=js_context)
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

        All the directories will be removed except the unpublished directory,
        and assets from the course will be added to the unpublished directory.

        Returns: an empty list of directories.
        """
        self.initialize_unpublished_directory()
        self.prefill_directories()
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
    def add_directories(self, data, suffix=''):
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
        directories = data.get("directories")
        if not directories:
            return {
                "status": "error",
                "message": "Directories not found in the request",
            }
        for directory in directories:
            directory_name = directory.get("name")
            path = directory.get("path")
            target_directory = self.get_target_directory(path)
            if target_directory is None:
                return {
                    "status": "error",
                    "message": "Target directory not found",
                }
            directory_path = f"{path}/{directory_name}" if path else directory_name
            if directory_path in self.content_ids:
                return {
                    "status": "error",
                    "message": f"Directory {directory_name} already exists",
                }
            self.content_ids.append(directory_path)
            target_directory.append(
                {
                    "name": directory_name,
                    "type": "directory",
                    "path": directory_path,
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
            from cms.djangoapps.contentstore.views.assets import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel
        except ImportError:
            from cms.djangoapps.contentstore.asset_storage_handler import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel
        target_path = request.params.get("path")
        target_directory = self.get_target_directory(target_path)
        if target_directory is None:
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
            file_path = f"{target_path}/{file.filename}" if target_path else file.filename
            if file_path in self.content_ids:
                return Response(
                    status=HTTPStatus.CONFLICT,
                    json_body={
                        "status": "error",
                        "message": "File already exists",
                    }
                )
            try:
                content = update_course_run_asset(self.course_id, file.file)
                self.content_ids.append(file_path)
                target_directory.append(
                    {
                        "name": file.filename,
                        "type": "file",
                        "path": file_path,
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
            paths: list of paths of the content to be deleted.

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

    @XBlock.json_handler
    def fill_directories(self, data, suffix=''):
        """Fill the directories list with the content of the course assets.

        This unorganized content will be added to the unpublished directory, which is the first
        directory in the directory list.

        Returns: None.
        """
        self.prefill_directories()
        return {
            "status": "success",
            "content": self.directories,
        }

    def initialize_unpublished_directory(self):
        """Initialize the unpublished directory.

        Returns: None.
        """
        self.directories = [
            {
                "name": "unpublished",
                "type": "directory",
                "path": "unpublished",
                "metadata": {},
                "children": [],
            }
        ]

    def prefill_directories(self):
        """Prefill the directories list with the content of the course assets.

        This unorganized content will be added to the unpublished directory, which is the first
        directory in the list.

        Returns: None.
        """
        unpublished_directory = self.directories[0]
        all_course_assets = self.get_all_serialized_assets()
        for course_asset in all_course_assets:
            content, _, _ = self.get_content_by_name(course_asset["display_name"], self.directories)
            if not content:
                unpublished_directory["children"].append(
                    {
                        "name": course_asset["display_name"],
                        "type": "file",
                        "path": f"unpublished/{course_asset['display_name']}",
                        "metadata": course_asset,
                    }
                )

    def get_all_serialized_assets(self):
        """Get all the serialized assets for a given course.

        Arguments:
            course_key: the course key of the course.
            options: the options for the query.

        Returns: the serialized assets.
        """
        current_page = 0
        start = current_page * COURSE_ASSETS_PAGE_SIZE
        serialized_course_assets = []
        while True:
            course_assets_for_page, _ = contentstore().get_all_content_for_course(
                self.course_id,
                start=current_page * COURSE_ASSETS_PAGE_SIZE,
                maxresults=COURSE_ASSETS_PAGE_SIZE,
                sort=None,
                filter_params={},
            )
            if not course_assets_for_page:
                break
            for content in course_assets_for_page:
                if isinstance(content, dict):
                    serialized_course_assets.append(self.get_asset_json_from_dict(content))
                    continue
                serialized_course_assets.append(self.get_asset_json_from_content(content))
            start += COURSE_ASSETS_PAGE_SIZE
            current_page += 1
        return serialized_course_assets


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
                return
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

    def get_asset_json_from_dict(self, asset):
        """Transform the asset dictionary into a JSON serializable object."""
        asset_url = StaticContent.serialize_asset_key_with_slash(asset["asset_key"])
        thumbnail_url = self._get_thumbnail_asset_key(asset)
        return {
            "id": asset["_id"],
            "asset_key": str(asset["asset_key"]),
            "display_name": asset["displayname"],
            "url": str(asset_url),
            "content_type": asset["contentType"],
            "file_size": asset["length"],
            "external_url": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), asset_url),
            "thumbnail": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), thumbnail_url),
        }

    def _get_thumbnail_asset_key(self, asset):
        """Return the thumbnail asset key."""
        thumbnail_location = asset.get('thumbnail_location', None)
        thumbnail_asset_key = None

        if thumbnail_location:
            thumbnail_path = thumbnail_location[4]
            thumbnail_asset_key = self.course_id.make_asset_key('thumbnail', thumbnail_path)
        return str(thumbnail_asset_key)

    def get_content_by_name(self, name, parent_content):
        """Get the (content, index, parent directory) for a given content name.

        Arguments:
            name: the name of the content to be retrieved.
            parent_directory: the parent directory of the content to be retrieved.

        Returns: the content, the index of the content in the parent directory and the parent directory.
        """
        for index, content in enumerate(parent_content):
            if content["name"] == name:
                return content, index, parent_content
            if content["type"] == "directory":
                content, index, parent_content = self.get_content_by_name(name, content["children"])
                if content:
                    return content, index, parent_content
        return None, None, None

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
            from cms.djangoapps.contentstore.asset_storage_handler import \
                delete_asset  # pylint: disable=import-outside-toplevel
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
