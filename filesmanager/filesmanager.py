"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources
from django.utils import translation
from xblock.core import XBlock
from xblock.fields import Integer, Scope
from xblock.fragment import Fragment
from xblockutils.resources import ResourceLoader


loader = ResourceLoader(__name__)


class FilesManagerXBlock(XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # TO-DO: delete count, and define your own fields.
    count = Integer(
        default=0, scope=Scope.user_state,
        help="A simple counter, to show something happening",
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
        if not context:
            context = {}

        context['unique_app_id'] = f"react-filesmanager-app-{self.scope_ids.usage_id.block_id}"

        in_studio_runtime = hasattr(self.xmodule_runtime, 'is_author_mode')
        if in_studio_runtime:
            html = self.resource_string("static/html/frame.html")
            frag = Fragment(html.format(self=self))
            return frag


        frag = Fragment()
        frag.add_content(self.render_template(f"static/html/no_frame.html", context))
        frag.add_css(self.resource_string("static/css/filesmanager.css"))

        # Add i18n js
        # statici18n_js_url = self._get_statici18n_js_url()
        # if statici18n_js_url:
            #frag.add_javascript_url(self.runtime.local_resource_url(self, statici18n_js_url))

        frag.add_javascript(self.resource_string("static/html/main.js"))

        # Will call initFn:: var initFn = window[$element.data('init')]
        frag.initialize_js('FilesManagerXBlockInit', json_args=context)
        return frag

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.
    @XBlock.json_handler
    def increment_count(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        if suffix:
            pass  # TO-DO: Use the suffix when storing data.
        # Just to show data coming in...
        assert data['hello'] == 'world'

        self.count += 1
        return {"count": self.count}

    @XBlock.json_handler
    def render_in_iframe(self, data, suffix=''):
        """
        TODO: make this render a view with the whole html page to be put in an iframe
        """
        frag = self.student_view()
        return frag


    def render_template(self, template_path, context=None) -> str:
        """
        Render a template with the given context. The template is translated
        according to the user's language.

        Args:
            template_path (str): The path to the template
            context(dict, optional): The context to render in the template

        Returns:
            str: The rendered template
        """
        return loader.render_django_template(
            template_path, context, i18n_service=None
        )

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
