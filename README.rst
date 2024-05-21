FilesManager XBlock
###################

|status-badge| |license-badge| |ci-badge|

Purpose
*******

Files Manager XBlock is a pluggable extension to the Open edX platform that
allows course creators to add a file manager to upload/download files and
create, delete and download folders, and students to view and download them.

It leverages the `chonky component`_ to provide a intuituve and complete file
manager that allows users to upload, download, delete and move files and
folders including drag and drop support, toggleable view modes, keyboard
shortcuts, and more.

This XBlock has been created as an open source contribution to the Open edX
platform and has been funded by Unidigital project from the Spanish Government
- 2023.

.. _chonky component: https://github.com/TimboKZ/Chonky

Compatibility Notes
===================

+------------------+--------------+
| Open edX Release | Version      |
+==================+==============+
| Palm             | >= 0.7.0     |
+------------------+--------------+
| Quince           | >= 0.7.0     |
+------------------+--------------+
| Redwood          | >= 0.7.0     |
+------------------+--------------+

The settings can be changed in ``filesmanager/settings/common.py`` or, for example, in tutor configurations.

**NOTE**: the current ``common.py`` works with Open edX Palm, Quince and Redwood version.


Enabling the XBlock in a course
*******************************

When the XBlock has been installed, you can enable it in a course from Studio
through the **Advanced Settings**.

1. Go to Studio and open the course you want to add the XBlock to.
2. Go to **Settings** > **Advanced Settings** from the top menu.
3. Search for **Advanced Module List** and add ``"filesmanager"`` to the list.
4. Click **Save Changes** button.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/5f7c99b8-31d2-492f-8573-88ae8748166b
      :alt: Enable XBlock in a course


Adding a Files Manager Component to a course unit
*************************************************

From Studio, you can add the Files Manager Component to a course unit.

1. Click on the **Advanced** button in **Add New Component**.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/7c4cfde4-f2b2-4334-b646-c302dea9c515
      :alt: Open Advanced Components

2. Select **filesmanager** from the list.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/d5a524e5-ce0e-4cec-a336-3b04737fb373
      :alt: Select Files Manager Component


Using the Files Manager Component
*********************************

Create folders
==============
1. Go to edit section of the component from Studio.
2. Create your folders structure by clicking on the **Create folder** button.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/27fa71a1-0bd7-4c64-9ff1-c8275bf40ace
      :alt: Create folder

Upload files
============
1. Go to edit section of the component from Studio.
2. Upload files by clicking on the **Upload files** button.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/5f9af287-8c79-4867-8624-9e2ac610c6ae
      :alt: Upload files

   **NOTE:** The soported files types are the same as the ones supported by the
   Open edX platform.

3. The uploaded files are added to the course assets, and they can be viewed
   from **Content** > **Files** in Studio.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/36d6b09d-b2e7-496e-9677-b24d61f5998c
      :alt: Files in Course Assets

4. The instructors have an **Unpublished** folder where they can view files
   into the course assets that have not been categorized yet in the component.
   This folder is not visible to the students.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/ca4c27d7-5797-4293-bcd3-38a3845b72e7
      :alt: Course Assets Unpublished folder

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/bd7d838a-71ba-4296-94f8-613cc3da5c69
      :alt: Unpublished folder

   In addition, instructors can preview files and folders that have been added
   to the component before publishing the changes in the course.

   **NOTE:** The files uploaded to the component will be available in the course assets. However, their name will
   be changed to a string following this format: ``files-<component_id>-<file_path>-<file_name>``.
   This is done to avoid conflicts with files that have the same name.

Delete files
============
To delete a file, the following must be taken into account:

1. The deletion of files directly from the Files Manager component is
   restricted. If you want to delete a file, you must do it from the course
   assets.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/5fab112b-4e87-453f-801d-8ab51eb55c7a
      :alt: Delete file

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/144d9e6f-db54-42fc-a387-46f818802258
      :alt: Delete file from course assets

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/1a59c707-1a03-4f8f-bf5b-812f8274dece
      :alt: File removed from Files Manager component

2. To unpublish a file that you uploaded in the Files Manager component, you
   must move that file to the **Unpublished** folder. This action will not
   delete the file from the course assets, but it will remove it from the
   student view.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/0e9718ee-e53f-488e-a386-dddcfa782113
        :alt: Unpublish file

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/fa24c3a5-9d8e-4ce0-8d0a-25295a1a36df
        :alt: Move file to Unpublished folder

3. To publish a file you must move that file from the **Unpublished** folder to
   the destination folder. This action allow that file to be visible from the
   student view.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/ec4b618f-5afe-47c5-9f0a-27b04cabfe94
        :alt: Publish file

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/cc575d43-d1be-4e62-bfb7-8cd05d9c5dfe
       :alt: Move file to destination folder


View from the Learning Management System (LMS)
**********************************************

The students can view and download files and folders that have been added to the
component from the LMS. The download can be individual or multiple (as a zip file).

.. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/ef7f3f96-d2d9-4db0-81f9-150eed7effeb
   :alt: View from the LMS


Experimenting with this XBlock in the Workbench
************************************************

`XBlock`_ is the Open edX component architecture for building custom learning
interactive components.

.. _XBlock: https://openedx.org/r/xblock

You can see the Files Manager component in action in the XBlock Workbench.
Running the Workbench requires having docker running.

.. code:: bash

    git clone git@github.com:eduNEXT/xblock-filesmanager
    virtualenv venv/
    source venv/bin/activate
    cd xblock-filesmanager
    make upgrade
    make install
    make dev.run

Once the process is done, you can interact with the Files Manager XBlock in
the Workbench by navigating to http://localhost:8000

For details regarding how to deploy this or any other XBlock in the Open edX
platform, see the `installing-the-xblock`_ documentation.

.. _installing-the-xblock: https://edx.readthedocs.io/projects/xblock-tutorial/en/latest/edx_platform/devstack.html#installing-the-xblock


Getting Help
*************

If you're having trouble, the Open edX community has active discussion forums
available at https://discuss.openedx.org where you can connect with others in
the community.

Also, real-time conversations are always happening on the Open edX community
Slack channel. You can request a `Slack invitation`_, then join the
`community Slack workspace`_.

For anything non-trivial, the best path is to open an `issue`_ in this
repository with as many details about the issue you are facing as you can
provide.

For more information about these options, see the `Getting Help`_ page.

.. _Slack invitation: https://openedx.org/slack
.. _community Slack workspace: https://openedx.slack.com/
.. _issue: https://github.com/eduNEXT/xblock-filesmanager/issues
.. _Getting Help: https://openedx.org/getting-help


License
*******

The code in this repository is licensed under the AGPL-3.0 unless otherwise
noted.

Please see `LICENSE.txt <LICENSE.txt>`_ for details.


Contributing
************

Contributions are very welcome.

This project is currently accepting all types of contributions, bug fixes,
security fixes, maintenance work, or new features.  However, please make sure
to have a discussion about your new feature idea with the maintainers prior to
beginning development to maximize the chances of your change being accepted.
You can start a conversation by creating a new issue on this repo summarizing
your idea.


Reporting Security Issues
*************************

Please do not report a potential security issue in public. Please email
security@edunext.co.


.. |ci-badge| image:: https://github.com/eduNEXT/xblock-filesmanager/workflows/Python%20CI/badge.svg?branch=main
    :target: https://github.com/eduNEXT/xblock-filesmanager/actions
    :alt: CI

.. |license-badge| image:: https://img.shields.io/github/license/eduNEXT/xblock-filesmanager.svg
    :target: https://github.com/eduNEXT/xblock-filesmanager/blob/main/LICENSE.txt
    :alt: License

.. |status-badge| image:: https://img.shields.io/badge/Status-Maintained-brightgreen
