"""Definition for the Files Manager XBlock."""
import json
import logging
import os
import tempfile
from copy import deepcopy
from datetime import datetime
from http import HTTPStatus
from urllib.parse import urljoin

try:
    from importlib.resources import files
except ImportError:
    from importlib_resources import files
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import translation
from opaque_keys.edx.keys import AssetKey
from webob.response import Response
from xblock.core import XBlock
from xblock.fields import Dict, List, Scope

try:
    from xblock.fragment import Fragment
except ModuleNotFoundError:
    from web_fragments.fragment import Fragment

from filesmanager.processors.xapi.event_transformers import FilesDownloadedTransformer  # pylint: disable=unused-import
from filesmanager.tasks import create_zip_file_task

try:
    from cms.djangoapps.contentstore.exceptions import AssetNotFoundException
    from openedx.core.djangoapps.site_configuration import helpers as configuration_helpers
    from xmodule.contentstore.content import StaticContent
    from xmodule.contentstore.django import contentstore
except ImportError:
    AssetNotFoundException = None
    configuration_helpers = None
    StaticContent = None
    contentstore = None

log = logging.getLogger(__name__)
COURSE_ASSETS_PAGE_SIZE = 100
ATTR_KEY_ANONYMOUS_USER_ID = 'edx-platform.anonymous_user_id'
ALLOWED_BASE_FILE_METADATA_FIELDS = [
    "id",
    "asset_key",
    "display_name",
    "url",
    "content_type",
    "file_size",
    "external_url",
    "thumbnail",
    "uploaded_at",
    "from",
]


class NameTooLong(Exception):
    """
    Exception raised when the name of the file is too long.
    """


@XBlock.wants("user")
class FilesManagerXBlock(XBlock):
    """
    Xblock to manage files which live in the course assets.

    This xblock is intended to be used as a presentation layer for the course assets.
    It allows to add, delete and reorganize files and (virtual) directories in the course assets.
    It also allows to upload files to the course assets.

    ..note::

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
        default={
            "id": "root",
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [
                {
                    "id": "unpublished",
                    "parentId": "root",
                    "name": "Unpublished",
                    "type": "directory",
                    "path": "Root/Unpublished",
                    "metadata": {},
                    "children": [],
                }
            ],
        },
        scope=Scope.settings,
        help="Directory tree to be displayed in the Files Manager."
    )

    content_paths = List(
        default=[],
        scope=Scope.settings,
        help="List of content paths to be displayed in the Files Manager."
    )

    temporary_uploaded_files = List(
        default=[],
        scope=Scope.settings,
        help="List of temporary uploaded files."
    )

    source_keys = Dict(
        default={},
        scope=Scope.settings,
        help="List of source keys."
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

    def get_current_user(self):
        """
        Get the current user.
        """
        return self.runtime.service(self, "user").get_current_user()

    def read_file(self, path: str):
        """Read a file using a relative path."""
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
        return files(__package__).joinpath(path).read_text(encoding="utf-8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        Return the primary view of the FilesManagerXBlock, shown to students when viewing courses.
        """
        if context:
            pass  # TO-DO: do something based on the context.

        js_xblock_function = f"XBlockMain{self.block_id_parsed}"
        react_app_root_id = f"files-manager-app-root-{self.block_id_parsed}"

        js_content = self.read_file("static/html/bundle.js")
        if js_content:
            new_content = js_content.replace('files-manager-app-root', react_app_root_id)
            js_content = new_content.replace('FilesManagerXBlock', js_xblock_function)

        html = f"<div id='{react_app_root_id}'></div><script defer='defer'>{js_content}</script>"
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        js_main_function = f"Main_{js_xblock_function}"

        js_content_parsed = (
            f"function {js_main_function}(runtime, element, context) {{"
            f"{js_xblock_function}(runtime, element, context);"
            "}"
        )

        if not js_content:
            js_content_parsed = (
                f"function {js_main_function}(runtime, element, context) {{"
                "console.error('Something went wrong with XBlock rendering');"
                "}"
            )

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
            frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        user = self.get_current_user()

        js_context = {
            "xblock_id": self.block_id,
            "is_edit_view": False,
            "course_id": self.course_id,
            "user_id": user.opt_attrs.get("edx-platform.user_id"),
            "username": user.opt_attrs.get("edx-platform.username"),
        }

        frag.add_javascript(js_content_parsed)
        frag.initialize_js(js_main_function, json_args=js_context)
        return frag

    def studio_view(self, context=None):  # pylint: disable=unused-argument
        """
        Return the edit view of the FilesManagerXBlock in Studio.
        """
        js_xblock_function = f"XBlockMainEdit{self.block_id_parsed}"
        react_app_root_id = f"files-manager-app-root-{self.block_id_parsed}-edit"

        js_content = self.read_file("static/html/bundle.js")
        if js_content:
            new_content = js_content.replace('files-manager-app-root', react_app_root_id)
            js_content = new_content.replace('FilesManagerXBlock', js_xblock_function)

        html = f"<div id='{react_app_root_id}'></div><script defer='defer'>{js_content}</script>"
        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        js_main_function = f"Main_{js_xblock_function}"

        js_content_parsed = (
            f"function {js_main_function}(runtime, element, context) {{"
            f"{js_xblock_function}(runtime, element, context);"
            "}"
        )

        if not js_content:
            js_content_parsed = (
                f"function {js_main_function}(runtime, element, context) {{"
                "console.error('Something went wrong with XBlock rendering');"
                "}"
            )

        # Add i18n js
        statici18n_js_url = self._get_statici18n_js_url()
        if statici18n_js_url:
            frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        js_context = {
            "xblock_id": self.block_id,
            "is_edit_view": True
        }

        frag.add_javascript(js_content_parsed)
        frag.initialize_js(js_main_function, json_args=js_context)
        return frag

    @XBlock.json_handler
    def get_directories(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Get the list of directories.

        Returns: the list of directories is stored in the XBlock settings.

        ..note::

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
        # When outside the component edit view where there's anonymous user ID, remove unpublished directory
        if self.get_current_user().opt_attrs.get(ATTR_KEY_ANONYMOUS_USER_ID):
            dirs_for_student = deepcopy(self.directories)
            for directory in dirs_for_student["children"]:
                if directory["id"] == "unpublished":
                    dirs_for_student["children"].remove(directory)
                    break
            return {
                "status": "success",
                "contents": dirs_for_student,
            }

        self.fill_unpublished()
        self.sync_with_course_assets()
        return {
            "status": "success",
            "contents": self.directories,
        }

    @XBlock.json_handler
    def clear_directories(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Clear the list of directories without removing files from course assets.

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
                {
                    "id": "unpublished",
                    "parentId": self.directories["id"],
                    "name": "Unpublished",
                    "type": "directory",
                    "path": "Root/Unpublished",
                    "metadata": {},
                    "children": [],
                }
            ],
        }
        self.fill_unpublished()
        self.content_paths = []
        return {
            "status": "success",
            "contents": self.directories,
        }

    @XBlock.json_handler
    def get_content(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Get the content of a directory.

        Arguments:
            data: the path of the directory to be retrieved.
            suffix: the suffix of the request.

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
            "contents": content,
        }

    @XBlock.handler
    def sync_content(self, request, suffix=''):  # pylint: disable=unused-argument
        """
        Associate content to the Xblock state and course assets when necessary.

        This handler does the following:
        - Initialize the directories list with the content of the course assets.
        - Temporary save the uploaded files so we can reference them later.
        - Add new content to a target directory or to the root directory.
        - Clean the temporary uploaded files.
        - Return the content of the parent directory.

        Arguments:
            request: the request object containing the content to be added. The content can be
            directories or a files.
            file(s): file(s) to be uploaded, in case the content to be added contains files.
            suffix: the suffix of the request.

        ..note::

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
        """
        self.initialize_directories()
        self.temporary_save_upload_files(request.params.items())

        contents = json.loads(request.params.get("contents", "[]"))
        self.directories["id"] = contents.get("rootFolderId", "")

        try:
            self._sync_content(contents.get("treeFolders", {}).get("children", []))
        except NameTooLong as e:
            return Response(
                json_body={
                    "status": "ERROR",
                    "message": str(e),
                },
                status=HTTPStatus.BAD_REQUEST,
            )

        self.clean_uploaded_files()
        self.fill_unpublished()

        return Response(
            json_body=self.get_formatted_content(),
            status=HTTPStatus.OK,
        )

    def initialize_directories(self):
        """
        Initialize the directories list with the content of the course assets.

        The directory data structure is initialized every time the sync_content method is called.
        While initializing, the root/unpublished directory is created.

        Returns: None.
        """
        self.directories = {
            "id": "root",
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [],
        }
        self.content_paths = [
            "Root",
        ]

    def _sync_content(self, contents):
        """
        Add new content to a target directory or to the root directory.

        Arguments:
            contents: the content to be added.
        """
        target_directory = self.directories
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
        if not self.get_content_by_path("Root/Unpublished")[0]:
            raise Exception("Unpublished directory cannot be removed from the root directory")
        return {
            "status": "success",
            "contents": target_directory,
        }

    def sync_with_course_assets(self):
        """
        Sync files according to the course assets.

        This method does the following:
        - Get all files from the course assets.
        - Get all files from the directories list.
        - Compare the files from the course assets with the files from the directories list.
        - Remove the files that are in the directory list but not in the course assets.
        """
        course_assets_ids = [asset["id"] for asset in self.get_all_serialized_assets()]
        directories_files = self.get_all_files(self.directories["children"])
        for file in directories_files:
            if file["metadata"].get("id") not in course_assets_ids:
                self.delete_file_from_directory(file)
                asset_key = file["metadata"].get("asset_key")
                if asset_key in self.source_keys:
                    del self.source_keys[asset_key]

    def delete_file_from_directory(self, file):
        """
        Delete an file from a directory.

        Arguments:
            file: the file to be deleted.

        Returns: None.
        """
        content, index, parent_directory = self.get_content_by_path(file["path"])
        if content:
            del parent_directory[index]

    def get_all_files(self, directory):
        """
        Get all the files from a directory.

        Arguments:
            directory: the directory to be scanned.

        Returns: the list of files.
        """
        files = []
        for content in directory:
            if content["type"] == "file":
                files.append(content)
            else:
                files.extend(self.get_all_files(content["children"]))
        return files

    def temporary_save_upload_files(self, uploaded_files):
        """
        Save files for later upload to course assets.

        Arguments:
            uploaded_files: the list of files to be saved.

        Returns: the content of the target directory.
        """
        for content_type, file in uploaded_files:
            if not content_type.startswith("file"):
                continue
            self.temporary_uploaded_files.append(file)

    def clean_uploaded_files(self):
        """
        Clean the temporary uploaded files.

        Returns: None.
        """
        self.temporary_uploaded_files = []

    def generate_content_path(self, base_path, name=None):
        """
        Generate a new file name if the file name already exists.

        Args:
            base_name (str): The content name to check.
        Returns:
            str: The new file name.

        ..note::

                If the file name already exists, the new file name will be generated
                by adding a number at the end of the file name.

                Example:
                    - If the file name is "file.txt", the new file name will be "file (1).txt".
                    - If the file name is "file (1).txt", the new file name will be "file (2).txt".

        """
        if base_path in self.content_paths:
            counter = 1
            extension = name.split(".")[-1]
            base_name = name.replace(f".{extension}", "")
            base_file_path = base_path.split("/")
            del base_file_path[-1]
            base_file_path = "/".join(base_file_path)
            while True:
                new_path = f"{base_file_path}/{base_name} ({counter}).{extension}"
                counter += 1
                if new_path not in self.content_paths:
                    break

            base_path = new_path
            name = base_path.split("/")[-1]
        return base_path, name

    def upload_file_to_directory(self, file, target_directory):
        """
        Upload a file to a directory.

        Arguments:
            file: the file to be uploaded.
            target_directory: the target directory where the file will be uploaded.

        Returns: the content of the target directory.

        ..note::

                The file can be uploaded from the Files Manager or from the course assets.

                If the file is uploaded from the Files Manager:
                    - A new asset will be created in the course assets.
                    - A link to the course asset will be created in the Files Manager.

                If the file is uploaded from the course assets:
                    - A link to the course asset will be created in the Files Manager.
                    - No new asset will be created in the course assets.

                If the file is moved from a different directory:
                    - A new asset will be created in the course assets.
                    - A link to the course asset will be created in the Files Manager.
                    - As course assets can't be renamed, the original asset will be removed from the course assets.
        """
        try:
            from cms.djangoapps.contentstore.views.assets import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel
        except ImportError:
            from cms.djangoapps.contentstore.asset_storage_handler import \
                update_course_run_asset  # pylint: disable=import-outside-toplevel

        extra_metadata = self.get_extra_metadata(file.get("metadata", {}))
        metadata = self.get_metadata(file.get("metadata", {}))
        file["metadata"] = metadata
        file_object = self.find_temporary_file(file)
        file_path, name = file.get("path"), file.get("name")

        if file_object and not metadata:
            # New file uploaded from the Files Manager
            file_path, name = self.generate_content_path(file_path, file_object.filename)
            file_object.file._set_name(self.generate_asset_name(file_path))  # pylint: disable=protected-access
            content = update_course_run_asset(self.course_id, file_object.file)
            metadata = self.get_asset_json_from_content(content)
        elif not metadata.get("uploaded_at"):
            # File was uploaded from the course assets. Just create a link
            if "files-" not in metadata.get("asset_key"):
                file_path, name = self.generate_content_path(file_path, metadata.get("display_name"))
                metadata["from"] = metadata.get("asset_key")
                self.source_keys[metadata.get("asset_key")] = metadata.get("asset_key")
            else:
                # If the file is brought back to the Unpublished folder and was not uploaded from the course assets
                # mark the file as Unpublished again and do not upload it to the course assets
                if self.delete_unpublished_asset(file_path, metadata):
                    return
        else:
            # File uploaded to files-manager and then moved to a different directory
            file_path, name = self.generate_content_path(file_path, name)
            internal_name = self.generate_asset_name(file_path)
            if self.delete_unpublished_asset(file_path, metadata):
                return
            if internal_name not in metadata.get("asset_key"):
                # File was moved from a different directory
                source_asset_key = metadata.get("asset_key")
                uploaded_at = metadata.get("uploaded_at")
                memory_file = self.generate_memory_file_for_asset(metadata)
                memory_file._set_name(internal_name)  # pylint: disable=protected-access
                content = update_course_run_asset(self.course_id, memory_file)
                metadata = self.get_asset_json_from_content(content)
                metadata["uploaded_at"] = uploaded_at
                if source_asset_key != metadata.get("asset_key"):
                    self.delete_asset(source_asset_key)
        if not metadata:
            raise Exception("Metadata not found")

        metadata.update(extra_metadata)
        target_directory.append(
            {
                "id": file.get("id"),
                "parentId": file.get("parentId", ""),
                "name": name,
                "type": "file",
                "path": file_path,
                "metadata": metadata,
            }
        )
        self.content_paths.append(file_path)

    def get_metadata(self, metadata):
        """
        Get the metadata from the file metadata without the extra metadata.

        Arguments:
            metadata: the file metadata.

        Returns: the metadata.
        """
        return {key: value for key, value in metadata.items() if key in ALLOWED_BASE_FILE_METADATA_FIELDS}

    def get_extra_metadata(self, metadata):
        """
        Get the extra metadata from the file metadata.

        Arguments:
            metadata: the file metadata.

        Returns: the extra metadata.
        """
        return {key: value for key, value in metadata.items() if key not in ALLOWED_BASE_FILE_METADATA_FIELDS}

    def delete_unpublished_asset(self, file_path, metadata):
        """Delete an unpublished asset if the file is being moved to the Unpublished folder."""
        if "Unpublished" in file_path and not metadata.get("uploaded_at"):
            if metadata.get("from"):
                del self.source_keys[metadata.get("from")]
            return True
        return False

    def generate_memory_file_for_asset(self, metadata):
        """
        Generate a django in memory file with the contents of a file from the course assets.
        """
        location = AssetKey.from_string(metadata.get("asset_key"))
        content = contentstore().find(location)
        tmp_file = tempfile.NamedTemporaryFile(suffix=content.content_type.split("/")[-1])
        tmp_file.write(content._data)  # pylint: disable=protected-access
        tmp_file.file.seek(0)
        memory_file = InMemoryUploadedFile(
            file=tmp_file,
            field_name=None,
            name=metadata.get("display_name"),
            content_type=content.content_type,
            size=content.length,
            charset=None
        )
        return memory_file

    def find_temporary_file(self, file_data):
        """
        Find a temporary file by its name.

        If the file is found, a deepcopy of the file is returned
        to allow multiple uploads of the same file.
        """
        if file_data.get("metadata"):
            return None
        file_name = file_data.get("name")
        for file in self.temporary_uploaded_files:
            if file.file.name == file_name:
                self.temporary_uploaded_files.remove(file)
                return deepcopy(file)
        return None

    def create_directory(self, directory, target_directory):
        """
        Create a directory.

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
        metadata = directory.get('metadata', {})
        target_directory.append(
            {
                "id": directory.get("id"),
                "parentId": directory.get("parentId", ""),
                "name": name,
                "type": "directory",
                "path": directory_path,
                "metadata": metadata,
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
    def delete_content(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Delete a content from the course assets.

        Arguments:
            data: list of paths of the content to be deleted.
            suffix: the suffix of the request.

        Returns: the content of the parent directory.
        """
        contents = data.get("contents")
        if not contents:
            return {
                "status": "error",
                "message": "Path not found",
            }
        for content in contents:
            if content:
                self.delete_asset(content)
        return {
            "status": "success",
        }

    def get_formatted_content(self):
        """
        Get the formatted content of the directories.

        Returns: the formatted content of the directories.
        """
        return {
            "rootFolderId": self.directories["id"],
            "treeFolders": self.directories,
        }

    def generate_asset_name(self, path):
        """
        Generate an asset name for a given path.

        Returns: the asset name with a prefix of 'files-' and a suffix of the block id.
        """
        name = f"files-{self.block_id_parsed}-{path.replace('/', '-')}"
        if len(name) > 255:
            raise NameTooLong("The name of the file is too long")
        return name

    def is_in_filesmanager(self, course_asset):
        """
        Check if an asset is part of the xblock content.

        Arguments:
            course_asset: the course asset to be checked.

        Returns: True if the asset key is in the files manager, False otherwise.
        """
        if course_asset["asset_key"] in self.source_keys:
            return True

        display_name = course_asset["display_name"]
        is_num = False
        try:
            block_id = display_name.split("files-")[1][0:32]
            int(block_id, 16)
            is_num = True
        except IndexError:
            return False
        except ValueError:
            return False
        if display_name.startswith("files-") and is_num:
            return True
        return False

    def fill_unpublished(self):
        """
        Prefill the directories list with the content of the course assets.

        This unorganized content will be added to the unpublished directory, which is the first
        directory in the list.

        Returns: None.
        """
        unpublished_directory = self.get_content_by_path("Root/Unpublished")[0]
        unpublished_directory["parentId"] = self.directories["id"]
        all_course_assets = self.get_all_serialized_assets()
        for course_asset in all_course_assets:
            if self.is_in_filesmanager(course_asset):
                continue

            if self.is_asset_in_unpublished(course_asset, unpublished_directory):
                continue

            unpublished_directory["children"].append(
                {
                    "id": course_asset["id"],
                    "parentId": unpublished_directory["id"],
                    "name": course_asset["display_name"],
                    "type": "file",
                    "path": f"Root/Unpublished/{course_asset['display_name']}",
                    "metadata": course_asset,
                }
            )

    def is_asset_in_unpublished(self, course_asset, unpublished_directory):
        """
        Check if an asset is in the unpublished directory.

        Arguments:
            course_asset: the course asset to be checked.
            unpublished_directory: the unpublished directory.

        Returns: True if the asset is in the unpublished directory, False otherwise.
        """
        for content in unpublished_directory["children"]:
            if content["metadata"]["id"] == course_asset["id"]:
                return True
        return False

    def get_all_serialized_assets(self):
        """
        Get all the serialized assets of the current XBlock.

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
        """
        Get the target directory for a given path.

        Arguments:
            path: the path of the target directory.

        Returns: the target directory if found, the root directory otherwise.
        """
        target_directory = self.directories["children"]
        if path:
            target_directory, _, _ = self.get_content_by_path(path)
            if not target_directory:
                return None
            target_directory = target_directory["children"]
        return target_directory

    def get_asset_json_from_content(self, content):
        """
        Serialize the content object to a JSON serializable object.

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
            "file_size": int(content.length) if content.length else 0,
            "external_url": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), asset_url),
            "thumbnail": urljoin(configuration_helpers.get_value('LMS_ROOT_URL', settings.LMS_ROOT_URL), thumbnail_url),
            "uploaded_at": datetime.now().isoformat(),
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
            thumbnail_asset_key = self.course_id.make_asset_key(  # pylint: disable=no-member
                'thumbnail',
                thumbnail_path
            )
        return str(thumbnail_asset_key)

    def get_content_by_path(self, path):
        """
        Get the (content, index, parent directory) for a given content path.

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
        """
        Delete an asset from the course assets.

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
        except AssetNotFoundException as e:
            log.exception(e)

    @XBlock.json_handler
    def download_content(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Download the content of a directory.

        Arguments:
            contents: the path of the directories or files to be downloaded.

        Returns:
            task_id: the task ID of the async task.
        """
        contents = data.get("contents")
        if not contents:
            return {
                "status": "ERROR",
                "message": "Provide a list of contents to download.",
            }
        task_result = create_zip_file_task.delay(contents)
        return {
            "status": "success",
            "task_id": task_result.id,
        }

    @XBlock.json_handler
    def download_status(self, data, suffix=''):  # pylint: disable=unused-argument
        """
        Get the status of the download zip async task.

        Arguments:
            task_id: the task ID of  download zip async task.

        Returns:
            status: the status of the download zip async task.
            result: the result of the download zip async task.
        """
        task_id = data.get("task_id")
        if not task_id:
            return {
                "status": "ERROR",
                "message": "Provide a task ID",
            }
        task_result = create_zip_file_task.AsyncResult(task_id)
        if not task_result:
            return {
                "status": "ERROR",
                "message": "Task not found",
            }
        try:
            status = task_result.status
            result = task_result.result
            json.dumps(result)
        except TypeError as e:
            log.exception(e)
            status = "ERROR"
            result = "Something went wrong. Please try again later."

        return {
            "status": status,
            "result": result,
        }

    @staticmethod
    def _get_statici18n_js_url():  # pragma: no cover
        """
        Return the Javascript translation file for the currently selected language, if any.

        Defaults to English if available.
        """
        locale_code = translation.get_language()
        if locale_code is None:
            return None
        text_js = 'public/js/translations/{locale_code}/text.js'
        lang_code = locale_code.split('-')[0]
        for code in (locale_code, lang_code, 'en'):
            if files(__package__).joinpath(text_js.format(locale_code=code)).exists():
                return text_js.format(locale_code=code)
        return None

    @staticmethod
    def get_dummy():
        """
        Return a dummy translation to generate initial i18n.
        """
        return translation.gettext_noop('Dummy')
