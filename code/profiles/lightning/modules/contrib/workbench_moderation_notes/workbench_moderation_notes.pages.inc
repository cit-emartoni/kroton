<?php

/**
 * Page callback for workbench moderation view with notes
 */
function workbench_moderation_notes_node_history_view($node) {
  global $user;

  // Page title.
  drupal_set_title(t('History of %title', array('%title' => $node->title)), PASS_THROUGH);

  // Get all of the node revisions, each with its most recent moderation.
  $query = db_select('node', 'n');
  $query->leftJoin('node_revision', 'r', 'n.nid = r.nid');
  $query->leftJoin('users', 'u', 'r.uid = u.uid');
  $query->addField('n', 'vid', 'live_revision');
  $query->condition('n.nid', $node->nid)
    ->orderBy('r.vid', 'DESC')
    ->fields('r', array('nid', 'vid', 'title', 'log', 'uid', 'timestamp'))
    ->fields('u', array('name'));

  $revisions = $query->execute()
    ->fetchAllAssoc('vid');

  // Build the table rows.
  $rows = array();
  foreach ($revisions as $revision) {
    $row = array(
      'data' => array(
        'vid' => '',
        'info' => '',
        'date' => '',
        'revision' => '',
        'moderation' => '',
      ),
      'class' => array('revision'),
    );

    // Add row classes.
    if ($revision->vid == $node->workbench_moderation['current']->vid) {
      $row['class'][] = 'current-revision';
    }
    if (isset($node->workbench_moderation['published']) && $revision->vid == $node->workbench_moderation['published']->vid) {
      $row['class'][] = 'published-revision';
    }
    else {
      $row['class'][] = 'unpublished-revision';
    }

    // Add row data.
    $row['data']['vid'] = $revision->vid;
    $row['data']['info'] .= '<div class="revision-title">' . check_plain($revision->title) . '</div>';
    $row['data']['info'] .= '<div class="revision-log description">' . filter_xss($revision->log) . '</div>';
    $row['data']['info'] .= '<div class="revision-user description">' . t('Revised by !user', array('!user' => theme('username', array('account' => $revision)))) . '</div>';
    $row['data']['date'] = format_date($revision->timestamp, 'short');

    // Revision operations.
    $revision_operations = array();
    if (isset($node->workbench_moderation['published']) && $revision->vid == $node->workbench_moderation['published']->vid) {
      $revision_operations['view'] = workbench_moderation_access_link(t('View'), "node/{$revision->nid}");
    }
    elseif ($revision->vid == $node->workbench_moderation['current']->vid) {
      $revision_operations['view'] = workbench_moderation_access_link(t('View'), "node/{$revision->nid}/current-revision");
    }
    else {
      $revision_operations['view'] = workbench_moderation_access_link(t('View'), "node/{$revision->nid}/revisions/{$revision->vid}/view");
    }

    // Provide a courtesy edit operation if this is the current revision.
    if ($revision->vid == $node->workbench_moderation['current']->vid) {
      // The edit operation's default link title, "Edit draft", matches
      // the logic tree in workbench_moderation_edit_tab_title().
      $edit_operation_title = t('Edit draft');

      // Modify the edit operation's link title to "New draft", matching the
      // logic tree in workbench_moderation_edit_tab_title() when the current
      // revision is the published node.
      if (isset($node->workbench_moderation['published']) && $revision->vid == $node->workbench_moderation['published']->vid) {
        $edit_operation_title = t('New draft');
      }
      $revision_operations['edit'] = l($edit_operation_title, "node/{$revision->nid}/edit", array('query' => array('destination' => "node/{$revision->nid}/moderation")));
    }

    $revision_operations['revert'] = workbench_moderation_access_link(t('Revert'), "node/{$revision->nid}/revisions/{$revision->vid}/revert");
    $revision_operations['delete'] = workbench_moderation_access_link(t('Delete'), "node/{$revision->nid}/revisions/{$revision->vid}/delete");

    $row['data']['revision'] = implode(' | ', array_filter($revision_operations));

    // Get the moderation history of this revision.
    $query = db_select('workbench_moderation_node_history', 'm');
    $query->leftJoin('users', 'u', 'm.uid = u.uid');
    $query->condition('m.vid', $revision->vid)
      ->orderBy('m.stamp', 'DESC')
      ->orderBy('m.hid', 'DESC')
      ->fields('m')
      ->fields('u', array('name'));

    $moderations = $query->execute()
      ->fetchAllAssoc('hid');

    // Make sure it's an array.
    if (empty($moderations)) {
      $moderations = array();
      if ($revision->vid == $node->workbench_moderation['current']->vid) {
        $moderations = array($node->workbench_moderation['current']);
      }
    }

    // If this is the current revision, provide moderation links.
    if (!empty($node->workbench_moderation['published']) && $revision->vid == $node->workbench_moderation['published']->vid) {
      $row['data']['moderation'] = '<div class="moderation-state"><strong>' . t('This is the published revision.') . '</strong></div>';
      // Provide an unpublish link.
      $next_states = workbench_moderation_states_next(workbench_moderation_state_published(), $user, $node);
      if (!empty($next_states)) {
        $row['data']['moderation'] .= '<div class="moderation-actions">' . l(t('Unpublish'), "node/{$revision->nid}/moderation/{$revision->live_revision}/unpublish") . '</div>';
      }
    }
    elseif ($revision->vid == $node->workbench_moderation['current']->vid) {
      $node_current = workbench_moderation_node_current_load($node);
      $row['data']['moderation'] = '<div class="moderation-state"><strong>' . t('This is the current revision. The current state is %state.', array('%state' => workbench_moderation_state_label($node->workbench_moderation['current']->state))) . '</strong></div>';
      $moderate_form = drupal_get_form('workbench_moderation_moderate_form', $node_current);
    }

    // Build a table of the moderation history.
    $items = array();
    foreach ($moderations as $moderation) {
      if ($moderation->from_state) {
        $note = ($moderation->note)
          ?t('<br/><strong>Note:</strong><p>@note</p>', array('@note' => $moderation->note))
          : '';
        $items[] = t('From @from_state --> @to_state on %date by !user !note',
          array(
            '@from_state' => workbench_moderation_state_label($moderation->from_state),
            '@to_state' => workbench_moderation_state_label($moderation->state),
            '%date' => format_date($moderation->stamp, 'short'),
            '!user' => theme('username', array('account' => $moderation)),
            '!note' => $note,
          )
        );
      }
      else {
        $items[] = t('Created as @to_state on %date by !user',
          array(
            '@from_state' => workbench_moderation_state_label($moderation->from_state),
            '@to_state' => workbench_moderation_state_label($moderation->state),
            '%date' => format_date($moderation->stamp, 'short'),
            '!user' => theme('username', array('account' => $moderation)),
          )
        );
      }
    }
    $row['data']['moderation'] .= theme('item_list', array('items' => $items));

    $rows[] = $row;
  }

  // Set the table header.
  $header = array(t('Revision'), t('Title'), t('Date'), t('Revision actions'), t('Moderation actions'));

  // Return properly styled output.
  return array(
    '#attached' => array(
      'css' => array(
        drupal_get_path('module', 'workbench_moderation') . '/css/workbench_moderation.css',
      ),
    ),
    '#prefix' => drupal_render($moderate_form),
    '#theme' => 'table',
    '#header' => $header,
    '#rows' => $rows,
  );
}