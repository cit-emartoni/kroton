/**
 * @file
 * Contains fix for inline editing compatability.
 */

(function ($) {

    // Contains utility function to refresh the Workbench block
    Drupal.behaviors.workbenchModerationBlockRefresh = {};
    Drupal.behaviors.workbenchModerationBlockRefresh.refreshBlock = function() {
        // Re-load the workbench block via ajax
        var nid = Drupal.settings.workbench_moderation.nid;
        $('.block-workbench').load('/node/' + nid + '/moderation/block/ajax', function() {
            // Fix for improper action being set in form
            $('#workbench-moderation-moderate-form').attr('action', window.location.pathname);
        });
    }

})(jQuery);
