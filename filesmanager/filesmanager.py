"""Definition for the Files Manager XBlock."""
import json
import logging
import os
import pkg_resources
import re
from django.conf import settings
from django.utils import translation
from webob.response import Response
from xblock.core import XBlock
from xblock.fields import Dict, List, Scope, String
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

    directories = Dict(
        default=
        {
            "id": None,
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [
                # Commented in the meantime while we figure out how to integrate this folder into Chonky
                # {
                #     "name": "Unpublished",
                #     "type": "directory",
                #     "path": "Root/Unpublished",
                #     "metadata": {},
                #     "children": [],
                # }
            ],
        },
        scope=Scope.settings,
        help="List of directories to be displayed in the Files Manager."
    )

    content_paths = List(
        default=[],
        scope=Scope.settings,
        help="List of content paths to be displayed in the Files Manager."
    )

    temporary_uploaded_files = Dict(
        default={},
        scope=Scope.settings,
        help="List of temporary uploaded files."
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
        # self.prefill_directories()
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
        self.directories = {
            "id": self.directories["id"],
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [
                # Commented in the meantime while we figure out how to integrate this folder into Chonky
                # {
                #     "name": "Unpublished",
                #     "type": "directory",
                #     "path": "Root/Unpublished",
                #     "metadata": {},
                #     "children": [],
                # }
            ],
        }
        # self.prefill_directories()
        self.content_paths = []
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

    @XBlock.handler
    def sync_content(self, request, suffix=''):
        """Associate content to the Xblock state and course assets when necessary.

        This handler does the following:
        - Initialize the directories list with the content of the course assets.
        - Temporary save the uploaded files so we can reference them later.
        - Add new content to a target directory or to the root directory.
        - Clean the temporary uploaded files.
        - Return the content of the parent directory.

        Arguments:
            request: the request object containing the content to be added. The content can be
            directories or a files.
            Each request must contain the following parameters:
            - contents: the content to be added with the following format:
            {
                "rootFolderId": ...,
                "treeFolders": {
                    "id": "<rootFolderId>",
                    "name": "Root",
                    "type": "directory",
                    "path": "Root",
                    "parentId": "",
                    "metadata": {},
                    "children": [
                        {
                            "id": <folderId>,
                            "name": "Folder 1",
                            "type": "directory",
                            "path": "Root/Folder 1",
                            "parentId": "<rootFolderId>",
                            "children": [
                                {
                                    "id": <fileId>,
                                    "parentId": "<folderId>",
                                    "name": "File 1",
                                    "type": "file",
                                    "path": "Root/Folder 1/File 1",
                                }
                            ]
                        },
                    ]
            }

            - file(s): file(s) to be uploaded, in case the content to be added contains files.
        """
        try:
            self.initialize_directories()
            self.temporary_save_upload_files(request.params.items())
            contents = json.loads(request.params.get("contents", "{}"))
            if not contents:
                return Response(status=HTTPStatus.BAD_REQUEST)
            self.directories["id"] = contents.get("rootFolderId", "")
            self._create_content(contents.get("treeFolders", {}).get("children", []))
        except Exception as e:
            log.exception(e)
            return Response(status=HTTPStatus.INTERNAL_SERVER_ERROR)
        finally:
            self.clean_uploaded_files()
            # self.prefill_directories()
        return Response(
            json_body=self.get_formatted_content(),
            status=HTTPStatus.OK,
        )

    def initialize_directories(self):
        """Initialize the directories list with the content of the course assets.

        The directory data structure is initialized every time the sync_content method is called.

        Returns: None.
        """
        self.directories = {
            "id": None,
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [
                # Commented in the meantime while we figure out how to integrate this folder into Chonky
                # {
                #     "name": "Unpublished",
                #     "type": "directory",
                #     "path": "Root/Unpublished",
                #     "metadata": {},
                #     "children": [],
                # }
            ],
        }
        self.content_paths = []

    def _create_content(self, contents):
        """Add new content to a target directory or to the root directory.

        Arguments:
            contents: the content to be added.
        """
        if not contents:
            raise Exception("Contents not found in the request")
        for content in contents:
            path = content.get("path").rsplit("/", 1)[0]
            target_directory = self.get_target_directory(path)
            if target_directory is None:
                raise Exception("Target directory not found")
            if content.get("type") == "directory":
                self.create_directory(content, target_directory)
            elif content.get("type") == "file":
                self.upload_file_to_directory(content, target_directory)
            else:
                raise Exception("Content type not found")
        return {
            "status": "success",
            "content": target_directory,
        }

    def temporary_save_upload_files(self, uploaded_files):  # pylint: disable=unused-argument
        """Handler for file upload to the course assets.

        Arguments:
            request: the request object containing the files to be uploaded and the
            target directory path.

        Returns: the content of the target directory.
        """
        for content_type, file in uploaded_files:
            if not content_type.startswith("file"):
                continue
            self.temporary_uploaded_files[file.file.name] = file

    def clean_uploaded_files(self):
        """Clean the temporary uploaded files.

        Returns: None.
        """
        self.temporary_uploaded_files = {}

    def generate_content_path(self, base_path, name=None):
        """Generate a new file name if the file name already exists.
        Args:
            base_name (str): The content name to check.
        Returns:
            str: The new file name.
        """
        if base_path in self.content_paths:
            base_path = f"{base_path} ({len(self.content_paths)})"
            name = f"{name} ({len(self.content_paths)})"
        return base_path, name

    def upload_file_to_directory(self, file, target_directory):
        """Upload a file to a directory.

        Arguments:
            file: the file to be uploaded.
            target_directory: the target directory where the file will be uploaded.

        Returns: the content of the target directory.
        """
        try:
            from cms.djangoapps.contentstore.views.assets import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel
        except ImportError:
            from cms.djangoapps.contentstore.asset_storage_handler import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel

        file_object = self.temporary_uploaded_files.pop(file.get("name"), None)
        if not file_object:
            raise Exception("File not found in the temporary uploaded files")

        file_path, name = self.generate_content_path(file.get("path"), file_object.filename)
        file_object.file._set_name(name)

        content = update_course_run_asset(self.course_id, file_object.file)
        target_directory.append(
            {
                "id": file["id"],
                "parentId": file.get("parentId", ""),
                "name": name,
                "type": "file",
                "path": file_path,
                "metadata": self.get_asset_json_from_content(content),
            }
        )
        self.content_paths.append(file_path)

    def create_directory(self, directory, target_directory):
        """Create a directory.

         The new directory will:
        - Be added to the target directory, if found. Otherwise, an error will be returned.
        - Be added to the root directory if no target directory is specified.
        - Have a path composed by the target directory path and the directory name, this path
        will be unique.
        - Have an empty list of children unless the directory from the request contains children.

        Arguments:
            directory: the directory to be created.
            target_directory: the target directory where the new directory will be created.
        """
        directory_path, name = self.generate_content_path(directory["path"], directory["name"])
        target_directory.append(
            {
                "id": directory["id"],
                "parentId": directory.get("parentId", ""),
                "name": name,
                "type": "directory",
                "path": directory_path,
                "metadata": {},
                "children": [],
            }
        )
        self.content_paths.append(directory_path)

        for child in directory.get("children", []):
            if child.get("type") == "directory":
                self.create_directory(child, target_directory[-1]["children"])
            else:
                self.upload_file_to_directory(child, target_directory[-1]["children"])

    @XBlock.json_handler
    def delete_content(self, data, suffix=''):
        """Delete a content from the course assets.

        Arguments:
            paths: list of paths of the content to be deleted.

        Returns: the content of the parent directory.
        """
        contents = data.get("contents")
        if not contents:
            return {
                "status": "error",
                "message": "Path not found",
            }
        for content in contents:
            self.delete_asset(content)
        return {
            "status": "success",
        }

    def get_formatted_content(self):
        """Get the formatted content of the directories.

        Returns: the formatted content of the directories.
        """
        return {
            "rootFolderId": self.directories["id"],
            "treeFolders": self.directories,
        }

    def prefill_directories(self):
        """Prefill the directories list with the content of the course assets.

        This unorganized content will be added to the unpublished directory, which is the first
        directory in the list.

        Returns: None.
        """
        unpublished_directory = self.get_content_by_path("Root/Unpublished")[0]
        all_course_assets = self.get_all_serialized_assets()
        for course_asset in all_course_assets:
            content, _, _ = self.get_content_by_name(course_asset["display_name"], self.directories["children"])
            if not content:
                unpublished_directory["children"].append(
                    {
                        "name": course_asset["display_name"],
                        "type": "file",
                        "path": f"Unpublished/{course_asset['display_name']}",
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
        target_directory = self.directories["children"]
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
        if path == "Root":
            return self.directories, None, None
        path_tree = path.split("/")
        parent_directory = self.directories["children"]
        for directory in path_tree:
            for index, content in enumerate(parent_directory):
                if content["path"] == path:
                    return content, index, parent_directory
                if content["type"] == "directory" and content["name"] == directory:
                    parent_directory = content["children"]
                    break
        return None, None, None

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
