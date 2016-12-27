/**
 * @file core_personalization.tests.js
 */

var $ = Drupal.jQuery;

QUnit.module("Acquia Lift Cookie Queue", {
  setup: function() {
    initializeLiftSettings();
  }
});

QUnit.test("QueueItem unit tests", function(assert) {
  expect(10);

  var itemData = {
    'testid': 'abc',
    'testdata': 'foo'
  };
  var item = new Drupal.acquiaLiftUtility.QueueItem(itemData);
  assert.ok(item instanceof Drupal.acquiaLiftUtility.QueueItem, 'Queue item identifies itself as the correct type.');
  assert.equal(item.getId().indexOf('acquia-lift-ts-'), 0, 'Queue item has auto-generated id.');
  assert.equal(item.isProcessing(), false, 'Queue item set initially to not processing.');
  assert.deepEqual(item.getData(), itemData, 'Queue item data is set properly.');
  var queueObj = {
    'id': item.getId(),
    'data': itemData,
    'pflag': false,
    'numberTried': 0
  };
  assert.deepEqual(item.toObject(), queueObj, 'Queue item can be turned into an object.');
  queueObj.data = 'testme';
  var item2 = new Drupal.acquiaLiftUtility.QueueItem(queueObj);
  assert.ok(item.equals(item2), 'Queue item equality check passes based on id only.');
  queueObj.data = itemData;
  queueObj.id = 'newid';
  var item3 = new Drupal.acquiaLiftUtility.QueueItem(queueObj);
  assert.ok(!item.equals(item3), 'Queue item equality check passes based on id only.');
  assert.ok(!item.equals(queueObj), 'Queue item can equality check can handle invalid data.');
  item.setProcessing(true);
  assert.equal(item.isProcessing(), true, 'Queue item has processing value changed.');
  item.reset();
  assert.equal(item.isProcessing(), false, 'Queue item processing can be reset.');
});

QUnit.test("Queue unit tests", function(assert) {
  var testData1 = {'testdata': 1},
    testData2 = {'testdata': 2};

  expect(20);

  // Qunit/sinon resets all dates which affects our automatic ids.
  if (this.clock) {
    this.clock.restore();
  }

  // Start by clearing the queue so we can test.
  Drupal.acquiaLiftUtility.Queue.empty();
  assert.deepEqual(readCookieQueue(), [], 'Cookie queue is empty.');

  // Now add an item to the queue.
  Drupal.acquiaLiftUtility.Queue.add(testData1);
  var queue = readCookieQueue();
  assert.ok(queue instanceof Array, 'Cookie contents are an array.');
  assert.equal(queue.length, 1, 'Cookie queue has one item.');
  assert.deepEqual(queue[0].data, testData1, 'Item has the correct data.');
  assert.equal(queue[0].pflag, false, 'Item has been added as not in processing.');

  // Add another item to the queue.
  Drupal.acquiaLiftUtility.Queue.add(testData2);
  var queue = readCookieQueue();
  assert.ok(queue instanceof Array, 'Cookie contents are an array.');
  assert.equal(queue.length, 2, 'Cookie queue has two items.');
  assert.deepEqual(queue[1].data, testData2, 'New item has the correct data.');

  // Get the next item for processing
  var next = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.ok(next instanceof Drupal.acquiaLiftUtility.QueueItem, 'Next item for processing is a QueueItem');
  assert.ok(next.isProcessing(), 'Next item has been marked as processing.');
  assert.deepEqual(next.getData(), testData1, 'Next item is the first added to the queue.');

  // Now add it back into the queue.
  Drupal.acquiaLiftUtility.Queue.add(next);
  var queue = readCookieQueue();
  assert.equal(queue.length, 2, 'The queue is still at two items.');
  assert.deepEqual(queue[0].data, testData1, 'The re-added item was set back to its original index.');
  assert.equal(queue[0].pflag, false, 'The item has had its processing status correctly reset.');

  // Now get two items for processing.
  var next1 = Drupal.acquiaLiftUtility.Queue.getNext();
  var next2 = Drupal.acquiaLiftUtility.Queue.getNext();
  var next3 = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.deepEqual(next1.getData(), testData1, 'The first item returned was the first added.');
  assert.deepEqual(next2.getData(), testData2, 'The second item returned was the second added.');
  assert.ok(next3 == null, 'There was no third item returned for processing.');

  // Remove an item from the queue.
  Drupal.acquiaLiftUtility.Queue.remove(next2);
  var queue = readCookieQueue();
  assert.equal(queue.length, 1, 'The queue now has one item for processing.');
  assert.deepEqual(queue[0].data, testData1, 'The correct item remained in the queue.');

  // Reset the queue.
  Drupal.acquiaLiftUtility.Queue.reset();
  var queue = readCookieQueue();
  assert.equal(queue[0].pflag, false, 'The remaining item has been reset.');
});

QUnit.test("Goals queue", function(assert) {
  // Clear out the queue
  // Qunit/sinon resets all dates which affects our automatic ids.
  if (this.clock) {
    this.clock.restore();
  }

  expect(26);

  // Create a fake request for the goals api call.
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  // Start by clearing the queue so we can test.
  Drupal.acquiaLiftUtility.Queue.empty();
  assert.deepEqual(readCookieQueue(), [], 'Cookie queue is empty.');

  var agentName = 'test-agent';
  var testGoal1 = {
    reward: 1,
    goal: 'goal1'
  };
  var testGoal2 = {
    reward: 2,
    goal: 'goal2'
  };
  var testGoal3 = {
    reward: 0,
    goal: 'goal3'
  };

  // Spy on the queue to see that the correct functions are called.
  sinon.spy(Drupal.acquiaLiftUtility.Queue, 'add');
  sinon.spy(Drupal.acquiaLiftUtility.Queue, 'remove');

  // Add a goal to the goals queue without processing.
  Drupal.acquiaLiftUtility.GoalQueue.addGoal(agentName, testGoal1, false);
  var queueData = {
    'a': agentName,
    'o': testGoal1
  };
  var queueData2 = {
    'a': agentName,
    'o': testGoal2
  };
  var queueData3 = {
    'a': agentName,
    'o': testGoal3
  };
  // Get the queue item for assertions and then clear out the processing status.
  var item = Drupal.acquiaLiftUtility.Queue.getNext();
  Drupal.acquiaLiftUtility.Queue.reset();

  // Verify the add process.
  assert.ok(Drupal.acquiaLiftUtility.Queue.add.calledWith(queueData), 'The queue add method was called with queue data.');

  // Now go ahead and process the queue.
  Drupal.acquiaLiftUtility.GoalQueue.processQueue();

  // For now just check that a request was made to the right path since we are
  // testing the queue process here.  Tests specific to goals processing with
  // handle deeper checkers of parameters, etc.
  assert.equal(sinon.requests.length, 1, 'The api was called once.');
  var parsed = parseUri(sinon.requests[0].url);
  assert.equal(parsed.host, 'api.example.com', 'API host is correct.');
  assert.equal(parsed.path, '/feedback', 'API path is correct.');

  sinon.requests[0].respond(200, { "Content-Type": "application/json" }, '{ "session": "some-session-ID", "feedback_id":"some-string", "submitted":"12345566"}');
  assert.equal(Drupal.acquiaLiftUtility.Queue.remove.callCount, 1, 'The remove call was made once.');
  var removeCall = Drupal.acquiaLiftUtility.Queue.remove.getCall(0);
  assert.ok(item.equals(removeCall.args[0]), 'The remove call was made with the goal item previously added.');

  // Now add a goal that results in an error from the API and verify that it
  // remains in the queue for later processing until the max retries is reached.
  Drupal.acquiaLiftUtility.GoalQueue.addGoal(agentName, testGoal2);
  assert.ok(Drupal.acquiaLiftUtility.Queue.add.calledWith(queueData2), 'The second goal was added to the queue.');
  assert.equal(sinon.requests.length, 2, 'Another api call was made.');
  sinon.requests[1].respond(500, {"Content-Type": "application/json"}, '{"status": "Server error"}');
  assert.equal(Drupal.acquiaLiftUtility.Queue.remove.callCount, 1, 'The remove call was not called again.');
  var nextGoal = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.equal(nextGoal.getNumberTried(), 1, 'The goal has been tried once.');
  assert.deepEqual(nextGoal.getData(), queueData2, 'The second goal is still in the queue.');
  var req;
  // Execute tries 2 through 4 (max retries = 5).
  for (var i = 2; i < 5; i++) {
    Drupal.acquiaLiftUtility.GoalQueue.processQueue(true);
    req = sinon.requests.pop();
    req.respond(500, {"Content-Type": "application/json"}, '{"status": "Server error"}');
    assert.equal(Drupal.acquiaLiftUtility.Queue.remove.callCount, 1, 'The remove call was not called again.');
    nextGoal = Drupal.acquiaLiftUtility.Queue.getNext();
    assert.equal(nextGoal.getNumberTried(), i, 'The goal has been tried ' + i + ' times.');
    assert.deepEqual(nextGoal.getData(), queueData2, 'The second goal is still in the queue.');
  }

  // The fifth failure should result in the item being removed from the queue.
  Drupal.acquiaLiftUtility.GoalQueue.processQueue(true);
  req = sinon.requests.pop();
  req.respond(500, {"Content-Type": "application/json"}, '{"status": "Server error"}');
  assert.equal(Drupal.acquiaLiftUtility.Queue.remove.callCount, 2, 'The remove call was called again.');
  nextGoal = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.ok(nextGoal == null, 'There are no more items in the queue.');

  // Now add a goal that fails and is not retryable.
  Drupal.acquiaLiftUtility.GoalQueue.addGoal(agentName, testGoal3);
  assert.ok(Drupal.acquiaLiftUtility.Queue.add.calledWith(queueData3), 'The third goal was added to the queue.');
  var request = sinon.requests.pop();
  request.respond(202, { "Content-Type": "*/*" }, '{ "error": "The request has been accepted for processing but has not been processed."}');
  // This should return not retryable and be deleted.
  assert.equal(Drupal.acquiaLiftUtility.Queue.remove.callCount, 3, 'The remove call was called for non-retryable goal.');
  nextGoal = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.ok(nextGoal == null, 'There are no more items in the queue.');

  // Clean up after the sinon wrappers.
  xhr.restore();
  Drupal.acquiaLiftUtility.Queue.add.restore();
  Drupal.acquiaLiftUtility.Queue.remove.restore();
});

QUnit.test("Goals queue duplication", function(assert) {
  // Clear out the queue
  // Qunit/sinon resets all dates which affects our automatic ids.
  if (this.clock) {
    this.clock.restore();
  }

  expect(5);

  // Create a fake request for the goals api call.
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  // Start by clearing the queue so we can test.
  Drupal.acquiaLiftUtility.Queue.empty();
  assert.deepEqual(readCookieQueue(), [], 'Cookie queue is empty.');

  var agentName = 'test-agent';
  var testGoal1 = {
    reward: 1,
    goal: 'goal1'
  };

  // Add a goal to the goals queue and start processing.
  Drupal.acquiaLiftUtility.GoalQueue.addGoal(agentName, testGoal1, true);

  // Now go ahead and process the queue again forcing a new process.
  Drupal.acquiaLiftUtility.GoalQueue.processQueue(true);

  // Go ahead and respond with a success.
  sinon.requests[0].respond(200, { "Content-Type": "application/json" }, '{ "session": "some-session-ID", "feedback_id":"some-string", "submitted":"12345566"}');

  // click forward
  this.clock.tick(5000);

  // Verify that the queue is empty and that only one API call was made.
  nextGoal = Drupal.acquiaLiftUtility.Queue.getNext();
  assert.ok(nextGoal == null, 'There are no more items in the queue.');

  // Check that a single request was made to the right place..
  assert.equal(sinon.requests.length, 1, 'The api was called once.');
  var parsed = parseUri(sinon.requests[0].url);
  assert.equal(parsed.host, 'api.example.com', 'API host is correct.');
  assert.equal(parsed.path, '/feedback', 'API path is correct.');

  // Clean up after the sinon wrappers.
  xhr.restore();
});

QUnit.module("Acquia Lift service calls", {
  'setup': function() {
    initializeLiftSettings();
  },
  'teardown': function() {
    sinon.restore();
  }
});

QUnit.test('Make decision', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  var callback = sinon.spy();
  Drupal.acquiaLiftLearn.getDecision('my-agent', {'first-decision': ['option-1', 'option-2']}, 'my-decision-point', {'first-decision': 0}, callback);

  equal(sinon.requests.length, 1);
  var parsed = parseUri(sinon.requests[0].url);
  equal(parsed.host, 'api.example.com');
  equal(parsed.path, "/play");
  equal(parsed.queryKey.client_id, "ohai");
  equal(parsed.queryKey.user_hash, "some-session-ID");
  equal(parsed.queryKey.campaign_id, "my-agent");
  equal(parsed.queryKey.application_hash, "drupal");

  requests[0].respond(200, { "Content-Type": "application/json" }, '{"outcome": [{"decision_set_id": "first-decision", "external_id":"option-2"}], "session": "some-session-ID"}');
  ok(callback.called);
  assert.deepEqual(callback.args[0][0], {"first-decision": "option-2"});

  xhr.restore();
});

QUnit.test('Make decision with site prefix', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  var callback = sinon.spy();
  Drupal.acquiaLiftLearn.getDecision('my-prefixed-agent', {'first-decision': ['option-1', 'option-2']}, 'my-decision-point', {'first-decision': 0}, callback);

  equal(sinon.requests.length, 1);
  var parsed = parseUri(sinon.requests[0].url);
  equal(parsed.host, 'api.example.com');
  equal(parsed.path, "/play");
  equal(parsed.queryKey.client_id, "ohai");
  equal(parsed.queryKey.user_hash, "some-session-ID");
  equal(parsed.queryKey.campaign_id, "my-prefixed-agent");
  equal(parsed.queryKey.application_hash, "drupal");

  // Respond with a prefix on the decision set name so we can check that it resolves to the un-prefixed name.
  requests[0].respond(200, { "Content-Type": "application/json" }, '{"outcome": [{"decision_set_id": "some-prefix-first-decision", "external_id":"option-2"}], "session": "some-session-ID"}');
  ok(callback.called);
  assert.deepEqual(callback.args[0][0], {"first-decision": "option-2"});

  xhr.restore();
});

QUnit.test('Multiple decisions', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  var callback = sinon.spy();
  Drupal.acquiaLiftLearn.getDecision('my-agent', {'first-decision': ['option-1', 'option-2']}, 'my-decision-point', {'first-decision': 0}, callback);
  requests[0].respond(200, { "Content-Type": "application/json" }, '{"outcome": [{"decision_set_id": "first-decision", "external_id":"option-2"}], "session": "some-session-ID"}');

  Drupal.acquiaLiftLearn.getDecision('my-agent', {'second-decision': ['option-1', 'option-2']}, 'other-decision-point', {'second-decision': 0}, callback);
  requests[1].respond(200, { "Content-Type": "application/json" }, '{"outcome": [{"decision_set_id": "second-decision", "external_id":"option-1}], "session": "some-session-ID"}');

  equal(sinon.requests.length, 2);

  var parsedUri1 = parseUri(sinon.requests[0].url);
  equal(parsedUri1.host, 'api.example.com');
  equal(parsedUri1.path, "/play");
  equal(parsedUri1.queryKey.client_id, "ohai");
  equal(parsedUri1.queryKey.user_hash, "some-session-ID");
  equal(parsedUri1.queryKey.campaign_id, "my-agent");
  equal(parsedUri1.queryKey.application_hash, "drupal");

  var parsedUri2 = parseUri(sinon.requests[1].url);
  equal(parsedUri2.host, 'api.example.com');
  equal(parsedUri2.path, "/play");
  equal(parsedUri2.queryKey.client_id, "ohai");
  equal(parsedUri2.queryKey.user_hash, "some-session-ID");
  equal(parsedUri2.queryKey.campaign_id, "my-agent");
  equal(parsedUri2.queryKey.application_hash, "drupal");

  ok(callback.callCount, 2);
  assert.deepEqual(callback.args[0][0], {"first-decision": "option-2"});
  assert.deepEqual(callback.args[1][0], {"second-decision": "option-1"});

  xhr.restore();
});

QUnit.test('Send goal', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  Drupal.acquiaLiftLearn.sendGoal('my-agent', 'some-goal', 2);

  assert.equal(sinon.requests.length, 1);
  var parsedUrl = parseUri(sinon.requests[0].url);
  var parsedBody = JSON.parse(sinon.requests[0].requestBody);
  assert.equal(parsedUrl.host, 'api.example.com');
  assert.equal(parsedUrl.path, "/feedback");
  assert.equal(parsedUrl.queryKey.client_id, "ohai");
  assert.equal(parsedBody.user_hash, "some-session-ID");
  assert.equal(parsedBody.application_hash, "drupal");
  assert.equal(parsedBody.campaign_id, "my-agent");
  assert.equal(parsedBody.goal_id, "some-goal");
  assert.equal(parsedBody.score, 2);

  requests[0].respond(200, { "Content-Type": "application/json" }, '{"session": "some-session-ID", "feedback_id": "some-string", "submitted": "12345678"}');

  xhr.restore();
});

QUnit.test('Send goal with site name prefix', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];
  xhr.onCreate = function (request) {
    requests.push(request);
  };

  Drupal.acquiaLiftLearn.sendGoal('my-prefixed-agent', 'some-goal', 2);

  assert.equal(sinon.requests.length, 1);
  console.log(sinon.requests[0]);
  var parsedUrl = parseUri(sinon.requests[0].url);
  var parsedBody = JSON.parse(sinon.requests[0].requestBody);
  assert.equal(parsedUrl.host, 'api.example.com');
  assert.equal(parsedUrl.path, "/feedback");
  assert.equal(parsedUrl.queryKey.client_id, "ohai");
  assert.equal(parsedBody.user_hash, "some-session-ID");
  assert.equal(parsedBody.application_hash, "drupal");
  assert.equal(parsedBody.campaign_id, "my-prefixed-agent");
  assert.equal(parsedBody.goal_id, "some-prefix-some-goal");
  assert.equal(parsedBody.score, 2);

  requests[0].respond(200, { "Content-Type": "application/json" }, '{"session": "some-session-ID", "feedback_id": "some-string", "submitted": "12345678"}');

  xhr.restore();
});

QUnit.test('Page load goals queue processing', function(assert) {
  var xhr = sinon.useFakeXMLHttpRequest();
  var requests = sinon.requests = [];

  xhr.onCreate = function (request) {
    requests.push(request);
  };

  // Add a goal to the queue without processing it.
  // Start by clearing the queue so we can test.
  Drupal.acquiaLiftUtility.Queue.empty();
  assert.deepEqual(readCookieQueue(), [], 'Cookie queue is empty.');

  var agentName = 'test-agent';
  var testGoal = {
    reward: 1,
    goal: 'goal1'
  };

  sinon.spy(Drupal.acquiaLiftUtility.GoalQueue, 'processQueue');

  // Add a goal to the goals queue without processing.
  Drupal.acquiaLiftUtility.GoalQueue.addGoal(agentName, testGoal, false);

  var queue = readCookieQueue();
  assert.equal(queue.length, 1, 'Goals queue has one item.');

  // Call the queue page processing.
  Drupal.behaviors.acquia_lift_goal_queue.attach($(document), Drupal.settings);

  // Make sure the correct URL was called.
  assert.equal(sinon.requests.length, 1);
  var parsedUrl = parseUri(sinon.requests[0].url);
  assert.equal(parsedUrl.host, 'api.example.com');
  assert.equal(parsedUrl.path, "/feedback");
  assert.equal(parsedUrl.queryKey.client_id, "ohai");
  var parsedBody = JSON.parse(sinon.requests[0].requestBody);
  assert.equal(parsedBody.user_hash, "some-session-ID");
  assert.equal(parsedBody.application_hash, "drupal");
  assert.equal(parsedBody.campaign_id, "test-agent");
  assert.equal(parsedBody.goal_id, "goal1");
  assert.equal(parsedBody.score, 1);

  requests[0].respond(200, { "Content-Type": "application/json" }, '{ "session": "some-session-ID", "feedback_id": "some-string", "submitted": "12345678"}');

  // Make sure the cookie queue was emptied.
  assert.ok(Drupal.acquiaLiftUtility.GoalQueue.processQueue.called, 'Process queue was called');
  assert.equal(Drupal.acquiaLiftUtility.GoalQueue.processQueue.callCount, 1, 'Process queue was called only once.');

  queue = readCookieQueue();
  assert.equal(queue.length, 0, 'Goals queue is empty.');

  xhr.restore();
  Drupal.acquiaLiftUtility.GoalQueue.processQueue.restore();
});

QUnit.module("Acquia Lift Targeting", {
  setup: function() {
    initializeLiftSettings();

    // Mock the acquia_lift testing agent to just make it return the first option.
    Drupal.personalize.agents.acquia_lift_learn.getDecisionsForPoint = function(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, callback) {
      var selection = {};
      selection[decisionName] = choices[decisionName][0];
      callback(selection);
    };
  },
  teardown: function() {
    Drupal.settings.personalize.agent_map = {};
    Drupal.settings.personalize.option_sets = {};
    Drupal.settings.acquia_lift_target.agent_map = {};
    Drupal.settings.acquia_lift_target.option_sets = {};
    Drupal.settings.acquia_lift_target.nested_tests = {};
    Drupal.personalize.agents.acquia_lift_learn.sendGoalToAgent = function(agent_name, goal_name, value) {
    };
    Drupal.acquia_lift_target.reset();
  }
});

QUnit.test("test explicit targeting logic", function( assert ) {
  expect(6);
  // Add settings for a targeting agent with some fixed targeting rules on its single
  // option set.
  var agentName = 'my-test-agent',
      decisionName = 'my-decision',
      enabledContexts = {
        'some_plugin': {
          'some-context': 'some-context',
          'other-context': 'other-context'
        }
      },
      options = [
        {
          'option_id': 'first-option',
          'option_label': 'First Option'
        },
        {
          'option_id': 'second-option',
          'option_label': 'Second Option'
        },
        {
          'option_id': 'third-option',
          'option_label': 'Third Option'
        }
      ],
      targeting = [
        {
          'name': 'second-audience',
          'option_id': 'second-option',
          // Add fixed targeting rules such that this option should be shown if two
          // feature strings are present.
          'targeting_features': [
            "some-context::some-value",
            "other-context::ss-other"
          ],
          'targeting_strategy': 'AND'
        },
        {
          'name': 'third-audience',
          'option_id': 'third-option',
          // Add fixed targeting rules such that this option should be shown if one of
          // two feature strings is present.
          'targeting_features': [
            "some-context::some-value",
            "other-context::ss-ohai"
          ],
          'targeting_strategy': 'OR'
        }
      ];
  addLiftTargetToDrupalSettings(agentName, enabledContexts, decisionName, 'osid-1', options, targeting);

  // Now request decisions from that agent to test its behavior with different contexts.
  var evaluatedVisitorContexts = {},
      choices = {},
      fallbacks = {};
  choices[decisionName] = ['first-option', 'second-option', 'third-option'];
  fallbacks[decisionName] = 0;
  // Try first with no visitor contexts present, we should get the first (fallback) option.
  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'first-option');
  });

  // Now try with contexts that should satisfy the rules for the second option.
  evaluatedVisitorContexts = {
    'some-context': [
      'some-value',
      'sc-some'
    ],
    'other-context': [
      'other-value',
      'ss-other'
    ]
  };

  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'second-option');
  });

  // Now try with contexts that only partially satisfy the rules for the second option, but
  // fully satisfy the rules for the third option.
  evaluatedVisitorContexts = {
    'some-context': [
      'some-value',
      'sc-some'
    ],
    'other-context': [
      'my-other-value'
    ]
  };

  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'third-option');
  });
});

QUnit.test("test audience names", function( assert ) {
  expect(4);
  // Add settings for a targeting agent with some fixed targeting rules on its single
  // option set and use a number as one of the audience names
  var agentName = 'my-test-agent',
      decisionName = 'my-decision',
      enabledContexts = {
        'some_plugin': {
          'some-context': 'some-context'
        }
      },
      options = [
        {
          'option_id': 'first-option',
          'option_label': 'First Option'
        },
        {
          'option_id': 'second-option',
          'option_label': 'Second Option'
        }
      ],
      targeting = [
        {
          'name': 1,
          'option_id': 'second-option',
          // Add fixed targeting rules such that this option should be shown if two
          // feature strings are present.
          'targeting_features': [
            "some-context::some-value"
          ],
          'targeting_strategy': 'AND'
        }
      ];
  addLiftTargetToDrupalSettings(agentName, enabledContexts, decisionName, 'osid-1', options, targeting);

  // Now test that the audience works as expected.
  var evaluatedVisitorContexts = {},
      choices = {},
      fallbacks = {};
  choices[decisionName] = ['first-option', 'second-option'];
  fallbacks[decisionName] = 0;
  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'first-option');
  });

  evaluatedVisitorContexts = {
    'some-context': [
      'some-value',
      'sc-some'
    ]
  };
  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'second-option');
  });

});


QUnit.test("test nesting logic - goals", function( assert ) {
  expect(5);
  // Add settings for a targeting agent with a test nested in it..
  var agentName = 'my-parent-agent';
  var sub_agent_name = 'my-nested-agent';
  Drupal.settings.acquia_lift_target.nested_tests[agentName] = {};
  Drupal.settings.acquia_lift_target.nested_tests[agentName][sub_agent_name] = sub_agent_name;
  Drupal.settings.personalize.agent_map = Drupal.settings.personalize.agent_map || {};
  Drupal.settings.personalize.agent_map[agentName] = {
    'active': 1,
    'cache_decisions': false,
    'enabled_contexts': {},
    'type': 'acquia_lift_target'
  };

  // First send a decision, otherwise the goal will be ignored.
  var decisionName = 'some-decision', choices = {};
  choices[decisionName] = ['first-option', 'second-option', 'third-option'];
  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, {}, choices, decisionName, {}, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'first-option');
  });

  // Fire a goal and confirm the acquia_lift_learn agent gets it. We do this by mocking
  // the acquia_lift_learn agent's sendGoalToAgent function and confirming it gets called
  // with the correct arguments.
  Drupal.personalize.agents.acquia_lift_learn.sendGoalToAgent = function(agent_name, goal_name, value) {
    assert.equal(agent_name, sub_agent_name);
    assert.equal(goal_name, 'some-goal');
    assert.equal(value, 2);
  };
  Drupal.personalize.agents.acquia_lift_target.sendGoalToAgent(agentName, 'some-goal', 2);
});

QUnit.test("test nesting logic - decisions", function( assert ) {
  expect(7);
  // Add settings for a targeting agent with a test nested in it..
  var agentName = 'my-parent-agent',
      decisionName = 'my-decision',
      enabledContexts = {
        'some_plugin': {
          'some-context': 'some-context',
          'other-context': 'other-context'
        }
      },
      options = [
        {
          'option_id': 'first-option',
          'option_label': 'First Option'
        },
        {
          'option_id': 'second-option',
          'option_label': 'Second Option'
        },
        {
          'option_id': 'third-option',
          'option_label': 'Third Option'
        }
      ],
      subOS = '123',
      targeting = [
        {
          // If this rule matches then a nested option set decides between the
          // first and second options.
          'name': 'my-audience',
          'osid': subOS,
          'targeting_features': [
            "some-context::some-value",
            "other-context::ss-other"
          ],
          'targeting_strategy': 'AND'
        },
        {
          // If this rule matches then the third option is shown.
          'name': 'third-audience',
          'option_id': 'third-option',
          'targeting_features': [
            "some-context::some-value",
            "other-context::ss-ohai"
          ],
          'targeting_strategy': 'OR'
        }
      ];
  addLiftTargetToDrupalSettings(agentName, enabledContexts, decisionName, 'osid-1', options, targeting);
  // Now add the acquia_lift_target settings for the nested option set.
  var sub_agent_name = 'my-nested-agent';

  Drupal.settings.acquia_lift_target.agent_map[sub_agent_name] = {
    'type': 'acquia_lift_learn'
  };
  var subOs_str = 'osid-' + subOS;
  Drupal.settings.acquia_lift_target.option_sets = Drupal.settings.acquia_lift_target.option_sets || {};
  Drupal.settings.acquia_lift_target.option_sets[subOs_str] = {
    'agent': sub_agent_name,
    'data': [],
    'decision_name': subOs_str,
    'decision_point': subOs_str,
    'executor': 'show',
    'label': 'My Sub OS',
    'mvt': null,
    'option_names': ['first-option', 'second-option'],
    'options': options.slice(0,2),
    'targeting': {},
    'osid': subOs_str,
    'plugin': 'my_os_plugin',
    'selector': '.some-class',
    'stateful': 0,
    'winner': null
  };

  // Mock the acquia_lift testing agent to just make it return the second option.
  Drupal.personalize.agents.acquia_lift_learn.getDecisionsForPoint = function(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, callback) {
    var expected_chocies = {};
    expected_chocies[subOs_str] = ['first-option', 'second-option'];
    assert.deepEqual(choices, expected_chocies);
    var selection = {};
    selection[subOs_str] = 'second-option';
    callback(selection);
  };

  // Now request decisions from the parent agent.
  var evaluatedVisitorContexts = {},
      choices = {},
      fallbacks = {};
  choices[decisionName] = ['first-option', 'second-option', 'third-option'];
  fallbacks[decisionName] = 0;

  // Try first with no visitor contexts present, we should get the first (fallback) option.
  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'first-option');
  });

  // Now try with contexts that should satisfy the rules for the nested option set.
  evaluatedVisitorContexts = {
    'some-context': [
      'some-value',
      'sc-some'
    ],
    'other-context': [
      'other-value',
      'ss-other'
    ]
  };

  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'second-option');
  });

  // Now try with contexts that satisfy the rules for the third option.
  evaluatedVisitorContexts = {
    'some-context': [
      'some-value',
      'sc-some'
    ],
    'other-context': [
      'my-other-value'
    ]
  };

  Drupal.personalize.agents.acquia_lift_target.getDecisionsForPoint(agentName, evaluatedVisitorContexts, choices, decisionName, fallbacks, function(decisions) {
    assert.ok(decisions.hasOwnProperty(decisionName));
    assert.equal(decisions[decisionName], 'third-option');
  });
});


// Helper for parsing the ajax request URI

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
  var	o   = parseUri.options,
    m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
    uri = {},
    i   = 14;

  while (i--) uri[o.key[i]] = m[i] || "";

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });

  return uri;
};
parseUri.options = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
  q:   {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

// Helper function to read the queue cookie contents.
function readCookieQueue() {
  return $.parseJSON($.cookie('acquiaLiftQueue'));
}

// Helper function to initialize the lift API settings.
function initializeLiftSettings() {
  Drupal.settings.personalize = Drupal.settings.personalize || {};
  Drupal.settings.acquia_lift = Drupal.settings.acquia_lift || {};
  Drupal.settings.acquia_lift.api_class = 'acquiaLiftAPI';
  Drupal.settings.acquia_lift_learn = Drupal.settings.acquia_lift_learn || {};
  Drupal.settings.acquia_lift_target = Drupal.settings.acquia_lift_target || {};
  Drupal.settings.acquia_lift_target.agent_map = Drupal.settings.acquia_lift_target.agent_map || {};
  Drupal.settings.acquia_lift_target.agent_map['my-prefixed-agent'] = {'site_name_prefix': 'some-prefix-'};
  Drupal.settings.acquia_lift_learn.baseUrl = 'http://api.example.com';
  Drupal.settings.acquia_lift_learn.clientId = 'ohai';
  Drupal.settings.acquia_lift_learn.applicationHash = 'drupal';

  TC.getSessionID = function() {
    return 'some-session-ID';
  };
  Drupal.personalize.saveSessionID = function(sessionID) {

  };
  Drupal.personalize.initializeSessionID = function() {
    return 'some-session-ID';
  };
}


/**
 * Adds settings for the required targeting agent set-up to Drupal.settings.
 */
function addLiftTargetToDrupalSettings(agent_name, enabled_contexts, decision_name, osid, options_array, targeting) {

  Drupal.settings.personalize.agent_map = Drupal.settings.personalize.agent_map || {};
  Drupal.settings.personalize.agent_map[agent_name] = {
    'active': 1,
    'cache_decisions': false,
    'enabled_contexts': enabled_contexts,
    'type': 'acquia_lift_target'
  };

  var option_names = [];
  for (var i in options_array) {
    if (options_array.hasOwnProperty(i)) {
      option_names.push(options_array[i].option_id);
    }
  }
  Drupal.settings.personalize.option_sets = Drupal.settings.personalize.option_sets || {};
  Drupal.settings.personalize.option_sets[osid] = {
    'agent': agent_name,
    'data': [],
    'decision_name': decision_name,
    'decision_point': decision_name,
    'executor': 'show',
    'label': 'My Lift Target',
    'mvt': null,
    'option_names': option_names,
    'options': options_array,
    'targeting': targeting,
    'osid': osid,
    'plugin': 'my_os_plugin',
    'selector': '.some-class',
    'stateful': 0,
    'winner': null
  };
}
