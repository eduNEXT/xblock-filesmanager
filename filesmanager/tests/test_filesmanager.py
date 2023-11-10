"""
Tests for the FilesManagerXBlock definition class.
"""
import json
from http import HTTPStatus
from unittest import TestCase
from unittest.mock import Mock, call, patch

from django.test.utils import override_settings

from filesmanager.filesmanager import FilesManagerXBlock


CONTENT = {
    "rootFolderId": "root",
    "treeFolders": {
        "id": "root",
        "name": "Root",
        "type": "directory",
        "path": "Root",
        "metadata": {},
        "parentId": "",
        "children": [
            {
                "id": "unpublished",
                "name": "Unpublished",
                "type": "directory",
                "path": "Root/Unpublished",
                "metadata": {},
                "parentId": "root",
                "children": [],
            }
        ],
    },
}


class FilesManagerXBlockTestMixin(TestCase):
    """
    Mixin for the FilesManagerXBlock test suite.
    """

    def setUp(self) -> None:
        """
        Set up the test suite.
        """
        self.xblock = FilesManagerXBlock(
            runtime=Mock(),
            field_data=Mock(),
            scope_ids=Mock(),
        )
        self.xblock.fill_unpublished = Mock()
        self.xblock.get_current_user = Mock()
        self.xblock.initialize_directories = Mock()
        self.xblock.temporary_save_upload_files = Mock()
        self.xblock._sync_content = Mock()  # pylint: disable=protected-access
        self.xblock.clean_uploaded_files = Mock()
        self.xblock.delete_asset = Mock()
        self.xblock.content_paths = []
        self.xblock.temporary_uploaded_files = {}
        self.xblock.directories = {
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
        }


class TestFilesManagerXBlockHandlers(FilesManagerXBlockTestMixin):
    """
    Test suite for the FilesManagerXBlock JSON handlers.
    """

    def setUp(self) -> None:
        """
        Set up the test suite.
        """
        super().setUp()
        self.request = Mock(
            body=json.dumps({}).encode("utf-8"),
            method="POST",
            status_code_success=HTTPStatus.OK,
        )

    def test_get_directories_anonymous_user(self):
        """
        Check get directories JSON handler for anonymous user.

        Expected result:
            - The view returns 200 status code.
            - The directories list are returned without the unpublished directory.
        """
        self.xblock.get_current_user.return_value.opt_attrs.get.return_value = True
        expected_result = {
            "status": "success",
            "contents": {
                "id": "root",
                "name": "Root",
                "type": "directory",
                "path": "Root",
                "parentId": "",
                "metadata": {},
                "children": [],
            },
        }

        response = self.xblock.get_directories(self.request)

        self.xblock.fill_unpublished.assert_not_called()
        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertEqual(expected_result, response.json)

    def test_get_directories_non_anonymous_user(self):
        """
        Check get directories JSON handler for non-anonymous user.

        Expected result:
            - The view returns 200 status code.
            - The directories list are returned with the unpublished directory.
        """
        self.xblock.get_current_user.return_value.opt_attrs.get.return_value = None
        expected_result = {
            "status": "success",
            "contents": self.xblock.directories,
        }

        response = self.xblock.get_directories(self.request)

        self.xblock.fill_unpublished.assert_called()
        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertEqual(expected_result, response.json)

    def test_sync_content(self):
        """
        Check sync content JSON handler with files and directories.

        Expected result:
            - The view returns 200 status code.
            - The directories and files are synced.
        """
        self.request.params = {"contents": json.dumps(CONTENT)}
        expected_result = {
            "rootFolderId": self.xblock.directories["id"],
            "treeFolders": self.xblock.directories,
        }

        response = self.xblock.sync_content(self.request)

        self.xblock.initialize_directories.assert_called_once()
        self.xblock.temporary_save_upload_files.assert_called_once_with(
            self.request.params.items()
        )
        self.xblock._sync_content.assert_called_once_with(  # pylint: disable=protected-access
            CONTENT["treeFolders"]["children"]
        )
        self.xblock.clean_uploaded_files.assert_called_once()
        self.xblock.fill_unpublished.assert_called_once()
        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertEqual(expected_result, response.json)

    def test_delete_content_with_contents(self):
        """
        Check delete content JSON handler with contents.
        Expected result:
            - The view returns 200 status code.
            - The contents are deleted.
        """
        contents = ["path/to/content1", "path/to/content2"]
        data = {"contents": contents}
        self.request.body = json.dumps(data).encode("utf-8")

        response = self.xblock.delete_content(self.request)

        self.xblock.delete_asset.assert_has_calls(
            [call(content) for content in contents]
        )
        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertEqual({"status": "success"}, response.json)

    def test_delete_content_without_contents(self):
        """
        Check delete content JSON handler without contents.
        Expected result:
            - The view returns 200 status code.
            - The contents are not deleted.
        """
        data = {"contents": []}
        self.request.body = json.dumps(data).encode("utf-8")

        response = self.xblock.delete_content(self.request)

        self.xblock.delete_asset.assert_not_called()
        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertEqual(
            {"status": "error", "message": "Path not found"}, response.json
        )


class TestFilesManagerXBlockUtilities(TestCase):
    """Test suite for the FilesManagerXBlock utilities."""

    def setUp(self) -> None:
        """
        Set up the test suite.
        """
        self.xblock = FilesManagerXBlock(
            runtime=Mock(),
            field_data=Mock(),
            scope_ids=Mock(),
        )
        self.xblock.directories = {
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
        }
        self.xblock.temporary_uploaded_files = {}
        self.xblock.content_paths = []
        self.xblock.course_id = Mock()

    def test_initialize_directories(self):
        """
        Check initialize_directories method.

        Expected result:
            - The directories and content_paths are initialized.
        """
        expected_directories = {
            "id": "root",
            "name": "Root",
            "type": "directory",
            "path": "Root",
            "parentId": "",
            "metadata": {},
            "children": [],
        }
        expected_content_paths = ["Root"]

        self.xblock.initialize_directories()

        self.assertEqual(expected_directories, self.xblock.directories)
        self.assertEqual(expected_content_paths, self.xblock.content_paths)

    def test_sync_content_with_directory(self):
        """
        Check _sync_content method with directory content.

        Expected result:
            - The directory is created.
        """
        contents = [{"path": "Root/New Directory", "type": "directory"}]
        self.xblock.create_directory = Mock()

        self.xblock._sync_content(contents)  # pylint: disable=protected-access

        self.xblock.create_directory.assert_called_once_with(
            contents[0], self.xblock.directories["children"]
        )

    def test_sync_content_with_file(self):
        """
        Check _sync_content method with file content.

        Expected result:
            - The file is uploaded.
        """
        contents = [{"path": "Root/New File", "type": "file"}]
        self.xblock.upload_file_to_directory = Mock()

        self.xblock._sync_content(contents)  # pylint: disable=protected-access

        self.xblock.upload_file_to_directory.assert_called_once_with(
            contents[0], self.xblock.directories["children"]
        )

    def test_sync_content_with_unknown_type(self):
        """
        Check _sync_content method with unknown content type.

        Expected result:
            - An exception is raised.
        """
        contents = [{"path": "Root/Unknown", "type": "unknown"}]

        with self.assertRaises(Exception) as context:
            self.xblock._sync_content(contents)  # pylint: disable=protected-access

        self.assertEqual("Content type not found", str(context.exception))

    def test_sync_content_target_directory_not_found(self):
        """
        Check _sync_content method with target directory not found.

        Expected result:
            - An exception is raised.
        """
        contents = [{"path": "Root/Unknown Directory", "type": "directory"}]
        self.xblock.get_content_by_path = Mock(return_value=(None, None, None))

        with self.assertRaises(Exception) as context:
            self.xblock._sync_content(contents)  # pylint: disable=protected-access

        self.assertEqual("Target directory not found", str(context.exception))

    def test_sync_content_without_unpublished_directory(self):
        """
        Check _sync_content method without unpublished directory in the root directory.

        Expected result:
            - An exception is raised.
        """
        self.xblock.get_content_by_path = Mock(return_value=(None, None, None))

        with self.assertRaises(Exception) as context:
            self.xblock._sync_content([])  # pylint: disable=protected-access

        self.assertEqual(
            "Unpublished directory cannot be removed from the root directory",
            str(context.exception),
        )

    def test_temporary_save_upload_files_with_file(self):
        """
        Check temporary_save_upload_files method with file content.

        Expected result:
            - The file is temporarily saved.
        """
        file1 = Mock()
        file2 = Mock()
        file1.file.name = "file1"
        file2.file.name = "file2"
        uploaded_files = [("files", file1), ("files", file2)]

        self.xblock.temporary_save_upload_files(uploaded_files)

        self.assertIn("file1", self.xblock.temporary_uploaded_files)
        self.assertIn("file2", self.xblock.temporary_uploaded_files)

    def test_temporary_save_upload_files_without_file(self):
        """
        Check temporary_save_upload_files method without file content.

        Expected result:
            - The file is not temporarily saved.
        """
        uploaded_files = [("non-file1", Mock()), ("non-file2", Mock())]

        self.xblock.temporary_save_upload_files(uploaded_files)

        self.assertNotIn("non-file1", self.xblock.temporary_uploaded_files)
        self.assertNotIn("non-file2", self.xblock.temporary_uploaded_files)

    def test_temporary_save_upload_files_with_mixed_content(self):
        """
        Check temporary_save_upload_files method with mixed content.

        Expected result:
            - Only the file content is temporarily saved.
        """
        file1 = Mock()
        file1.file.name = "file1"
        uploaded_files = [("file1", file1), ("non-file1", Mock())]

        self.xblock.temporary_save_upload_files(uploaded_files)

        self.assertIn("file1", self.xblock.temporary_uploaded_files)
        self.assertNotIn("non-file1", self.xblock.temporary_uploaded_files)

    def test_generate_content_path_without_existing_path(self):
        """
        Check generate_content_path method without existing path.

        Expected result:
            - The base path and name are returned as is.
        """
        base_path = "path/to/content"
        name = "content"

        new_base_path, new_name = self.xblock.generate_content_path(base_path, name)

        self.assertEqual(base_path, new_base_path)
        self.assertEqual(name, new_name)

    def test_generate_content_path_with_existing_path(self):
        """
        Check generate_content_path method with existing path.

        Expected result:
            - The base path and name are returned with a suffix.
        """
        base_path = "path/to/content"
        name = "content"
        self.xblock.content_paths.append(base_path)

        new_base_path, new_name = self.xblock.generate_content_path(base_path, name)

        self.assertEqual(f"{base_path} (1)", new_base_path)
        self.assertEqual(f"{name} (1)", new_name)

    def test_generate_content_path_with_multiple_existing_paths(self):
        """
        Check generate_content_path method with multiple existing paths.

        Expected result:
            - The base path and name are returned with a suffix.
        """
        base_path = "path/to/content"
        name = "content"
        self.xblock.content_paths.extend([base_path, base_path])

        new_base_path, new_name = self.xblock.generate_content_path(base_path, name)

        self.assertEqual(f"{base_path} (2)", new_base_path)
        self.assertEqual(f"{name} (2)", new_name)

    def test_create_directory(self):
        """
        Check create_directory method.

        Expected result:
            - The directory is created in the root directory.
            - The content_paths is updated.
        """
        directory = {
            "id": "directory1",
            "parentId": "root",
            "name": "Directory1",
            "type": "directory",
            "path": "Root/Directory1",
            "metadata": {},
            "children": [],
        }
        self.xblock.upload_file_to_directory = Mock()
        target_directory = self.xblock.directories["children"]

        self.xblock.create_directory(directory, target_directory)

        self.xblock.upload_file_to_directory.assert_not_called()
        self.assertIn(directory["path"], self.xblock.content_paths)
        self.assertIn(directory, target_directory)

    def test_create_directory_with_children(self):
        """
        Check create_directory method with children.

        Expected result:
            - The directory and its children are created.
            - The content_paths is updated.
        """
        self.xblock.upload_file_to_directory = Mock()
        directory = {
            "id": "test-directory-id",
            "name": "TestDirectory",
            "type": "directory",
            "path": "Root/TestDirectory",
            "parentId": "root",
            "metadata": {},
            "children": [
                {
                    "id": "test-file-id",
                    "name": "TestFile",
                    "type": "file",
                    "path": "Root/TestDirectory/TestFile",
                    "metadata": {},
                    "parentId": "test-directory-id",
                }
            ],
        }

        self.xblock.create_directory(directory, self.xblock.directories["children"])

        self.xblock.upload_file_to_directory.assert_called_once()
        self.assertIn(directory["path"], self.xblock.content_paths)

    def test_get_formatted_content(self):
        """
        Check get_formatted_content method.

        Expected result:
            - The formatted content of the directories is returned.
        """
        expected_result = {
            "rootFolderId": self.xblock.directories["id"],
            "treeFolders": self.xblock.directories,
        }

        result = self.xblock.get_formatted_content()

        self.assertEqual(expected_result, result)

    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_content_by_name")
    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_all_serialized_assets")
    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_content_by_path")
    def test_fill_unpublished_with_new_assets(
        self,
        mock_get_content_by_path: Mock,
        mock_get_all_serialized_assets: Mock,
        mock_get_content_by_name: Mock,
    ):
        """
        Check fill_unpublished method with new assets.

        Expected result:
            - The new assets are added to the unpublished directory.
        """
        unpublished_directory = {
            "id": "unpublished",
            "parentId": "root",
            "name": "Unpublished",
            "type": "directory",
            "path": "Root/Unpublished",
            "metadata": {},
            "children": [],
        }
        all_course_assets = [
            {"id": "asset1", "display_name": "Asset 1"},
            {"id": "asset2", "display_name": "Asset 2"},
        ]
        mock_get_all_serialized_assets.return_value = all_course_assets
        mock_get_content_by_path.return_value = [unpublished_directory]
        mock_get_content_by_name.return_value = (None, None, None)
        expected_children = [
            {
                "id": asset["id"],
                "parentId": "unpublished",
                "name": asset["display_name"],
                "type": "file",
                "path": f"Root/Unpublished/{asset['display_name']}",
                "metadata": asset,
            }
            for asset in all_course_assets
        ]

        self.xblock.fill_unpublished()

        self.assertEqual(expected_children, unpublished_directory["children"])

    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_content_by_name")
    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_all_serialized_assets")
    @patch("filesmanager.filesmanager.FilesManagerXBlock.get_content_by_path")
    def test_fill_unpublished_with_existing_assets(
        self,
        mock_get_content_by_path: Mock,
        mock_get_all_serialized_assets: Mock,
        mock_get_content_by_name: Mock,
    ):
        """
        Check fill_unpublished method with existing assets.

        Expected result:
            - The existing assets are not added to the unpublished directory.
        """
        unpublished_directory = {
            "id": "unpublished",
            "parentId": "root",
            "name": "Unpublished",
            "type": "directory",
            "path": "Root/Unpublished",
            "metadata": {},
            "children": [],
        }
        all_course_assets = [
            {"id": "asset1", "display_name": "Asset 1"},
            {"id": "asset2", "display_name": "Asset 2"},
        ]
        mock_get_all_serialized_assets.return_value = all_course_assets
        mock_get_content_by_path.return_value = [unpublished_directory]
        mock_get_content_by_name.return_value = ("content", "index", "parent")

        self.xblock.fill_unpublished()

        self.assertEqual([], unpublished_directory["children"])

    @patch("filesmanager.filesmanager.contentstore")
    def test_get_all_serialized_assets_empty(self, contentstore_mock: Mock):
        """
        Check get_all_serialized_assets method with no course assets.

        Expected result:
            - The method returns an empty list.
        """
        contentstore_mock.return_value.get_all_content_for_course.return_value = (
            [],
            None,
        )

        result = self.xblock.get_all_serialized_assets()

        self.assertEqual([], result)

    @patch("filesmanager.filesmanager.contentstore")
    def test_get_all_serialized_assets_with_assets(self, contentstore_mock: Mock):
        """
        Check get_all_serialized_assets method with course assets.

        Expected result:
            - The method returns a list of serialized assets.
        """
        course_assets = [{"display_name": "Asset 1"}, Mock()]
        contentstore_mock.return_value.get_all_content_for_course.side_effect = [
            (course_assets, None),
            (None, None),
        ]
        self.xblock.get_asset_json_from_dict = Mock(
            return_value={"display_name": "Asset 1"}
        )
        self.xblock.get_asset_json_from_content = Mock(
            return_value={"display_name": "Asset 2"}
        )
        expected_result = [
            {"display_name": "Asset 1"},
            {"display_name": "Asset 2"},
        ]

        result = self.xblock.get_all_serialized_assets()

        self.assertEqual(expected_result, result)

    def test_get_target_directory_with_path(self):
        """
        Check get_target_directory method with a valid path.

        Expected result:
            - The method returns the target directory.
        """
        path = "Root/Unpublished"
        expected_result = self.xblock.directories["children"][0]["children"]

        result = self.xblock.get_target_directory(path)

        self.assertEqual(expected_result, result)

    def test_get_target_directory_without_path(self):
        """
        Check get_target_directory method without a path.

        Expected result:
            - The method returns the root directory children.
        """
        expected_result = self.xblock.directories["children"]

        result = self.xblock.get_target_directory(None)

        self.assertEqual(expected_result, result)

    def test_get_target_directory_with_invalid_path(self):
        """
        Check get_target_directory method with an invalid path.

        Expected result:
            - The method returns None.
        """
        path = "Invalid/Path"

        result = self.xblock.get_target_directory(path)

        self.assertIsNone(result)

    @override_settings(LMS_ROOT_URL="lms-root-url")
    @patch("filesmanager.filesmanager.StaticContent")
    @patch("filesmanager.filesmanager.configuration_helpers")
    def test_get_asset_json_from_content(
        self,
        mock_configuration_helpers: Mock,
        mock_static_content: Mock,
    ):
        """
        Check get_asset_json_from_content method.

        Expected result:
            - The method returns the correct JSON serializable object.
        """
        mock_configuration_helpers.get_value.return_value = "http://localhost"
        mock_static_content.serialize_asset_key_with_slash.side_effect = [
            "asset_url",
            "thumbnail_url",
        ]
        content = Mock()
        content.location = "test-location"
        content.thumbnail_location = "test-thumbnail_location"
        content.name = "test-name"
        content.content_type = "test-content_type"
        content.length = 100
        content.get_id.return_value = "test-id"

        expected_result = {
            "id": "test-id",
            "asset_key": "test-location",
            "display_name": "test-name",
            "url": "asset_url",
            "content_type": "test-content_type",
            "file_size": 100,
            "external_url": "http://localhost/asset_url",
            "thumbnail": "http://localhost/thumbnail_url",
        }

        result = self.xblock.get_asset_json_from_content(content)

        self.assertEqual(expected_result, result)

    @override_settings(LMS_ROOT_URL="lms-root-url")
    @patch("filesmanager.filesmanager.FilesManagerXBlock._get_thumbnail_asset_key")
    @patch("filesmanager.filesmanager.StaticContent")
    @patch("filesmanager.filesmanager.configuration_helpers")
    def test_get_asset_json_from_dict(
        self,
        mock_configuration_helpers: Mock,
        mock_static_content: Mock,
        mock_get_thumbnail_asset_key: Mock,
    ):
        """
        Check get_asset_json_from_content method.

        Expected result:
            - The method returns the correct JSON serializable object.
        """
        mock_configuration_helpers.get_value.return_value = "http://localhost"
        mock_static_content.serialize_asset_key_with_slash.return_value = "asset_url"
        mock_get_thumbnail_asset_key.return_value = "thumbnail_url"
        asset = {
            "contentType": "test-content-type",
            "length": 100,
            "_id": "test-id",
            "asset_key": "test-asset-key",
            "displayname": "test-display-name",
        }

        expected_result = {
            "id": "test-id",
            "asset_key": "test-asset-key",
            "display_name": "test-display-name",
            "url": "asset_url",
            "content_type": "test-content-type",
            "file_size": 100,
            "external_url": "http://localhost/asset_url",
            "thumbnail": "http://localhost/thumbnail_url",
        }

        result = self.xblock.get_asset_json_from_dict(asset)

        self.assertEqual(expected_result, result)

    def test_get_thumbnail_asset_key_with_thumbnail_location(self):
        """
        Check _get_thumbnail_asset_key method with thumbnail location.

        Expected result:
            - The method returns the correct thumbnail asset key.
        """
        asset = {
            "thumbnail_location": ["part1", "part2", "part3", "part4", "thumbnail_path"]
        }
        expected_result = str(
            self.xblock.course_id.make_asset_key("thumbnail", "thumbnail_path")
        )

        result = (
            self.xblock._get_thumbnail_asset_key(  # pylint: disable=protected-access
                asset
            )
        )

        self.assertEqual(expected_result, result)

    def test_get_thumbnail_asset_key_without_thumbnail_location(self):
        """
        Check _get_thumbnail_asset_key method without thumbnail location.

        Expected result:
            - The method returns None.
        """
        asset = {}

        result = (
            self.xblock._get_thumbnail_asset_key(  # pylint: disable=protected-access
                asset
            )
        )

        self.assertEqual("None", result)

    def test_get_content_by_name_content_exists(self):
        """
        Check get_content_by_name method when content exists.

        Expected result:
            - The method returns the correct content, index, and parent directory.
        """
        name = "Unpublished"
        parent_content = self.xblock.directories["children"]

        expected_result = (parent_content[0], 0, parent_content)

        result = self.xblock.get_content_by_name(name, parent_content)

        self.assertEqual(expected_result, result)

    def test_get_content_by_name_content_does_not_exist(self):
        """
        Check get_content_by_name method when content does not exist.

        Expected result:
            - The method returns (None, None, None).
        """
        name = "Nonexistent"
        parent_content = self.xblock.directories["children"]

        expected_result = (None, None, None)

        result = self.xblock.get_content_by_name(name, parent_content)

        self.assertEqual(expected_result, result)

    def test_get_content_by_name_content_in_subdirectory(self):
        """
        Check get_content_by_name method when content is in a subdirectory.

        Expected result:
            - The method returns the correct content, index, and parent directory.
        """
        name = "SubdirectoryContent"
        parent_content = self.xblock.directories["children"]
        parent_content[0]["children"].append(
            {
                "id": "subdirectorycontent",
                "name": "SubdirectoryContent",
                "type": "file",
                "path": "Root/Unpublished/SubdirectoryContent",
                "metadata": {},
                "parentId": "unpublished",
            }
        )

        expected_result = (
            parent_content[0]["children"][0],
            0,
            parent_content[0]["children"],
        )

        result = self.xblock.get_content_by_name(name, parent_content)

        self.assertEqual(expected_result, result)

    def test_get_content_by_path_root(self):
        """
        Check get_content_by_path method when path is "Root".

        Expected result:
            - The method returns the root directory, None, None.
        """
        path = "Root"

        expected_result = (self.xblock.directories, None, None)

        result = self.xblock.get_content_by_path(path)

        self.assertEqual(expected_result, result)

    def test_get_content_by_path_content_exists(self):
        """
        Check get_content_by_path method when content exists.

        Expected result:
            - The method returns the correct content, index, and parent directory.
        """
        path = "Root/Unpublished"

        expected_result = (
            self.xblock.directories["children"][0],
            0,
            self.xblock.directories["children"],
        )

        result = self.xblock.get_content_by_path(path)

        self.assertEqual(expected_result, result)

    def test_get_content_by_path_content_does_not_exist(self):
        """
        Check get_content_by_path method when content does not exist.

        Expected result:
            - The method returns (None, None, None).
        """
        path = "Root/Nonexistent"

        expected_result = (None, None, None)

        result = self.xblock.get_content_by_path(path)

        self.assertEqual(expected_result, result)

    def test_get_content_by_path_content_in_subdirectory(self):
        """
        Check get_content_by_path method when content is in a subdirectory.

        Expected result:
            - The method returns the correct content, index, and parent directory.
        """
        path = "Root/Unpublished/SubdirectoryContent"
        parent_content = self.xblock.directories["children"]
        parent_content[0]["children"].append(
            {
                "id": "subdirectorycontent",
                "name": "SubdirectoryContent",
                "type": "file",
                "path": path,
                "metadata": {},
                "parentId": "unpublished",
            }
        )

        expected_result = (
            parent_content[0]["children"][0],
            0,
            parent_content[0]["children"],
        )

        result = self.xblock.get_content_by_path(path)

        self.assertEqual(expected_result, result)
