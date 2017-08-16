'use strict';

var learnjs = {
  poolId: "us-east-1:5de85cd4-ae4c-45cb-9eb2-7fa641579faf",
};

learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }",
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 == 6 * __; }",
  },
];

learnjs.hasNextProblem = function(number) {
  return number < learnjs.problems.length
};

learnjs.getProblemHash = function(number) {
  return "#problem-" + number;
};

learnjs.applyObject = function(obj, elem) {
  for (var key in obj) {
    elem.find("[data-name=" + key + "]").text(obj[key]);
  }
};

learnjs.checkAnswer = function(problem, answer) {
  var test = problem.code.replace("__", answer) + "; problem();";
  try {
    return eval(test);
  }
  catch (e) {
    return false;
  }
};

learnjs.flashElement = function(elem, content) {
  elem.fadeOut("fast", function() {
    elem.html(content);
    elem.fadeIn();
  });
};

learnjs.template = function(name) {
  return $(".templates ." + name).clone();
};

learnjs.triggerEvent = function(name, args) {
  $(".view-container>*").trigger(name, args);
};

learnjs.createCorrectFlash = function(number) {
  var flash = learnjs.template("correct-flash");
  var link = flash.find("a");
  if (learnjs.hasNextProblem(number)) {
    link.attr("href", learnjs.getProblemHash(number + 1));
  } else {
    link.attr("href", "");
    link.text("You're Finished!");
  }
  return flash;
};

learnjs.landingView = function() {
  return learnjs.template("landing-view");
};

learnjs.problemView = function(data) {
  var number = parseInt(data, 10);
  var problem = learnjs.problems[number - 1];

  var view = learnjs.template("problem-view");
  var flash = view.find(".result");

  function checkAnswerClick() {
    var answer = view.find(".answer").val();
    var result = learnjs.checkAnswer(problem, answer);
    var element = result
      ? learnjs.createCorrectFlash(number)
      : "Incorrect!";
    learnjs.flashElement(flash, element);
    return false;
  }

  if (learnjs.hasNextProblem(number)) {
    var skipButton = learnjs.template("skip-btn");
    skipButton.find("a").attr("href", learnjs.getProblemHash(number + 1));
    $(".nav-list").append(skipButton);
    view.bind("removingView", function() {
      skipButton.remove();
    });
  }

  view.find(".check-btn").click(checkAnswerClick);
  view.find(".title").text("Problem #" + number);
  learnjs.applyObject(problem, view);

  return view;
};

learnjs.profileView = function() {
  var view = learnjs.template("profile-view");
  learnjs.identity.done(function(identity) {
    view.find(".email").text(identity.email);
  });
  return view;
};

learnjs.showView = function(hash) {
  var routes = {
    "#problem": learnjs.problemView,
    "#profile": learnjs.profileView,
    "#": learnjs.landingView,
    "": learnjs.landingView,
  };

  var hashParts = hash.split("-");
  var id = hashParts[0];
  var param = hashParts[1];

  var view = routes[id];

  if (view) {
    learnjs.triggerEvent("removingView", []);
    $(".view-container").empty().append(view(param));
  }
};

learnjs.addProfileLink = function(profile) {
  var link = learnjs.template("profile-link");
  link.find("a").text(profile.email);
  $(".signin-bar").prepend(link);
};

learnjs.appOnReady = function() {
  window.onhashchange = function() {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.awsRefresh = function() {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function(err) {
    return err
      ? deferred.reject(err)
      : deferred.resolve(AWS.config.credentials.identityId);
  });
  return deferred.promise();
};

learnjs.identity = new $.Deferred();

function onSignIn(googleUser) {
  /*
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
  */
  var profile = googleUser.getBasicProfile();
  var auth = googleUser.getAuthResponse()

  function refresh() {
    return gapi.auth2.getAuthInstance()
      .signIn({
        prompt: "login",
      })
      .then(function(googleUser) {
        var auth = googleUser.getAuthResponse()
        AWS.config.credentials.param.Logins["accounts.google.com"] = auth.id_token;
        return learnjs.awsRefresh();
      });
  }

  AWS.config.update({
    region: "us-east-1",
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: learnjs.poolId,
        Logins: {
          "accounts.google.com": auth.id_token,
        }
      })
  });

  learnjs.awsRefresh().then(function(id) {
    learnjs.identity.resolve({
      id: id,
      email: profile.getEmail(),
      refresh: refresh,
    });
  });
}
