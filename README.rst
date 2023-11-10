FilesManager XBlock
###################

|status-badge| |license-badge| |ci-badge|

Purpose
*******

Files Manager XBlock is a pluggable extension to the Open edX platform that
allows course creators to add a file manager to manage files and folders, and
students to view and download them.

It leverages the `chonky component`_ to provide a intuituve and complete file
manager that allows users to upload, download, delete and move files and
folders including drag and drop support, toggleable view modes, keyboard
shortcuts, and more.

This XBlock has been created as an open source contribution to the Open edX
platform and has been funded by Unidigital project from the Spanish Government
- 2023.

.. _chonky component: https://github.com/TimboKZ/Chonky


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

1. Go to edit section of the component from Studio.
2. Create your folders structure by clicking on the **Create folder** button.
3. Upload files by clicking on the **Upload files** button.

   .. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/87b8a552-a8a2-4879-89b0-5fff0d308dab
      :alt: Files Manager Component

   **NOTE:** The soported files types are the same as the ones supported by the
   Open edX platform.

The instructors have an **Unpublished** folder where they can view the files
into the course assets that have not been categorized yet in the component.
This folder is not visible to the students. In addition, the instructors can
preview the files and folders that have been added to the component before
publishing the changes in the course.


View from the Learning Management System (LMS)
**********************************************

The students can view and download the files and folders that have been added to the
component from the LMS. The download can be individual or multiple (as a zip file).

.. image:: https://github.com/eduNEXT/xblock-filesmanager/assets/64033729/fb174233-0b5e-4506-8335-e7197121f2f6
   :alt: View from the LMS


Experimenting with this XBlock in the Workbench
************************************************

`XBlock`_ is the Open edX component architecture for building custom learning
interactive components.

.. _XBlock: https://openedx.org/r/xblock

You can see the Images Gallery component in action in the XBlock Workbench.
Running the Workbench requires having docker running.

.. code:: bash

    git clone git@github.com:eduNEXT/xblock-filesmanager
    virtualenv venv/
    source venv/bin/activate
    cd xblock-filesmanager
    make upgrade
    make install
    make dev.run

Once the process is done, you can interact with the Images Gallery XBlock in
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
