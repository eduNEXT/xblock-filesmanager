"""
Tests for the tasks module.
"""
import json
import os
from collections import namedtuple
from unittest import TestCase
from unittest.mock import Mock, patch

from filesmanager.filesmanager import FilesManagerXBlock
from filesmanager.tasks import DOWNLOADS_FOLDER, create_zip_file_task

FileContent = namedtuple('FileContent', ['data', 'file_size'])


class CreateZipFileTask(TestCase):
    """
    Tests for the create_zip_file_task function.
    """
    def setUp(self):
        self.xblock = FilesManagerXBlock(runtime=Mock(), scope_ids=Mock())
        self.xblock.course_id = 'course-v1:edX+DemoX+Demo_Course'
        self.xblock.location = Mock(block_id='block-v1:edX+DemoX+Demo_Course+type@filesmanager+block@block_id')
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
                },
                {
                    "id": "folder",
                    "parentId": "root",
                    "name": "folder",
                    "type": "directory",
                    "path": "Root/folder",
                    "isDir": True,
                    "metadata": {},
                    "children": [
                        {
                            "id": "file",
                            "parentId": "folder",
                            "name": "file",
                            "type": "file",
                            "isDir": False,
                            "path": "Root/folder/file",
                            "metadata": {
                                "id": "asset_key",
                                "asset_key": "asset_key",
                                "display_name": "file.pdf",
                                "url": "http://localhost:8000/media/asset_key.pdf",
                                "content_type": "application/pdf",
                                "file_size": "123123",
                                "external_url": "http://localhost:8000/media/asset_key.pdf",
                                "thumbnail": "http://localhost:8000/media/asset_key.pdf",
                            },
                        },
                        {
                            "id": "file2",
                            "parentId": "folder",
                            "name": "file2",
                            "type": "file",
                            "isDir": False,
                            "path": "Root/folder/file2",
                            "metadata": {
                                "id": "asset_key2",
                                "asset_key": None,
                                "display_name": "file2.pdf",
                                "url": "http://localhost:8000/media/asset_key2.pdf",
                                "content_type": "application/pdf",
                                "file_size": "123123",
                                "external_url": "http://localhost:8000/media/asset_key2.pdf",
                                "thumbnail": "http://localhost:8000/media/asset_key2.pdf",
                            },
                        }
                    ],
                }
            ],
        }

    @patch('filesmanager.filesmanager.create_zip_file_task')
    def test_xblock_calls_download_zip_file(self, mock_create_zip_file_task):
        """
        Test that the xblock calls download_zip_file with the correct arguments.
        """
        data = {
            "contents": self.xblock.directories["children"][1],
        }
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')
        mock_task_result = Mock()
        mock_task_result.id = 'task_id'
        mock_create_zip_file_task.delay.return_value = mock_task_result

        self.xblock.download_content(request)

        mock_create_zip_file_task.delay.assert_called_once_with(data["contents"])

    def test_xblock_download_content_without_contents(self):
        """
        Test that the xblock returns an error when the request doesn't have the contents.
        """
        data = {}
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')

        response = self.xblock.download_content(request)

        self.assertEqual(response.status, '200 OK')  # pylint: disable=no-member
        body = json.loads(response.body)  # pylint: disable=no-member
        self.assertDictEqual(body, {
            'status': 'ERROR',
            'message': 'Provide a list of contents to download.',
        })

    def test_xblock_download_status(self):
        """
        Test that the xblock handler used to get tasks status returns the correct information.
        """
        data = {
            "task_id": 'task_id',
        }
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')

        with patch('filesmanager.tasks.create_zip_file_task.AsyncResult') as AsyncResult:
            AsyncResult.return_value.status = 'SUCCESS'
            AsyncResult.return_value.result = 'download/task_id.zip'

            request = self.xblock.download_status(request)

            self.assertEqual(request.status, '200 OK')  # pylint: disable=no-member
            body = json.loads(request.body)  # pylint: disable=no-member
            self.assertDictEqual(body, {
                'status': 'SUCCESS',
                'result': 'download/task_id.zip',
            })

    def test_xblock_download_status_not_found(self):
        """
        Test that the xblock handler used to get tasks status returns an error when the task is not found.
        """
        data = {
            "task_id": 'task_id',
        }
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')

        with patch('filesmanager.tasks.create_zip_file_task.AsyncResult') as AsyncResult:
            AsyncResult.return_value = None

            request = self.xblock.download_status(request)

            self.assertEqual(request.status, '200 OK')  # pylint: disable=no-member
            body = json.loads(request.body)  # pylint: disable=no-member
            self.assertDictEqual(body, {
                'status': 'ERROR',
                'message': 'Task not found',
            })

    def test_xblock_download_status_with_exception(self):
        """
        Test that the xblock handler used to get tasks status returns an error when the task fails.
        """
        data = {
            "task_id": 'task_id',
        }
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')

        with patch('filesmanager.tasks.create_zip_file_task.AsyncResult') as AsyncResult:
            AsyncResult.return_value.status = 'FAILURE'
            AsyncResult.return_value.result = Exception('Some error')

            request = self.xblock.download_status(request)

            self.assertEqual(request.status, '200 OK')  # pylint: disable=no-member
            body = json.loads(request.body)  # pylint: disable=no-member
            self.assertDictEqual(body, {
                'status': 'ERROR',
                'result': 'Something went wrong. Please try again later.',
            })

    def test_xblock_download_status_without_task_id(self):
        """
        Test that the xblock handler used to get tasks status returns an error when the task ID is not provided.
        """
        data = {}
        request = Mock()
        request.method = 'POST'
        request.body = json.dumps(data).encode('utf-8')

        request = self.xblock.download_status(request)

        self.assertEqual(request.status, '200 OK')  # pylint: disable=no-member
        body = json.loads(request.body)  # pylint: disable=no-member
        self.assertDictEqual(body, {
            'status': 'ERROR',
            'message': 'Provide a task ID',
        })

    @patch('filesmanager.tasks.AssetKey.from_string')
    @patch('filesmanager.tasks.contentstore')
    def test_create_zip_file(self, mock_contentstore, mock_from_string):
        """
        Test that the create_zip_file_task function creates a zip file with the correct structure.
        """
        find_mock = Mock()
        mock_contentstore.return_value.find = find_mock
        file_content = FileContent(b'dummy', 5)
        find_mock.return_value = file_content
        mock_from_string.return_value = 'asset_key'
        data = {
            "contents": [self.xblock.directories["children"][1]],
        }
        task_id = 'task_id'
        create_zip_file_task.push_request(id=task_id)

        result = create_zip_file_task.run(contents=data["contents"])

        self.assertEqual(result, f"/{DOWNLOADS_FOLDER}/{task_id}.zip")
        mock_from_string.assert_called_once_with('asset_key')
        os.unlink(f"{DOWNLOADS_FOLDER}/{task_id}.zip")
